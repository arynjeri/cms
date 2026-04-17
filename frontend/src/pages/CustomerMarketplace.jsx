/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom"; // Added for redirection
import API from "../services/api";

const formatKES = (value) => {
  if (!value || Number.isNaN(value)) return "KSH 0";
  return `KSH ${Number(value).toLocaleString("en-KE")}`;
};

function CustomerMarket() {
  const { user, token } = useAuth(); 
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  // --- NAVIGATION & UI STATE ---
  const [view, setView] = useState("gallery"); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [activeItems, setActiveItems] = useState({});

  // --- DATA STATE ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [address, setAddress] = useState({ 
    street: "Boutique Delivery", 
    city: "Nairobi", 
    phoneNumber: user?.phoneNumber || "" 
  });

  // --- FETCH DATA ---
  const fetchMarketData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [prodRes, cartRes, orderRes] = await Promise.all([
        API.get("/products", config), 
        API.get("/customer/cart", config),
        API.get("/customer/orders", config)
      ]);
      setProducts(prodRes.data || []);
      setCart(cartRes.data || []);
      setOrders(orderRes.data || []);
    } catch (err) {
      setError("Failed to load marketplace data.");
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // --- REDIRECT TO DEDICATED CHAT ---
  const startConversation = (product) => {
    // Passes the product object to the ChatPage via React Router state
    navigate("/chat", { 
      state: { 
        autoStart: true, 
        product: product 
      } 
    });
  };

  // --- CART ACTIONS ---
  const handleAddToCart = async (productId, productName) => {
    if (activeItems[productId]) return;
    setActiveItems(prev => ({ ...prev, [productId]: true }));
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await API.post("/customer/cart", { productId, quantity: 1 }, config);
      fetchMarketData();
      setNotification({ show: true, message: `✨ ${productName} added!` });
      setTimeout(() => {
        setNotification({ show: false, message: "" });
        setActiveItems(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch (err) {
      alert("Failed to add to cart");
      setActiveItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handlePlaceOrder = async () => {
  if (cart.length === 0) return alert("Your basket is empty!");
  setLoading(true);

  try {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const orderData = {
      customer: user.id || user._id, 
      items: cart.map(item => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity || 1,
        price: item.product?.price || 0,
        seller: item.product?.artisan || item.product?.seller 
      })),
      deliveryAddress: address,
      totalAmount: cart.reduce((acc, item) => acc + (item.product?.price * item.quantity || 0), 0),
      status: "pending"
    };

    const res = await API.post("/customer/orders", orderData, config);

    if (res.data._id) {
      await API.post(`/customer/payments/${res.data._id}/pay`, { phoneNumber: address.phoneNumber }, config);
      
      // BROADCAST: This tells the Cart.jsx page to empty itself immediately
      window.dispatchEvent(new Event("cartCleared"));

      alert("✨ Order Placed! Basket Synchronized.");
      setCart([]); // Clear local state in Marketplace
      setView("orders");
      fetchMarketData(); 
    }
  } catch (err) {
    alert("Checkout failed.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900 text-white" : "bg-[#FDFCFB] text-slate-900"}`}>
      
      {/* Success Toast */}
      {notification.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-slate-700 font-black text-[10px] uppercase tracking-widest">
             {notification.message}
          </div>
        </div>
      )}

      {/* Boutique Navigation */}
      <nav className={`p-6 border-b sticky top-0 z-50 backdrop-blur-md flex justify-between items-center ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-100"}`}>
        <div className="flex gap-8 items-center text-[10px] font-black uppercase tracking-[0.3em]">
          <button onClick={() => setView("gallery")} className={view === "gallery" ? "text-indigo-600" : "text-slate-400"}>Boutique</button>
          <button onClick={() => setView("orders")} className={view === "orders" ? "text-indigo-600" : "text-slate-400"}>Orders</button>
          {/* Messages now redirects to the separate page */}
          <button onClick={() => navigate("/chat")} className="text-slate-400 hover:text-indigo-600">Messages</button>
        </div>
        <button onClick={() => setView("cart")} className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest">
          Basket ({cart.length})
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-12">
        {/* GALLERY VIEW */}
        {view === "gallery" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {products.map(p => (
              <div key={p._id} className="text-center group">
                <div className={`aspect-[3/4] rounded-[3rem] overflow-hidden border mb-6 transition-all duration-500 ${activeItems[p._id] ? "border-indigo-500 shadow-xl scale-[1.01]" : isDark ? "border-slate-800" : "border-slate-50 shadow-sm"}`}>
                  <img src={`http://localhost:5000${p.imageUrl}`} className={`w-full h-full object-cover transition-all duration-700 ${activeItems[p._id] ? "brightness-110 saturate-110" : ""}`} alt={p.name} />
                </div>
                <h3 className="font-serif text-xl font-bold">{p.name}</h3>
                <p className="text-indigo-600 font-black mb-4">{formatKES(p.price)}</p>
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleAddToCart(p._id, p.name)} 
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeItems[p._id] ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"}`}
                  >
                    {activeItems[p._id] ? "✓ Added" : "Add To Cart"}
                  </button>
                  {/* REDIRECT TRIGGER */}
                  <button 
                    onClick={() => startConversation(p)} 
                    className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 underline"
                  >
                    Chat with Artisan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BASKET VIEW */}
        {view === "cart" && (
          <div className="max-w-2xl mx-auto space-y-12">
            <h2 className="text-4xl font-serif font-black italic">Your <span className="text-indigo-600">Basket</span></h2>
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item._id} className={`flex justify-between items-center p-8 rounded-[2.5rem] border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-50"}`}>
                  <div className="flex items-center gap-6">
                    <img src={`http://localhost:5000${item.product?.imageUrl}`} className="w-16 h-16 object-cover rounded-2xl" alt="" />
                    <p className="font-bold">{item.product?.name}</p>
                  </div>
                  <p className="font-black text-indigo-600">{formatKES(item.product?.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className={`p-10 rounded-[3.5rem] space-y-6 ${isDark ? "bg-slate-800" : "bg-slate-50"}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="M-Pesa Number" className="p-4 rounded-xl outline-none" value={address.phoneNumber} onChange={(e) => setAddress({...address, phoneNumber: e.target.value})} />
                  <input type="text" placeholder="City" className="p-4 rounded-xl outline-none" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} />
                </div>
                <button onClick={handlePlaceOrder} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all active:scale-95">
                  Confirm • {formatKES(cart.reduce((a, b) => a + (b.product?.price * b.quantity || 0), 0))}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ORDERS VIEW */}
        {view === "orders" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl font-serif font-black italic">Purchase <span className="text-indigo-600">History</span></h2>
            {orders.map(o => (
              <div key={o._id} className={`p-8 border rounded-[2.5rem] flex justify-between items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-50 shadow-sm"}`}>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">Ref: {o._id.slice(-6)}</p>
                  <p className="text-2xl font-serif font-black">{formatKES(o.totalAmount)}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-600 px-6 py-2 rounded-full text-[8px] font-black uppercase">Paid</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerMarket;