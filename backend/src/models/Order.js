const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // --- NEW FINANCIAL FIELDS ---
  transactionCode: { 
    type: String, 
    unique: true,
    sparse: true  // ✅ Allows multiple null values - only enforces uniqueness for non-null
  },
  adminCommission: { 
    type: Number, 
    default: 0 
  },
  artisanEarnings: { 
    type: Number, 
    default: 0 
  },
  escrowStatus: { 
    type: String, 
    enum: ['held', 'released', 'refunded'], 
    default: 'held' 
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      },
      price: {
        type: Number,
        required: true
      },
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    }
  ],

  totalAmount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["pending","shipped","completed", "paid", "payment_failed", "delivered","disputed"],
    default: "pending"
  },

  paymentMpesaReceipt: {
    type: String,
    default: ""
  },
  paymentErrorMessage: {
    type: String,
    default: ""
  },
  paidAt: {
    type: Date,
    default: null
  },
  checkoutRequestID: {
    type: String,
    default: ""
  },

  deliveryAddress: {
    street: String,
    city: String,
    phoneNumber: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
});

module.exports = mongoose.model("Order", orderSchema);