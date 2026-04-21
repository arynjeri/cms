/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const formatKES = (value) => (value ? `KSH ${Number(value).toLocaleString("en-KE")}` : "KSH 0");

function Cart() {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [city, setCity] = useState(""); 

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await API.get("/customer/cart", config);
      setCartItems(res.data || []);
    } catch (err) {
      console.error("Cart fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return handleRemove(productId);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await API.put(`/customer/cart/${productId}`, { quantity: newQuantity }, config);
      fetchCart(); 
    } catch (err) {
      alert("Failed to update quantity");
    }
  };

  const handleRemove = async (productId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await API.delete(`/customer/cart/${productId}`, config);
      fetchCart(); 
    } catch (err) {
      alert("Failed to remove item");
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return alert("Cart is empty!");
    if (!phoneNumber) return alert("Please provide a phone number for M-Pesa");
    if (!city) return alert("Please provide a delivery city");
    
    setIsProcessing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const orderData = {
        customer: user.id || user._id, 
        items: cartItems.map(item => ({
          productId: item.product?._id || item.product,
          quantity: item.quantity,
          price: item.product?.price || 0,
          seller: item.product?.artisan?._id || item.product?.artisan || item.product?.seller 
        })),
        deliveryAddress: { street: "Boutique Delivery", city: city, phoneNumber },
        totalAmount: cartItems.reduce((acc, item) => acc + (item.product?.price * item.quantity || 0), 0)
      };

      const res = await API.post("/customer/orders", orderData, config);
      await API.post(`/customer/payments/${res.data._id}/pay`, { phoneNumber }, config);
      
      try { await API.delete("/customer/cart", config); } catch (e) { console.warn("Cart clear skip"); }

      alert("📱 M-Pesa STK Push sent! Please enter your PIN.");
      navigate("/customer-marketplace", { state: { view: "orders" } });

    } catch (err) {
      console.error("Checkout error", err);
      alert(err.response?.data?.message || "Checkout encountered an issue.");
    } finally {
      setIsProcessing(false);
    }
  };

  const total = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  return (
    <div className={`min-h-screen p-8 md:p-16 ${isDark ? "bg-slate-950 text-white" : "bg-[#FDFCFB] text-slate-900"}`}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">
            Shopping <span className="text-indigo-600">Cart</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Review your selected handmade pieces</p>
        </header>

        {loading ? (
          <div className="py-20 text-center font-black uppercase text-[10px] animate-pulse">Syncing Inventory...</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed rounded-[3rem] opacity-30">
            <p className="font-serif italic text-2xl mb-6">Your cart is empty.</p>
            <button onClick={() => navigate("/customer-marketplace")} className="text-[10px] font-black underline uppercase tracking-widest hover:text-indigo-600">Start Shopping</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-16">
            
            {/* 🧾 ITEM LIST */}
            <div className="lg:col-span-2 space-y-8">
              {cartItems.map(item => (
                <div key={item._id} className={`flex flex-col md:flex-row gap-8 p-8 rounded-[2.5rem] border-2 transition-all ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"}`}>
                  <img src={`http://localhost:5000${item.product?.imageUrl}`} className="w-full md:w-32 h-40 md:h-32 object-cover rounded-[1.5rem]" alt="" />
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] font-black uppercase text-indigo-600 mb-1">{item.product?.artisan?.name || "Artisan Piece"}</p>
                        <h2 className="text-xl font-black uppercase tracking-tight">{item.product?.name}</h2>
                      </div>
                      <button onClick={() => handleRemove(item.product?._id)} className="text-[9px] font-black uppercase text-red-500 hover:underline">Remove</button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border">
                        <button onClick={() => handleUpdateQuantity(item.product?._id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:text-indigo-600">−</button>
                        <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.product?._id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:text-indigo-600">+</button>
                      </div>
                      <p className="text-xl font-black text-indigo-600">{formatKES(item.product?.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 💳 CHECKOUT PANEL */}
            <div className="relative">
              <div className={`sticky top-32 p-10 rounded-[3rem] border-2 shadow-2xl ${isDark ? "bg-slate-900 border-indigo-500/20" : "bg-white border-slate-100"}`}>
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 border-b pb-4">Order Summary</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                    <span>Subtotal</span>
                    <span>{formatKES(total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                    <span>Delivery</span>
                    <span className="text-emerald-500">Free</span>
                  </div>
                  <div className="pt-4 border-t flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase">Total Amount</span>
                    <span className="text-3xl font-black text-indigo-600 leading-none tracking-tighter">{formatKES(total)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1">Delivery City</p>
                    <input 
                      type="text" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Nairobi" 
                      className={`w-full p-4 rounded-2xl border-2 font-bold focus:border-indigo-600 outline-none transition-all ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1">M-Pesa Number</p>
                    <input 
                      type="text" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="2547..." 
                      className={`w-full p-4 rounded-2xl border-2 font-bold focus:border-indigo-600 outline-none transition-all ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}
                    />
                  </div>
                  
                  {/* MAIN CHECKOUT BUTTON */}
                  <button 
                    onClick={handlePlaceOrder} 
                    disabled={isProcessing} 
                    className="w-full mt-2 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Complete Purchase"}
                  </button>

                  {/* REDIRECT BACK BUTTON */}
                  <button 
                    onClick={() => navigate("/customer-marketplace")}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                  >
                    ← Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;