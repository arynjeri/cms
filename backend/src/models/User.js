const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Real unique Gmails
  phoneNumber: { type: String, required: false }, // Real phone numbers
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "artisan", "customer"], required: true },
  profilePic: { type: String, default: "" },
  balance: { type: Number, default: 0 }, 
  mpesaNumber: { type: String },
  totalSales: { type: Number, default: 0 }, 
  salesCount: { type: Number, default: 0 }, 
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 1 }
  }],
  shippingAddress: { street: String, city: String, phoneNumber: String },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  if (!this.passwordHash) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

module.exports = mongoose.model("User", userSchema);