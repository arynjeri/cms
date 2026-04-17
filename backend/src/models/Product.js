const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // NEW FIELDS
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  stock: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
