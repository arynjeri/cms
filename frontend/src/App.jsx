import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Marketplace from "./pages/Marketplace";
import Users from "./pages/Users";
import AdminMarketplace from "./pages/AdminMarketplace";
import ProtectedRoute from "./components/ProtectedRoute";
import Cart from "./pages/Cart";
import ChatPage from "./pages/ChatPage";
import Orders from "./pages/Orders";
import ProfileEdit from "./pages/ProfileEdit";
import CustomerMarketplace from "./pages/CustomerMarketplace";
import ProductDetail from "./pages/ProductDetail";

function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTE */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["admin", "artisan", "customer"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="profile-edit" element={<ProfileEdit />} />
          <Route path="projects" element={<Projects />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="users" element={<Users />} />
          <Route path="admin-marketplace" element={<AdminMarketplace />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="customer-marketplace" element={<CustomerMarketplace />} />
          <Route path="products/:id" element={<ProductDetail />} />
        </Route>  
      </Routes>
    </Router>
  );
}

export default App;