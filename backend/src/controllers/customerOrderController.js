const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const generateTxCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BTQ-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

exports.createOrder = async (req, res) => {
  try {
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }
    for (let item of req.body.items) {
      if (!item.productId || !item.quantity || Number(item.quantity) < 1 || !item.price || Number(item.price) <= 0) {
        return res.status(400).json({ message: "Invalid item data" });
      }
    }
    let totalAmount = Number(req.body.totalAmount);
    if (!totalAmount || totalAmount === 0) {
      totalAmount = req.body.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    }
    const adminComm = totalAmount * 0.10;
    const artisanEarn = totalAmount * 0.90;
    let items = req.body.items || [];
    if (items.length > 0) {
      items = await Promise.all(items.map(async (item) => {
        if (!item.seller && item.productId) {
          const product = await Product.findById(item.productId);
          if (!product || !product.artisan) throw new Error(`Product/Artisan not found: ${item.productId}`);
          item.seller = product.artisan;
        }
        return item;
      }));
    }
    const orderData = {
      ...req.body,
      items,
      totalAmount,
      customer: req.user.id || req.user._id,
      transactionCode: generateTxCode(),
      adminCommission: adminComm,
      artisanEarnings: artisanEarn,
      status: 'pending',
      escrowStatus: 'held'
    };
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: "Order creation failed", error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).populate("items.productId").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id }).populate("items.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending") return res.status(400).json({ message: "Cannot delete" });
    await order.deleteOne();
    res.json({ message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status = status;
    await order.save();
    res.json({ message: `Order updated to ${status}`, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // 🚩 THE FIX: Ensure the item is actually shipped before allowing completion
    if (order.status !== 'shipped') {
      return res.status(400).json({ 
        message: "This order has not been marked as SHIPPED by the artisan yet." 
      });
    }

    order.feedback = {
      rating: Number(rating),
      comment,
      createdAt: new Date()
    };

    if (Number(rating) >= 3) {
      await Promise.all(
        order.items.map(async (item) => {
          const artisanId = item.seller;
          const payout = Math.round((Number(item.price) * Number(item.quantity)) * 0.9);
          await User.findByIdAndUpdate(artisanId, {
            $inc: { balance: payout, totalSales: (Number(item.price) * Number(item.quantity)), salesCount: 1 }
          });
        })
      );

      order.escrowStatus = "released";
      order.status = "completed";
    } else {
      order.status = "disputed";
      order.escrowStatus = "held";
    }

    await order.save();
    res.json({ message: "✅ Success", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getArtisanOrders = async (req, res) => {
  try {
    const artisanId = req.user._id || req.user.id;
    const orders = await Order.find({ "items.seller": artisanId }).populate("customer", "name email phoneNumber").populate("items.productId", "name price imageUrl").sort("-createdAt");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching artisan orders", error: err.message });
  }
};