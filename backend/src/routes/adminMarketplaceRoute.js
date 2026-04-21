const express = require('express');
const router = express.Router();
const adminMarketplaceController = require('../controllers/adminMarketplaceController');
const authorize = require('../middleware/auth');
const User = require('../models/User'); // Ensure User model is imported for the inline routes

// --- Standard Management Routes ---
router.get('/orders', authorize(['admin']), adminMarketplaceController.getAllOrders);
router.get('/stats', authorize(['admin']), adminMarketplaceController.getDashboardStats);
router.get('/products', authorize(['admin']), adminMarketplaceController.getAllProducts);
router.put('/products/:productId/status', authorize(['admin']), adminMarketplaceController.updateProductStatus);
router.get('/artisans', authorize(['admin']), adminMarketplaceController.getAllArtisans);
router.post('/orders/:id/payout', authorize(['admin']), adminMarketplaceController.handleReleasePayout);

// --- Artisan Wallet Endpoint ---
router.get('/wallet', authorize(['artisan']), adminMarketplaceController.getArtisanWallet);

// --- Superuser Order Controls ---
router.patch('/orders/:id/status', authorize(['admin']), async (req, res) => {
  // Dispatch to proper handler based on status
  const { status } = req.body;
  if (status === 'paid') {
    return adminMarketplaceController.markOrderAsPaid(req, res);
  } else if (status === 'delivered') {
    return adminMarketplaceController.markOrderAsDelivered(req, res);
  } else {
    // Default: just update status
    try {
      const Order = require('../models/Order');
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      return res.json({ message: `Order status updated to ${status}`, order });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

router.patch('/orders/:id/pay', authorize(['admin']), async (req, res) => {
  try {
    const Order = require('../models/Order');
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paymentMpesaReceipt: 'MANUAL_OVERRIDE_' + req.user.name },
      { new: true }
    ).populate('items.seller', 'name')
     .populate('customer', 'name');

    // Get io instance from global
    const { io } = global;
    
    // Create a map of online users if not available
    const onlineUsers = global.onlineUsers || new Map();
    
    // Emit notification to each seller about their items being paid
    order.items.forEach(item => {
      if (item.seller) {
        // Get seller's socket ID and send targeted notification
        const sellerSocketId = onlineUsers.get(item.seller._id.toString());
        if (sellerSocketId) {
          io.to(sellerSocketId).emit('orderNotification', { 
            orderId: order._id.toString(),
            message: 'Payment received - Order ready to start',
            type: 'paid'
          });
        }
      }
    });

    res.json({ message: "Order manually confirmed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.patch('/orders/:id/deliver', authorize(['admin']), adminMarketplaceController.markOrderAsDelivered);
router.delete('/orders/:id', authorize(['admin']), adminMarketplaceController.deleteOrder);


// Get all artisans with a balance > 0 (Merged Duplicate)
router.get("/payouts", authorize(['admin']), async (req, res) => {
  try {
    const artisans = await User.find({ 
      role: 'artisan', 
      balance: { $gt: 0 } 
    }).select("name phoneNumber balance"); // Selecting specific fields is safer
    
    res.json(artisans);
  } catch (err) {
    res.status(500).json({ message: "Error fetching payouts" });
  }
});

// Clear balance after admin sends M-Pesa manually
router.post("/payouts/:id/clear", authorize(['admin']), async (req, res) => {
  try {
    const artisan = await User.findById(req.params.id);
    if (!artisan) return res.status(404).json({ message: "Artisan not found" });

    artisan.balance = 0;
    await artisan.save();

    res.json({ message: "Artisan balance reset to zero. Payout confirmed." });
  } catch (err) {
    res.status(500).json({ message: "Error clearing balance" });
  }
});
// Add to backend/routes/adminMarketplaceRoute.js
router.post('/maintenance/sync-balances', authorize(['admin']), async (req, res) => {
  try {
    const Order = require('../models/Order');
    const User = require('../models/User');

    // 1. Find all orders that are Paid, Shipped, or Completed
    const orders = await Order.find({ 
      status: { $in: ['paid', 'shipped', 'completed'] },
      escrowStatus: { $ne: 'released' } // Only pick those where funds haven't been released yet
    });

    let recoveredTotal = 0;

    for (const order of orders) {
      const artisanId = order.items[0].seller;
      const payoutAmount = order.totalAmount * 0.90;

      if (artisanId) {
        // Update Artisan Balance
        await User.findByIdAndUpdate(artisanId, { $inc: { balance: payoutAmount } });
        
        // Mark as released so we don't double-pay if we run this again
        order.escrowStatus = 'released';
        await order.save();
        
        recoveredTotal += payoutAmount;
      }
    }

    res.json({ 
      message: "Sync complete", 
      ordersProcessed: orders.length, 
      totalFundsRecovered: recoveredTotal 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;