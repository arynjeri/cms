const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const User = require('../models/User');

// ---  CART ACTIONS ) ---

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const itemIndex = user.cart.findIndex(item => item.product?.toString() === productId);

    if (itemIndex > -1) {
      // Use UpdateOne to change ONLY the quantity (Safe from hashing hook)
      await User.updateOne(
        { _id: userId, "cart.product": productId },
        { $inc: { "cart.$.quantity": (Number(quantity) || 1) } }
      );
    } else {
      // Use $push to add new item (Safe from hashing hook)
      await User.findByIdAndUpdate(userId, {
        $push: { cart: { product: productId, quantity: Number(quantity) || 1 } }
      });
    }

    const updatedUser = await User.findById(userId).populate('cart.product');
    res.status(200).json(updatedUser.cart);
  } catch (err) {
    res.status(500).json({ message: "Cart save failed" });
  }
};

exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    res.json(user.cart || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.removeFromCart = async (req, res) => {
  try {
    // Using $pull removes the item without calling .save()
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { cart: { product: req.params.productId } } },
      { new: true }
    ).populate('cart.product');
    
    res.json({ message: "Item removed", cart: updatedUser.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    await User.updateOne(
      { _id: req.user._id, "cart.product": req.params.productId },
      { $set: { "cart.$.quantity": quantity } }
    );
    res.json({ message: "Quantity updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- ORDER ACTIONS ---

exports.createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });

    let calculatedTotal = 0;
    const orderItems = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      calculatedTotal += product.price * item.quantity;
      return { productId: product._id, quantity: item.quantity, price: product.price };
    }));

    const newOrder = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount: calculatedTotal,
      deliveryAddress
    });

    await User.findByIdAndUpdate(req.user._id, { cart: [] });
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending") return res.status(400).json({ message: "Only pending orders can be cancelled." });

    await order.deleteOne();
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PAYMENT ACTIONS (MOCK/PLACEHOLDERS) ---

exports.createPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ paymentUrl: `https://raja-pay.com/pay?orderId=${order._id}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { orderId, transactionId, status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = status === 'success' ? 'paid' : 'pending';
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};