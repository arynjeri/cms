const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    materialType: {
      type: String,
      enum: ['yarn', 'beads', 'other'],
      default: 'other'
    },
    color: {
      type: String,
      default: ''
    },
    measurementType: {
      type: String,
      enum: ['weight', 'count', 'length'],
      required: true
    },
    packetWeight: {
      type: Number,
      default: 100,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      min: 0
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model('Inventory', inventorySchema);
