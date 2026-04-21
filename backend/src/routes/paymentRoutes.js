const express = require("express");
const router = express.Router();

const authorize = require("../middleware/auth");
const paymentController = require("../controllers/customerPaymentController"); 

// Customer initiates payment (requires authentication)
router.post(
  "/:id/pay",
  authorize(["customer"]),
  paymentController.initiateSTKPush
);

// M-Pesa callback (NO AUTHORIZATION - M-Pesa servers cannot authenticate)
// This endpoint is called directly by M-Pesa, not by frontend
router.post(
  "/callback",
  paymentController.mpesaCallback
);

module.exports = router;