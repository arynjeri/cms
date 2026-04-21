const express = require('express');
const router = express.Router();
const authorize = require('../middleware/auth');
const customerController = require('../controllers/customerController');

// Customer only
router.post('/cart', authorize(['customer']), customerController.addToCart);
router.get('/cart', authorize(['customer']), customerController.getCart);
// CART MANAGEMENT
router.delete('/cart/:productId', authorize(['customer']), customerController.removeFromCart);
router.put('/cart/:productId', authorize(['customer']), customerController.updateCartQuantity);

// ORDER MANAGEMENT
router.delete('/orders/:id', authorize(['customer']), customerController.deleteOrder);
router.post('/orders', authorize(['customer']), customerController.createOrder);
router.post('/payments', authorize(['customer']), customerController.createPayment);
router.post('/payments/confirm', authorize(['customer']), customerController.confirmPayment);
router.get('/orders', authorize(['customer']), customerController.getOrders);
router.delete('/cart', authorize(['customer']), customerController.clearCart);
module.exports = router;