const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

exports.getArtisanOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.productId")
      .populate("customer", "name email phoneNumber")
      .sort("-createdAt");

    // Filter orders to only show those containing this artisan's products
    const myOrders = orders.filter(order => 
      order.items.some(item => 
        item.productId && (item.productId.seller?.toString() === req.user._id.toString())
      )
    );

    res.json(myOrders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    // We take the data from the body but force the customer ID from the token
    const orderData = {
      ...req.body,
      customer: req.user.id // This ensures the logged-in user is the owner
    };

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("ORDER SAVE ERROR:", err.message);
    res.status(500).json({ message: "Database rejected order", error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id
    })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user._id
    }).populate("items.productId");

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(order);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Only pending orders can be deleted"
      });
    }

    await order.deleteOne();

    res.json({
      message: "Order deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};