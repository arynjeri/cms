const Product = require('../models/Product');
const express = require('express');
const upload = require('../middleware/upload');
const Auditlog = require('../models/AuditLog');

// Get all products (Buyer & Artisan view)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
    .populate('artisan', 'name email')
    .sort({ createdAt: -1 }); // Show newest listings first
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new listing (The "Promote from Project" logic)
exports.createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      artisan: req.user.id,
      // req.file comes from Multer middleware in your routes
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "" 
    };
    const savedProduct = await Product.create(productData);
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
// Update an existing product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;

    // Find the product first
    let product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Prepare update data
    const updateData = { name, description, price, category };

    // Handle Image Change
    if (req.file) {
      // Delete old image file if it exists to save space
      if (product.imageUrl) {
        const oldImagePath = path.join(__dirname, "..", product.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // Set new image path
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    // Perform the update
    product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error during update" });
  }
};

// Admin: Update Status (Approve/Reject)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};
// 3. Delete a listing
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Listing removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};