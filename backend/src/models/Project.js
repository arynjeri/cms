const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  artisan: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Updated to match the frontend options
  status: { 
    type: String, 
    enum: ["ongoing", "completed", "on-hold"], 
    default: "ongoing" 
  },
  craftType: {
    type: String,
    default: "Knitting"
  },
  materials: [{
    inventoryItem: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Inventory",
      required: true
    },
    name: String, // Cached name for easy display in the UI
    quantityUsed: { 
      type: Number, 
      default: 1 
    }
  }],
  linkedProduct: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);