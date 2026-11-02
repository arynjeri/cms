# 🎨Craft Management System (CMS)

A comprehensive marketplace platform for artisans including crocheters, knitters, beaders, and jewelers to showcase, sell, and manage their craft products with real-time communication and secure M-Pesa payment integration.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Live Deployment](#live-deployment)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)
- [Database Models](#database-models)
- [Real-time Features](#real-time-features)
- [Payment Integration](#payment-integration)
- [Development Notes](#development-notes)

## 🌟 Features

### Core Features
- ✅ **User Authentication** - JWT-based authentication with role-based access control
- ✅ **Product Management** - Artisans can create, edit, and manage product listings
- ✅ **Shopping Cart** - Customers can add items and manage their cart
- ✅ **Real-time Chat** - Live messaging between customers and artisans with typing indicators
- ✅ **Order Management** - Complete order lifecycle from creation to delivery
- ✅ **M-Pesa Integration** - STK push payment processing with escrow system
- ✅ **Real-time Notifications** - Browser notifications for orders, messages, and chats
- ✅ **Admin Dashboard** - System monitoring and marketplace management
- ✅ **Inventory Management** - Artisans can track inventory items
- ✅ **Profile Management** - User profile with picture upload
- ✅ **Audit Logging** - Track admin actions and changes

### Advanced Features
- 🔔 **Order Notifications** - Real-time alerts when orders are paid
- 💬 **Typing Indicators** - See when the other person is typing
- 🔐 **Token Expiration** - Auto-logout on token expiry with 1-day expiration
- 📊 **Dashboard Statistics** - Role-specific stats and metrics
- 💸 **Escrow System** - Virtual balance for artisans, the system handles payout but can alos be done by admin
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Multer** for file uploads
- **Sharp** for image compression
- **Axios** for HTTP requests
- **Dotenv** for environment configuration
- **Daraja API** (Safaricom M-Pesa) for payments

### Frontend
- **React 18** with Vite
- **React Router v6** for navigation
- **Axios** for API calls
- **Socket.io Client** for real-time features
- **Tailwind CSS** for styling
- **Context API** for state management

### Database
- **MongoDB** - NoSQL database for flexible schema

## 🏗️ Architecture

```
CMS (Marketplace)
├── Frontend (React + Vite)
│   ├── Authentication Pages
│   ├── Dashboard (Role-specific)
│   ├── Product Management
│   ├── Shopping Cart & Checkout
│   ├── Real-time Chat
│   ├── Order Management
│   └── User Profiles
│
├── Backend (Node.js + Express)
│   ├── Authentication Routes
│   ├── Product Management
│   ├── Order Processing
│   ├── Payment Integration
│   ├── Chat Messaging
│   ├── User Management
│   └── Admin Controls
│
├── Database (MongoDB)
│   ├── Users
│   ├── Products
│   ├── Orders
│   ├── Messages
│   ├── Inventory/Projects
│   └── Audit Logs
│
└── Real-time (Socket.io)
    ├── Online Users Tracking
    ├── Message Broadcasting
    ├── Order Notifications
    └── Typing Indicators
```

## 🚀 Live Deployment

### Backend
- **URL:** [https://cms-mb54.onrender.com/api]

### Frontend
- **URL:** [https://cms-git-main-ary-projects.vercel.app]

## 🔧 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn
- M-Pesa Daraja API credentials

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Configure environment variables:
# - MONGODB_URI
# - JWT_EXPIRE
# - PORT
# - JWT_SECRET
# - DARAJA_CONSUMER_KEY
# - DARAJA_CONSUMER_SECRET
# - DARAJA_SHORTCODE
# - DARAJA_PASSKEY
# - DARAJA_CALLBACK_URL
```

### Frontend Setup

```bash
cd frontend
npm install

# Frontend uses relative API calls configured in src/services/api.js
```

### Admin Account Setup and Recovery

Use the recovery script to set up the first admin account or reset an existing
admin's password. It connects to the database configured by `MONGODB_URI` in
`backend/.env`; make sure this is the same database used by the backend you
intend to sign in to.

1. In `backend/.env`, set `ADMIN_EMAIL` to the admin's email and
   `ADMIN_PASSWORD` to a new password .
2. From the `backend` directory, run:

   ```bash
   node src/scripts/recoverAdmin.js
   ```

The script resets the password only when `ADMIN_EMAIL` matches an existing
admin. If an admin exists with a different email, it stops without making
changes. If no admin exists, it creates the first admin account. Confirm the
script reports success before signing in with `ADMIN_EMAIL` and
`ADMIN_PASSWORD`.

## ▶️ Running the Application

### Start Backend Server
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend Development Server
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Production Build (Frontend)
```bash
cd frontend
npm run build
# Creates optimized build in dist/
```

## 📁 Project Structure

```
CMS/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express + Socket.io setup
│   │   ├── config/
│   │   │   ├── db.js             # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── customerOrderController.js
│   │   │   ├── customerPaymentController.js
│   │   │   ├── adminMarketplaceController.js
│   │   │   └── projectController.js
|   |   |   |── productController.js
│   │   │   └── UserController.js
│   │   │   ├── customerController.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── Order.js
│   │   │   ├── Message.js
│   │   │   ├── Payment.js
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── customerOrderRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── upload.js
│   │   ├── services/
│   │   │   └── inventoryService.js
│   │   ├── scripts/
│   │   │   └── recoverAdmin.js
│   │   └── uploads/
│   │       └── profiles/
│   ├── .env                       # Environment variables
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CustomerMarketplace.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Payment.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Inventory.jsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
└── README.md (This file is the main README.md)
```

## 📡 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/users/profile` - Get current user profile

### Products
- `GET /api/products` - Get all approved products
- `POST /api/products` - Create new product (Artisan)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/status` - Update status (Admin)

### Orders
- `POST /api/customer/orders` - Create order
- `GET /api/customer/orders` - Get customer orders
- `GET /api/customer/orders/:id` - Get order details
- `PATCH /api/orders/:id/pay` - Mark order as paid (Admin)
- `GET /api/customer/orders/count/my-orders` - Count customer orders
- `GET /api/customer/orders/count/seller-orders` - Count artisan orders

### Payments
- `POST /api/customer/payments/:id/pay` - Initiate STK push
- `POST /api/customer/payments/callback` - M-Pesa callback

### Chat
- `GET /api/chat/:productId/:userId` - Get chat history
- `POST /api/chat` - Save message
- `GET /api/chat/count/conversations` - Count user conversations

### Users
- `GET /api/users` - Get all users (Admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin)
- `POST /api/users/create-admin` - Create admin (Admin)

### Admin
- `GET /api/admin-marketplace/stats` - Dashboard stats
- `GET /api/admin-marketplace/orders` - All orders

## 👥 User Roles & Permissions

### Admin Role
- ✅ Approve/reject product listings
- ✅ View system-wide statistics
- ✅ Manage user accounts
- ✅ Moderate marketplace
- ✅ Handle order payments
- ✅ View audit logs

### Artisan Role  
- ✅ Create and manage product listings
- ✅ View their inventory
- ✅ Receive orders for their products
- ✅ Chat with customers
- ✅ Earn virtual balance
- ✅ View their sales/orders

### Customer Role
- ✅ Browse all approved products
- ✅ Add items to cart
- ✅ Place orders
- ✅ Make M-Pesa payments
- ✅ Chat with artisans
- ✅ Track order status
- ✅ View order history

## 📊 Database Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phoneNumber: String,
  role: Enum ['admin', 'artisan', 'customer'],
  profilePic: String,
  balance: Number (for artisans/payouts),
  createdAt: Date,
  updatedAt: Date
}
```

### Product
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
  artisan: ObjectId (ref: User),
  status: Enum ['pending', 'approved', 'rejected'],
  stock: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Order
```javascript
{
  _id: ObjectId,
  customer: ObjectId (ref: User),
  items: [
    {
      productId: ObjectId (ref: Product),
      quantity: Number,
      price: Number,
      seller: ObjectId (ref: User)
    }
  ],
  totalAmount: Number,
  status: Enum ['pending', 'paid', 'shipped', 'delivered', 'failed'],
  deliveryAddress: { street, city, phoneNumber },
  checkoutRequestID: String,
  paymentMpesaReceipt: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Message
```javascript
{
  _id: ObjectId,
  sender: ObjectId (ref: User),
  receiver: ObjectId (ref: User),
  product: ObjectId (ref: Product),
  content: String,
  createdAt: Date
}
```

## ✨ Real-time Features

### Socket.io Events
- **`addUser`** - Register user as online
- **`sendMessage`** - Emit new message to receiver
- **`getMessage`** - Receive new message
- **`typing`** - Notify typing status
- **`userTyping`** - Receive typing notification
- **`orderNotification`** - Notify artisan of paid order
- **`messageNotification`** - Notify of new message (when not actively chatting)
- **`chatNotification`** - Notify of new chat started

### Disconnection Handling
- User automatically removed from `onlineUsers` map on disconnect
- Online status updated for all connected clients

## 💳 Payment Integration

### M-Pesa STK Push Flow
1. Customer enters phone number and delivery details
2. Frontend calls `POST /customer/payments/:orderId/pay`
3. Backend generates M-Pesa STK push request
4. Customer sees payment prompt on phone
5. Customer enters PIN and payment processed
6. M-Pesa sends callback to backend
7. Order status updated to "paid"
8. Artisan receives real-time notification
9. Virtual balance incremented for artisan

### Environment Variables Required
```
DARAJA_CONSUMER_KEY=your_key
DARAJA_CONSUMER_SECRET=your_secret
DARAJA_SHORTCODE=your_shortcode
DARAJA_PASSKEY=your_passkey
DARAJA_CALLBACK_URL=https://your-domain/api/customer/payments/callback
DARAJA_STORE_NUMBER=your_store_number
```

## 🐛 Development Notes

### Recent Fixes & Features
- ✅ Fixed profile picture upload path handling
- ✅ Implemented real-time chat with typing indicators
- ✅ Added token expiration validation (1-day expiry)
- ✅ Fixed session management and auto-logout
- ✅ Added dashboard statistics for all roles
- ✅ Implemented M-Pesa escrow system with notifications
- ✅ Added targeted socket.io emissions for order notifications
- ✅ Fixed order creation with proper seller tracking
- ✅ Added message notifications (suppressed when actively chatting)
- ✅ Query parameter parsing for dashboard filters

### Known Issues & Solutions
- Order notifications only reach online artisans via socket.io
- Token auto-refresh on profile updates
- Cart clears after successful order placement

### Best Practices Implemented
- JWT tokens include full user data (name, email, phone, profile pic)
- Socket.io connections reference user by ID only (prevents reconnection issues)
- Online users map stored globally for cross-route access
- Image uploads processed with Sharp for optimization
- Error handling with detailed messages

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/feature-name`
4. Open Pull Request

## 📝 Notes for Deployment

Before deploying to production:
- Update `.env` with production values
- Set `JWT_EXPIRE` appropriately for security
- Configure CORS origins for production domain
- Use production M-Pesa credentials (not sandbox)
- Enable HTTPS for payment callbacks
- Set up MongoDB Atlas for production database
- Configure proper file upload directories with cleanup

## 📞 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated:** April 16, 2026 
