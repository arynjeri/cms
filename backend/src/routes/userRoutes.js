const express = require('express');
const router = express.Router();
const User = require('../models/User');
const userController = require('../controllers/userController');
const authorize = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const jwt = require('jsonwebtoken');

const Project = require('../models/Project');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/Message')

// Configure Multer storage
const storage = multer.memoryStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Allow up to 10MB
});

router.put('/update', authorize(['admin', 'artisan', 'customer']), upload.single('profilePic'), async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    
    // Start with the text data
    const updateData = { name, phoneNumber };

    // ONLY process the image if the user actually selected one
    if (req.file) {
      const fileName = `profile-${req.user.id}-${Date.now()}.webp`;
      const filePath = path.join('uploads/profiles/', fileName);

      await sharp(req.file.buffer)
        .resize(500, 500, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(__dirname, '../../', filePath));

      updateData.profilePic = `/uploads/profiles/${fileName}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: updateData }, 
      { new: true }
    ).select('-password');

    // Generate new token with updated (or existing) info
    const newToken = jwt.sign(
  { 
    id: updatedUser._id, 
    _id: updatedUser._id,
    name: updatedUser.name, 
    email: updatedUser.email,
    role: updatedUser.role,
    profilePic: updatedUser.profilePic,
    phoneNumber: updatedUser.phoneNumber 
  }, 
  process.env.JWT_SECRET, 
  { expiresIn: '7d' }
);
    res.json({ user: updatedUser, token: newToken });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Failed to update profile details" });
  }
});
router.get('/dashboard-stats', authorize(['admin', 'artisan', 'customer']), async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let stats = {};

    if (role === 'artisan') {
      stats = {
        projects: await Project.countDocuments({ artisanId: userId }),
        messages: await Message.countDocuments({ receiverId: userId }),
        orders: await Order.countDocuments({ "items.seller": userId, status: 'paid' }),
        stash: await Inventory.countDocuments({ userId: userId }),
        published: await Product.countDocuments({ artisan: userId, status: 'approved' })
      };
    } 
    else if (role === 'admin') {
      stats = {
        totalUsers: await User.countDocuments(),
        pendingApprovals: await Product.countDocuments({ status: 'pending' }),
        totalOrders: await Order.countDocuments({ status: 'paid' }),
        // Sum of all paid orders
        totalRevenue: await Order.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then(res => res[0]?.total || 0)
      };
    } 
    else if (role === 'customer') {
      stats = {
        myOrders: await Order.countDocuments({ customer: userId }),
        activeConversations: await Message.distinct("conversationId", { 
          $or: [{ senderId: userId }, { receiverId: userId }] 
        }).then(res => res.length)
      };
    }

    res.json(stats);
  } catch (err) {
    console.error("DASHBOARD STATS ERROR:", err);
    res.status(500).json({ message: "Server error calculating stats" });
  }
});
// Admin only
router.get('/', authorize(['admin']), userController.getAllUsers);

router.post('/create-admin', authorize(['admin']), userController.createAdmin);
router.get('/audit-logs', authorize(['admin']), userController.getAuditLogs);
// Any logged in user
router.get('/:id', authorize(['admin']), userController.getUserById);

router.put('/:id', authorize(['admin']), userController.updateUser);

// Admin only
router.delete('/:id', authorize(['admin']), userController.deleteUser);

module.exports = router;
