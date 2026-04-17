const express = require('express');
const router = express.Router();
const authorize = require('../middleware/auth');
const orderController = require('../controllers/customerOrderController');

// Existing customer routes
router.post('/', authorize(), orderController.createOrder);
router.get('/my-orders', authorize(), orderController.getMyOrders);

router.get('/artisan', authorize(['artisan']), orderController.getArtisanOrders);

module.exports = router;