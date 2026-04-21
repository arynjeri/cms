const express = require('express');
const router = express.Router();
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
module.exports = router;
