const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authController = require('../controllers/authController');
const authorize = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
// The path must match exactly: /api/auth/me
router.get('/me', authorize, async (req, res) => {
  try {
    // req.user.id comes from your auth middleware
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get the latest user profile and balance
router.get('/profile', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
  try {
    // Find the user and send back everything EXCEPT their password
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});
module.exports = router;
