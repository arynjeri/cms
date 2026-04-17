const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: false },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "artisan", "customer"], required: true },
  profilePic: { type: String, default: "" }, // Path to the image
  // Financial tracking
  balance: { type: Number, default: 0 }, 
  mpesaNumber: { type: String }, 

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 1 }
  }],
  shippingAddress: { street: String, city: String, phoneNumber: String },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre("save", async function () {
  // If the password hasn't been changed, skip hashing
  if (!this.isModified("passwordHash")) return;

  // Safety check: If for some reason the password is empty, don't hash it
  if (!this.passwordHash) return;

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  
});
module.exports = mongoose.model("User", userSchema);