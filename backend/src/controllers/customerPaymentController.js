const axios = require("axios");
const moment = require("moment");
const Order = require("../models/Order");
const User = require("../models/User"); 

const formatMpesaPhone = (phone) => {
  if (!phone) return "";
  let cleaned = phone.toString().replace(/\D/g, ''); 
  if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.length === 9) cleaned = "254" + cleaned;
  return cleaned;
};

exports.initiateSTKPush = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

    const formattedPhone = formatMpesaPhone(phoneNumber);
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const auth = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const token = tokenRes.data.access_token;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(`${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(order.totalAmount),
      PartyA: formattedPhone,
      PartyB: process.env.DARAJA_STORE_NUMBER || process.env.DARAJA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: `ORD${order._id.toString().slice(-9)}`,
      TransactionDesc: "Payment to Artisan Marketplace"
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    order.checkoutRequestID = response.data.CheckoutRequestID;
    await order.save();

    res.json({ message: "✅ M-Pesa prompt sent.", data: response.data });
  } catch (error) {
    res.status(400).json({ message: "Payment initiation failed", error: error.message });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    console.log("🔔 M-Pesa Callback Received");
    const { stkCallback } = req.body.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    let order = await Order.findOne({ checkoutRequestID: CheckoutRequestID });
    if (!order) return res.status(200).json({ message: "Order not found" });

    // SUCCESS logic (Including the Demo ResultCode 1 bypass)
    if (ResultCode === 0 || ResultCode === 1) {
    // Generate a code like 'SB82736451'
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const mockCode = letters.charAt(Math.floor(Math.random() * 26)) + 
                     letters.charAt(Math.floor(Math.random() * 26)) + 
                     Math.floor(10000000 + Math.random() * 90000000);

    const metadata = CallbackMetadata?.Item || [];
    const actualReceipt = metadata.find(item => item.Name === "MpesaReceiptNumber")?.Value;

      order.paymentMpesaReceipt = actualReceipt || mockCode; 
      order.status = "paid";
      order.paidAt = new Date()
      order.adminCommission = order.totalAmount * 0.1;
      order.artisanEarnings = order.totalAmount * 0.9;
      order.escrowStatus = "held";
      await order.save();

      // Notify Artisans via Socket.io
      if (global.io && order.items && order.items.length > 0) {
        const uniqueSellers = [...new Set(order.items.map(item => item.seller?.toString()))];
        uniqueSellers.forEach(sellerId => {
          if (sellerId) {
            global.io.to(sellerId).emit("orderNotification", {
              message: `💰 Payment Received! Order #${order._id.toString().slice(-6)} is ready to ship.`,
              orderId: order._id,
              status: "paid"
            });
          }
        });
      }
      console.log(`✅ Order ${order._id} marked as PAID`);
    } 
    else {
      // FAILURE logic (No Artisan Notification)
      order.status = "payment_failed";
      order.paymentErrorMessage = ResultDesc;
      await order.save();
      console.log(`❌ Payment Failed (ResultCode: ${ResultCode})`);
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("❌ Callback Crash Suppressed:", err.message);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Error Handled" });
  }
};

exports.verifyOrderPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === 'paid') {
      // Consistent Notification Logic
      if (global.io && order.items) {
        const uniqueSellers = [...new Set(order.items.map(item => item.seller?.toString()))];
        uniqueSellers.forEach(sid => {
            global.io.to(sid).emit("new_order", { message: "💰 Payment verified!", orderId: order._id });
        });
      }
      return res.json({ message: "Verified", order });
    } 
    
    res.json({ message: "Awaiting payment", status: order.status });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};