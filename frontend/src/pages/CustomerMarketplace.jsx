/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom"; 
import API from "../services/api";

const formatKES = (value) => {
  if (!value || Number.isNaN(value)) return "KSH 0";
  return `KSH ${Number(value).toLocaleString("en-KE")}`;
};

function CustomerMarket() {
  const { user, token } = useAuth(); 
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  const [view, setView] = useState("gallery"); 
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [activeItems, setActiveItems] = useState({});

  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [address, setAddress] = useState({ 
    street: "Boutique Delivery", 
    city: "", 
    phoneNumber: user?.phoneNumber || "" 
  });

  const fetchMarketData = useCallback(async () => {
    if (!user) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [prodRes, cartRes, orderRes] = await Promise.all([
        API.get("/products", config), 
        API.get("/customer/cart", config),
        API.get("/customer/orders", config)
      ]);
      
      const verifiedProducts = (prodRes.data || []).filter(p => p.status === "approved");
      setProducts(verifiedProducts);
      setCart(cartRes.data || []);
      setOrders(orderRes.data || []);
    } catch (err) { console.error("Market Sync Error"); }
  }, [user, token]);

  useEffect(() => { fetchMarketData(); }, [fetchMarketData]);

  useEffect(() => {
    const hasPending = orders.some(o => o.status === 'pending');
    if (hasPending) {
      const interval = setInterval(() => { fetchMarketData(); }, 5000);
      return () => clearInterval(interval);
    }
  }, [orders, fetchMarketData]);

  const handleAddToCart = async (productId, productName) => {
    if (activeItems[productId]) return;
    setActiveItems(prev => ({ ...prev, [productId]: true }));
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await API.post("/customer/cart", { productId, quantity: 1 }, config);
      fetchMarketData();
      setView("cart"); 
      setNotification({ show: true, message: `🛒 Added ${productName}` });
      setTimeout(() => setNotification({ show: false, message: "" }), 2000);
    } catch (err) { alert("Cart update failed"); } finally { setActiveItems(prev => ({ ...prev, [productId]: false })); }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Basket is empty!");
    if (!address.city) return alert("Please enter a delivery city!");
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const orderData = {
        customer: user._id, 
        items: cart.map(item => ({
          productId: item.product?._id,
          quantity: item.quantity || 1,
          price: item.product?.price || 0,
          seller: item.product?.artisan
        })),
        deliveryAddress: address,
        totalAmount: cart.reduce((acc, item) => acc + (item.product?.price * item.quantity || 0), 0)
      };

      const res = await API.post("/customer/orders", orderData, config);
      setCart([]); 
      setView("orders"); 
      await API.post(`/customer/payments/${res.data._id}/pay`, { phoneNumber: address.phoneNumber }, config);
      alert("📱 M-Pesa STK Push sent!");
      fetchMarketData(); 
    } catch (err) { alert("Checkout failed."); } finally { setLoading(false); }
  };

  const handleConfirmAndReview = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await API.post(`/customer/orders/${activeOrderId}/complete`, reviewData, config);
      setNotification({ show: true, message: "✨ Delivery Confirmed!" });
      setShowReviewModal(false);
      fetchMarketData(); 
    } catch (err) { 
      alert(err.response?.data?.message || "Review failed."); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900 text-white" : "bg-[#FDFCFB] text-slate-900"}`}>
      
      {showReviewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-10 rounded-[3rem] ${isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"} shadow-2xl border-b-8 border-indigo-500`}>
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Package Received!</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Rate your experience</p>
            </div>

            <form onSubmit={handleConfirmAndReview} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase ml-2 opacity-50">Star Rating (1-5)</label>
                <input 
                  type="number" min="1" max="5" 
                  className={`w-full p-4 rounded-2xl border-2 font-bold ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"}`} 
                  value={reviewData.rating} 
                  onChange={(e) => setReviewData({...reviewData, rating: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase ml-2 opacity-50">Your Comments</label>
                <textarea 
                  placeholder="Tell us about the quality..." 
                  className={`w-full p-4 rounded-2xl border-2 h-28 resize-none ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"}`} 
                  value={reviewData.comment} 
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})} 
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-700 transition-all"
                >
                  {loading ? "Processing..." : "Confirm & Review"}
                </button>
                
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification.show && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl">{notification.message}</div>}

      <nav className={`p-6 border-b sticky top-0 z-50 backdrop-blur-md flex justify-between items-center ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-100"}`}>
        <div className="flex gap-10 font-black text-[10px] uppercase tracking-[0.3em]">
          <button onClick={() => setView("gallery")} className={view === "gallery" ? "text-indigo-600 underline underline-offset-8" : "text-slate-400"}>Marketplace</button>
          <button onClick={() => setView("orders")} className={view === "orders" ? "text-indigo-600 underline underline-offset-8" : "text-slate-400"}>My Purchases</button>
        </div>
        <button onClick={() => setView("cart")} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase">Basket ({cart.length})</button>
      </nav>

      <main className="max-w-7xl mx-auto p-12">
        {view === "gallery" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {products.map(p => (
              <div key={p._id} className="group">
                <div className={`aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 mb-4 ${isDark ? "border-slate-800" : "border-slate-50"}`}><img src={`http://localhost:5000${p.imageUrl}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /></div>
                <h3 className="font-black text-lg">{p.name}</h3>
                <p className="text-indigo-600 font-black mb-4">{formatKES(p.price)}</p>
                <div className="flex flex-col gap-2">
                   <button onClick={() => handleAddToCart(p._id, p.name)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{activeItems[p._id] ? "Adding..." : "Add To Basket"}</button>
                   <button onClick={() => navigate("/chat", { state: { product: p, autoStart: true } })} className="text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 underline">Chat with Artisan</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "cart" && (
          <div className="max-w-xl mx-auto space-y-8">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Your <span className="text-indigo-600">Basket</span></h2>
            <div className="space-y-4">
              {cart.map(item => (
                 <div key={item._id} className={`flex justify-between items-center p-6 rounded-2xl border-2 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                   <div><p className="font-bold">{item.product?.name}</p><p className="text-[10px] font-black opacity-40">Qty: {item.quantity}</p></div>
                   <p className="font-black text-indigo-600">{formatKES(item.product?.price * item.quantity)}</p>
                 </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className={`p-10 rounded-[3rem] ${isDark ? "bg-slate-800" : "bg-slate-50"}`}>
                <input type="text" className={`w-full p-4 rounded-xl mb-4 font-bold border-2 ${isDark ? "bg-slate-700" : "bg-white"}`} placeholder="e.g. City" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} />
                <input type="text" className={`w-full p-4 rounded-xl mb-6 font-bold border-2 ${isDark ? "bg-slate-700" : "bg-white"}`} placeholder="254..." value={address.phoneNumber} onChange={(e) => setAddress({...address, phoneNumber: e.target.value})} />
                <button onClick={handlePlaceOrder} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Complete Payment • {formatKES(cart.reduce((a, b) => a + (b.product?.price * b.quantity || 0), 0))}</button>
              </div>
            )}
          </div>
        )}

        {view === "orders" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">Order <span className="text-indigo-600">Status</span></h2>
            {orders.map(o => (
              <div key={o._id} className={`p-8 rounded-[3rem] border-2 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-indigo-50 shadow-sm"}`}>
                <div className="flex justify-between items-center mb-6">
                  <div className="font-mono text-indigo-500 font-bold text-[11px]">{o.transactionCode || o._id.slice(-8)}</div>
                  <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${o.status === 'paid' ? 'bg-indigo-600 text-white' : o.status === 'shipped' ? 'bg-sky-500 text-white' : o.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{o.status}</span>
                </div>
                <div className="text-3xl font-black mb-6">{formatKES(o.totalAmount)}</div>
                {o.status === "shipped" && (
                  <button onClick={() => { setActiveOrderId(o._id); setShowReviewModal(true); }} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirm Item Received ✅</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerMarket;