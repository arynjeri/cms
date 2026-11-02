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

// Get all unique conversations for the sidebar
router.get('/conversations', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
  try {
    // 1. Fix the ID issue (Checks for both ._id and .id just in case)
    const userId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    
    console.log("-----------------------------------------");
    console.log("🔍 DETECTIVE MODE: Fetching inbox for User ID:", userId);

    // 2. Find the messages
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .populate('product', 'name')
    .populate('sender', 'name')
    .populate('receiver', 'name')
    .sort({ createdAt: -1 });

    console.log(`✅ Found ${messages.length} total messages for this user in the database.`);

    const conversations = [];
    const seen = new Set();

    messages.forEach(msg => {
      // 3. Check for broken ghost messages
      if (!msg.sender || !msg.receiver || !msg.product) {
         console.log("⚠️ WARNING: Found a broken message! It is missing data:");
         console.log(`   - Has Sender? ${!!msg.sender}`);
         console.log(`   - Has Receiver? ${!!msg.receiver} <--- (If false, the Artisan ID was missing when the customer sent it)`);
         console.log(`   - Has Product? ${!!msg.product}`);
         return; // Skip broken messages so the app doesn't crash
      }

      const partnerId = msg.sender._id.toString() === userId ? msg.receiver._id.toString() : msg.sender._id.toString();
      const comboKey = `${msg.product._id.toString()}-${partnerId}`;

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

    console.log(`🚀 Sending ${conversations.length} unique conversations to the screen.`);
    console.log("-----------------------------------------");
    
    res.json(conversations);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ message: "Server Error fetching conversations" });
  }
});
// Save a message
router.post('/', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
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
router.get('/:productId/:userId', authorize(['customer', 'artisan', 'admin']), async (req, res) => {
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