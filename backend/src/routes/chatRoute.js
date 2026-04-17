const express = require('express');
const router = express.Router();
const Message = require('../models/Message'); 
const User = require('../models/User'); 
const Product = require('../models/Product');
const authorize = require('../middleware/auth');

// Get message count for user
router.get('/count/messages', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Message.countDocuments({
      $or: [{ sender: userId }, { receiver: userId }]
    });
    res.json({ count });
  } catch (err) {
    console.error('Chat count error:', err);
    res.status(500).json({ message: 'Failed to get message count' });
  }
});

//Get conversation count for user
router.get('/count/conversations', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).populate('sender').populate('receiver').populate('product');

    const conversations = new Set();
    messages.forEach(msg => {
      const partnerId = msg.sender?._id?.toString() === userId.toString() ? msg.receiver?._id : msg.sender?._id;
      const comboKey = `${msg.product?._id}-${partnerId}`;
      conversations.add(comboKey);
    });

    res.json({ count: conversations.size });
  } catch (err) {
    console.error('Conversation count error:', err);
    res.status(500).json({ message: 'Failed to get conversation count' });
  }
});

//  Get all unique conversations for the sidebar
router.get('/conversations', async (req, res) => {
  try {

    const userId = req.headers.userid; // Or req.user.id

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .populate('product', 'name')
    .populate('sender', 'name')
    .populate('receiver', 'name')
    .sort({ createdAt: -1 });

    // This logic creates a unique list of "conversations" 
    // so the sidebar doesn't show 50 messages, just 1 per product combo
    const conversations = [];
    const seen = new Set();

    messages.forEach(msg => {
      const partnerId = msg.sender._id.toString() === userId ? msg.receiver._id : msg.sender._id;
      const comboKey = `${msg.product._id}-${partnerId}`;

      if (!seen.has(comboKey)) {
        seen.add(comboKey);
        conversations.push({
          _id: msg._id,
          product: msg.product,
          sender: msg.sender,
          receiver: msg.receiver,
          lastMessage: msg.content,
          createdAt: msg.createdAt
        });
      }
    });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error fetching conversations" });
  }
});
// Save a message
router.post('/', async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    await newMessage.save();
    // Populate and return the full message
    const savedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate('product', 'name');
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Chat POST Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get history for a product/customer combo
router.get('/:productId/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      product: req.params.productId, // Match the 'product' field in your Schema
      $or: [{ sender: req.params.userId }, { receiver: req.params.userId }] // Match the 'sender'/'receiver' fields
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .populate('product', 'name')
    .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Chat GET Error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;