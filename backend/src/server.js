require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminMarketplaceRoutes = require('./routes/adminMarketplaceRoute');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const productRoutes = require('./routes/productRoutes');
const chatRoutes = require('./routes/chatRoute');
const customerRoutes = require('./routes/customerRoutes');
const projectRoutes = require('./routes/projectRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerOrderRoutes = require('./routes/customerOrderRoutes'); 
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean); // Cleans out undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin); // Helps you debug in Render logs
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 2. Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customer/orders', customerOrderRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/update', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customer/payments', paymentRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/admin-marketplace', adminMarketplaceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/projects', projectRoutes);

const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log("📁 Created 'uploads' directory for production");
}

app.use('/uploads', express.static(uploadPath, {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
})); // Serve uploaded images

// 3. Create HTTP Server for both Express and Socket.io
const server = http.createServer(app);

// 4. Socket.io setup attached to the HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Change from "http://localhost:5173"
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 5. Real-time Chat Logic
let onlineUsers = new Map();
global.onlineUsers = onlineUsers; // Make available to routes
global.io = io; // Export Socket.io instance globally for routes

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", ({ senderId, senderName, receiverId, productId, text }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getMessage", { senderId, senderName, productId, text });
      // Send notification to receiver (frontend will decide to show it based on activeChat)
      io.to(receiverSocketId).emit("messageNotification", { 
        senderId,
        senderName,
        productId,
        message: `New message from ${senderName}`
      });
    }
  });

  socket.on("typing", ({ senderId, senderName, receiverId, productId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId, senderName, productId });
    }
  });

  // NEW: Order paid notification - when admin marks order as paid
  socket.on("orderPaid", ({ sellerId, orderId, productName, customerName }) => {
    const sellerSocketId = onlineUsers.get(sellerId);
    if (sellerSocketId) {
      io.to(sellerSocketId).emit("orderNotification", { 
        orderId,
        type: "paid",
        message: `Payment received for ${productName} from ${customerName}`,
        timestamp: new Date()
      });
    }
  });

  // NEW: New chat notification
  socket.on("newChatStarted", ({ senderId, senderName, receiverId, productId, productName }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chatNotification", { 
        senderId,
        senderName,
        productId,
        productName,
        message: `${senderName} started a chat about ${productName}`
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) onlineUsers.delete(key);
    });
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
  });
});

// 6. Database Connection
connectDB();

// 7. START SERVER 
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});