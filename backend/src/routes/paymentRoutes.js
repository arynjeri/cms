const express = require("express");
const router = express.Router();

const authorize = require("../middleware/auth");
const paymentController = require("../controllers/customerPaymentController"); 

router.post(
  "/:id/pay",
  authorize(["customer"]),
  paymentController.initiateSTKPush
);
router.post(
  "/callback",
  paymentController.mpesaCallback
);

module.exports = router;