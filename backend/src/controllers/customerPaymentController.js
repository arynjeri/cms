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
    const formattedPhone = formatMpesaPhone(phoneNumber);

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Generate Token
    const auth = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = tokenRes.data.access_token;

    //Prepare Payload
    const timestamp = moment().format("YYYYMMDDHHmmss");
    // Use the Central Admin Shortcode and Passkey
    const password = Buffer.from(`${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: process.env.DARAJA_SHORTCODE, // Central Admin Account
      Password: password,
      Timestamp: timestamp,
      // For Till (Buy Goods), use "CustomerBuyGoodsOnline"
      // For Paybill, use "CustomerPayBillOnline"
      TransactionType: "CustomerPayBillOnline", 
      Amount: Math.floor(order.totalAmount),
      PartyA: formattedPhone,
      PartyB: process.env.DARAJA_STORE_NUMBER || process.env.DARAJA_SHORTCODE, // Till uses Store Number
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

    res.json({ message: "STK Push sent!", data: response.data });
  } catch (error) {
    console.error("MPESA ERROR:", error.response?.data || error.message);
    res.status(400).json({ 
      message: "Payment initiation failed", 
      error: error.response?.data?.errorMessage || error.message 
    });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode } = stkCallback;

    const order = await Order.findOne({ checkoutRequestID: CheckoutRequestID }).populate("items.productId");
    if (!order) return res.status(404).send("Order not found");

    if (ResultCode === 0) {
      order.status = "paid";
      
      // Virtual Distribution of Funds
      for (const item of order.items) {
        // Checking both 'seller' and 'artisan' fields to be safe
        const artisanId = item.productId?.seller || item.productId?.artisan;
        
        if (artisanId) {
          const earnings = item.price * item.quantity;
          
          // Increment the artisan's virtual balance for the admin to pay out later
          await User.findByIdAndUpdate(artisanId, {
            $inc: { balance: earnings }
          });
          
          console.log(`Earned: KSH ${earnings} for Artisan ID: ${artisanId}`);
        }
      }
    } else {
      order.status = "failed";
    }

    await order.save();
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    res.status(500).send("Callback error");
  }
};
exports.verifyOrderPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Update order status
    const order = await Order.findByIdAndUpdate(
      orderId, 
      { status: 'paid', paidAt: Date.now() }, 
      { new: true }
    );

    // Trigger Socket.io notification to the Artisan (Seller)
    req.io.to(order.sellerId).emit("new_order", {
      message: `New paid order from ${order.customerName}!`,
      orderId: order._id
    });

    res.json({ message: "Payment verified. Artisan has been notified.", order });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};