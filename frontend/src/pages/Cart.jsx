/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const formatKES = (value) => (value ? `KSH ${Number(value).toLocaleString("en-KE")}` : "KSH 0");

function Cart() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState({ phoneNumber: "", city: "", street: "" });
  const [notification, setNotification] = useState({ show: false, message: "" });

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await API.get("/customer/cart");
      setCartItems(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await API.delete(`/customer/cart/${productId}`);
      fetchCart();
    } catch (err) {
      console.error(err);
      alert("Failed to remove item");
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return handleRemove(productId);
    try {
      await API.put(`/customer/cart/${productId}`, { quantity: newQuantity });
      fetchCart();
    } catch (err) {
      console.error(err);
      alert("Failed to update quantity");
    }
  };

  const handlePlaceOrder = async () => {
  if (cartItems.length === 0) return alert("Your cart is empty!");
  if (!address.phoneNumber || !address.city) return alert("Please fill in delivery details!");
  
  setLoading(true);
  try {
    const orderData = {
      customer: user.id || user._id,
      items: cartItems.map(item => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity || 1,
        price: item.product?.price || 0,
        seller: item.product?.artisan || item.product?.seller 
      })),
      deliveryAddress: address,
      totalAmount: cartItems.reduce((acc, item) => acc + (item.product?.price * item.quantity || 0), 0)
    };

    const res = await API.post("/customer/orders", orderData);
    
    // CLEAR CART CALL
    await API.delete("/customer/cart"); 

    await API.post(`/customer/payments/${res.data._id}/pay`, { phoneNumber: address.phoneNumber });
    
    alert("Order placed successfully!");
    setCartItems([]); // Clears UI
    navigate("/orders");
  } catch (err) {
    console.error(err);
    alert("Checkout failed.");
  } finally {
    setLoading(false);
  }
};

  if (user?.role !== "customer") return <div className="p-20 text-center italic">Restricted to Customers.</div>;

  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className={`min-h-screen p-8 ${isDark ? "bg-slate-900 text-white" : "bg-[#FDFCFB] text-gray-900"}`}>
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notification.message}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg mb-4">Your cart is empty</p>
          <button onClick={() => navigate("/customer-marketplace")} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div key={item.product._id} className={`flex justify-between items-center p-4 border rounded-lg ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={item.product.imageUrl ? `http://localhost:5000${item.product.imageUrl}` : "https://via.placeholder.com/80"}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h2 className="font-bold text-lg">{item.product.name}</h2>
                    <p className="text-sm opacity-75">{formatKES(item.product.price)} each</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity Controls */}
                  <div className={`flex items-center border rounded-lg ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-100 border-gray-300"}`}>
                    <button
                      onClick={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                      className="px-3 py-2 hover:opacity-75"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 font-bold min-w-12 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                      className="px-3 py-2 hover:opacity-75"
                    >
                      +
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right min-w-24">
                    <p className="font-bold">{formatKES(item.product.price * item.quantity)}</p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.product._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Delivery Address */}
          <div className={`${isDark ? "bg-slate-800" : "bg-white"} p-6 rounded-lg border ${isDark ? "border-slate-700" : "border-gray-200"} h-fit`}>
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            {/* Delivery Address Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2">Phone Number</label>
                <input
                  type="text"
                  value={address.phoneNumber}
                  onChange={(e) => setAddress({ ...address, phoneNumber: e.target.value })}
                  placeholder="e.g., 0712345678"
                  className={`w-full px-4 py-2 border rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-300"}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">City</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g., Nairobi"
                  className={`w-full px-4 py-2 border rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-300"}`}
                />
              </div>

            </div>

            {/* Summary Details */}
            <div className="space-y-3 border-t border-gray-300 dark:border-slate-600 pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatKES(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-slate-600 pt-3 mt-3">
                <span>Total:</span>
                <span>{formatKES(totalPrice)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold mt-6 transition"
            >
              {loading ? "Processing..." : "Place Order"}
            </button>

            <button
              onClick={() => navigate("/customer-marketplace")}
              className={`w-full mt-3 px-6 py-3 rounded-lg font-bold border transition ${isDark ? "bg-slate-700 border-slate-600 hover:bg-slate-600" : "bg-gray-100 border-gray-300 hover:bg-gray-200"}`}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;