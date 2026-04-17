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
    enum: ["pending","pending_admin_verification","shipped","completed", "paid", "failed", "delivered"],
    default: "pending"
  },

  paymentMpesaReceipt: {
    type: String,
    default: ""
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
  }
});

module.exports = mongoose.model("Order", orderSchema);