const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be created publicly' });
    }

    if (!['artisan', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // 📧 GMAIL ONLY VALIDATION
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ message: 'Only @gmail.com accounts are allowed' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password is too weak' });
    }

    // 📱 PHONE SANITIZATION (Convert 07... or 01... to 254...)
    let cleanPhone = phoneNumber.replace(/\D/g, ""); 
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "254" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("7") || cleanPhone.startsWith("1")) {
      cleanPhone = "254" + cleanPhone;
    }

    // Validate finalized 254 format
    const phoneRegex = /^254(7|1)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ message: 'Invalid Kenyan phone number' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phoneNumber: cleanPhone, // Store as 254...
      passwordHash: password, 
      role
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        phoneNumber: user.phoneNumber,
        balance: user.balance // Include initial balance in token
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};