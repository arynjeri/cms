const express = require("express");
const router = express.Router();
const authorize = require("../middleware/auth");
const orderController = require("../controllers/customerOrderController");
const Order = require("../models/Order");

// Get customer order count
router.get("/count/my-orders", authorize(["customer"]), async (req, res) => {
  try {
    const count = await Order.countDocuments({ customer: req.user._id });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get seller order count
router.get("/count/seller-orders", authorize(["artisan"]), async (req, res) => {
  try {
    const orders = await Order.find().populate("items.productId");
    const myOrders = orders.filter(order => 
      order.items.some(item => 
        item.productId && (item.productId.seller?.toString() === req.user._id.toString())
      )
    );
    res.json({ count: myOrders.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authorize(["customer"]), orderController.createOrder);
router.get("/", authorize(["customer"]), orderController.getMyOrders);
router.get("/:id", authorize(["customer"]), orderController.getOrderById);
router.delete("/:id", authorize(["customer"]), orderController.deleteOrder);

module.exports = router;