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
    // 1. Populate items and customer so we have names for the notification
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name')
      .populate('items.productId')
      .populate('items.seller', 'name balance'); 

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only update if not already paid
    if (order.status !== 'paid') {
      order.status = 'paid';
      order.escrowStatus = 'held'; // Keep funds in escrow until delivery
      await order.save();
    }

    // 🔥 IMMEDIATELY RELEASE FUNDS: 90% to artisans
    const updatePromises = order.items.map(async (item) => {
      if (item.seller) {
        const payoutAmount = (item.price * item.quantity) * 0.9;
        const grossAmount = item.price * item.quantity;
        
        // Get the seller ID (handle both ObjectId and string)
        const sellerId = item.seller._id || item.seller;
        
        try {
          const updated = await User.findByIdAndUpdate(
            sellerId,
            { 
              $inc: { 
                balance: payoutAmount,
                totalSales: grossAmount,
                salesCount: 1
              } 
            },
            { new: true }
          );
          
          const sellerName = item.seller.name || (item.seller._id ? item.seller._id.toString().slice(-6) : 'Unknown');
          if (updated) {
            console.log(`✅ Released ${payoutAmount} to artisan ${sellerName}. New balance: ${updated.balance}`);
            return { artisanId: sellerId, amount: payoutAmount, success: true };
          } else {
            console.error(`❌ User not found for ID: ${sellerId}`);
            return { artisanId: sellerId, amount: payoutAmount, success: false };
          }
        } catch (error) {
          console.error(`❌ Failed to update balance for seller ${sellerId}:`, error.message);
          return { artisanId: sellerId, amount: payoutAmount, success: false };
        }
      }
    });

    const results = await Promise.all(updatePromises);
    const totalReleased = results.reduce((sum, r) => sum + (r.success ? r.amount : 0), 0);

    // 2. Get Socket instances for notifications
    const io = global.io; 
    const onlineUsers = global.onlineUsers;
    
    // 3. Find the Artisan ID (seller) from all items and notify each
    const selledItems = order.items.filter(item => item.seller);
    
    selledItems.forEach(item => {
      if (item.seller && item.seller._id) {
        const sellerId = item.seller._id.toString();
        const sellerSocketId = onlineUsers?.get(sellerId);

        console.log(`Notifying Artisan ${sellerId} for ${item.productId?.name || 'work'}. Socket found: ${!!sellerSocketId}`);

        if (sellerSocketId && io) {
          io.to(sellerSocketId).emit("orderNotification", { 
            orderId: order._id,
            type: "paid",
            message: `Payment received for ${item.productId?.name || 'your work'} from ${order.customer.name}!`,
            timestamp: new Date()
          });
        }
      }
    });

    res.json({ 
      message: "✅ Order paid, funds released to artisans, and notifications sent", 
      order,
      totalReleased,
      artisanPayouts: results
    });
  } catch (err) {
    console.error("❌ Force Pay Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// MARK AS DELIVERED
exports.markOrderAsDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.seller', 'name balance');
    
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === 'delivered') return res.status(400).json({ message: "Already delivered" });

    // 1. Update Order Status
    order.status = 'delivered';
    order.escrowStatus = 'released';
    await order.save();

    // 2. RELEASE FUNDS: Update each seller's balance and sales tracking
    const updatePromises = order.items.map(async (item) => {
      if (item.seller) {
        const payoutAmount = (item.price * item.quantity) * 0.9;
        const grossAmount = item.price * item.quantity;
        
        // Get the seller ID (handle both ObjectId and string)
        const sellerId = item.seller._id || item.seller;
        
        try {
          const updated = await User.findByIdAndUpdate(
            sellerId,
            { 
              $inc: { 
                balance: payoutAmount,
                totalSales: grossAmount,
                salesCount: 1
              } 
            },
            { new: true }
          );
          
          const sellerName = item.seller.name || (item.seller._id ? item.seller._id.toString().slice(-6) : 'Unknown');
          if (updated) {
            console.log(`Released KES ${payoutAmount} to artisan ${sellerName}. New balance: ${updated.balance}`);
            return { artisanId: sellerId, amount: payoutAmount, success: true };
          } else {
            console.error(`User not found for ID: ${sellerId}`);
            return { artisanId: sellerId, amount: payoutAmount, success: false };
          }
        } catch (error) {
          console.error(`Failed to update balance for ${sellerId}:`, error.message);
          return { artisanId: sellerId, amount: payoutAmount, success: false };
        }
      }
    });

    const results = await Promise.all(updatePromises);
    const totalReleased = results.reduce((sum, r) => sum + (r.success ? r.amount : 0), 0);

    res.json({ 
      message: "Funds released to artisan wallets!", 
      order,
      totalReleased,
      artisanPayouts: results
    });
  } catch (err) {
    console.error("Delivery error:", err);
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

exports.handleReleasePayout = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // FIX: Log this to your terminal to see if the ID actually exists
    console.log("Attempting payout for Order items:", order.items);

    // We need to make sure we are getting the ID correctly
    // Some of your code uses 'seller', some uses 'artisan'
    const artisanId = order.items[0].seller || order.items[0].artisan;

    if (!artisanId) {
      return res.status(400).json({ message: "Artisan ID not found in order items" });
    }

    const payoutAmount = order.totalAmount * 0.90;

    const updatedArtisan = await User.findByIdAndUpdate(
      artisanId,
      { 
        $inc: { 
          balance: payoutAmount,
          totalSales: order.totalAmount,
          salesCount: 1
        } 
      },
      { new: true }
    );

    order.status = 'delivered'; 
    order.escrowStatus = 'released';
    await order.save();

    res.json({ 
      message: "Funds released!", 
      newBalance: updatedArtisan.balance,
      newSalesCount: updatedArtisan.salesCount,
      newTotalSales: updatedArtisan.totalSales
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ARTISAN WALLET DATA - Shows sales history and balances
exports.getArtisanWallet = async (req, res) => {
  try {
    const artisanId = req.user._id;
    
    // Get all orders where this artisan is the seller
    const paidOrders = await Order.find({
      'items.seller': artisanId,
      status: { $in: ['paid', 'delivered', 'completed'] }
    })
      .populate('customer', 'name email')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });

    const pendingOrders = await Order.find({
      'items.seller': artisanId,
      status: 'pending'
    })
      .populate('customer', 'name email')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalCommission = totalSales * 0.1;
    const artisanEarnings = totalSales * 0.9;

    // Get user for current balance
    const user = await User.findById(artisanId);

    // Build transactions array
    const transactions = paidOrders.map(order => ({
      _id: order._id,
      orderId: order._id,
      amount: order.totalAmount,
      status: order.status === 'delivered' ? 'cleared' : 'held',
      createdAt: order.createdAt,
      customer: order.customer?.name || 'Unknown'
    }));

    // Calculate pending balance (orders paid but not yet delivered)
    const pendingBalance = pendingOrders.reduce((sum, order) => {
      return sum + (order.totalAmount * 0.9);
    }, 0);

    res.json({
      totalSales,
      totalCommission,
      artisanEarnings,
      availableBalance: user?.balance || 0,
      pendingBalance,
      transactions,
      ordersCount: paidOrders.length
    });
  } catch (error) {
    console.error("Wallet error:", error);
    res.status(500).json({ message: error.message });
  }
};