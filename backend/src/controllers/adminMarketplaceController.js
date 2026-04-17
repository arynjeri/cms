const Product = require('../models/Product');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Order = require('../models/Order');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('artisan', 'name email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.body;

    const product = await Product.findById(productId).populate('artisan', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.status = status;
    await product.save();

    await AuditLog.create({
      action: `PRODUCT_${status.toUpperCase()}`,
      performedBy: req.user._id,
      targetName: product.name,
      targetEmail: product.artisan.email,
      details: `Product ${product.name} by ${product.artisan.name} was ${status}`
    });

    res.json({ message: `Product ${status} successfully`, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllArtisans = async (req, res) => {
  try {
    const artisans = await User.find({ role: 'artisan' }).select('-passwordHash');
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL ORDERS FOR ADMIN
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET DASHBOARD STATS
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.find({ status: 'paid' });
    const totalRevenue = paidOrders.reduce((acc, order) => acc + order.totalAmount, 0);
    const pendingProducts = await Product.countDocuments({ status: 'pending' });

    res.json({
      totalOrders,
      totalRevenue,
      pendingProducts,
      totalArtisans: await User.countDocuments({ role: 'artisan' })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// FORCE MARK AS PAID (Manual Override)
exports.markOrderAsPaid = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: 'paid', paymentMpesaReceipt: 'MANUAL_OVERRIDE_' + req.user.name },
      { new: true }
    );
    res.json({ message: "Order manually confirmed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// MARK AS DELIVERED
exports.markOrderAsDelivered = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: 'delivered' }, 
      { new: true }
    );
    res.json({ message: "Order marked as delivered", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ANY ORDER
exports.deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    
    // FIND PAID ORDERS
    const paidOrders = await Order.find({ status: 'paid' });
    
    // SUM REVENUE (Ensure field name is totalAmount)
    const totalRevenue = paidOrders.reduce((acc, order) => {
      return acc + (Number(order.totalAmount) || 0);
    }, 0);

    const pendingProducts = await Product.countDocuments({ status: 'pending' });
    const approvedProducts = await Product.countDocuments({ status: 'approved' });

    res.json({
      totalOrders,
      totalRevenue,
      pendingProducts,
      approvedProducts, // Add this for the dashboard
      totalArtisans: await User.countDocuments({ role: 'artisan' })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Get all artisans who have a balance
exports.getPayouts = async (req, res) => {
  try {
    const artisans = await User.find({ role: 'artisan', balance: { $gt: 0 } })
      .select("name phoneNumber balance");
    res.json(artisans);
  } catch (err) {
    res.status(500).json({ message: "Error fetching payouts" });
  }
};

//  Clear balance after manual payout
exports.clearBalance = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { balance: 0 });
    res.json({ message: "Balance cleared successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error clearing balance" });
  }
};