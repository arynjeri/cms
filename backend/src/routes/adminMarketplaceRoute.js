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

// --- Superuser Order Controls ---
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

module.exports = router;