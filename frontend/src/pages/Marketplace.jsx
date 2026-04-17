/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

const formatKES = (value) => {
  if (!value || Number.isNaN(value)) return "KSH 0";
  return `KSH ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
};

function Marketplace() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  
  const [viewMode, setViewMode] = useState("gallery"); 
  const [products, setProducts] = useState([]);
  const [artisanOrders, setArtisanOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", category: "Crochet", imageFile: null, originProject: null 
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/products");
      setProducts(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  const fetchSalesData = useCallback(async () => {
    if (user?.role !== "artisan") return;
    try {
      const res = await API.get("/orders/artisan"); 
      setArtisanOrders(res.data);
    } catch (err) { console.error("Sales fetch error", err); }
  }, [user]);

  useEffect(() => {
    fetchProducts();
    if (user?.role === "artisan") fetchSalesData();
    
    const params = new URLSearchParams(location.search);
    const prefillData = params.get("prefill");
    if (prefillData) {
      try {
        const project = JSON.parse(decodeURIComponent(prefillData));
        setNewProduct({
          name: project.name, description: project.description,
          category: project.category || "Crochet", price: "",
          originProject: project.originProject, imageFile: null
        });
        setShowAddModal(true);
      } catch (e) { console.error(e); }
    }
  }, [fetchProducts, fetchSalesData, location.search, user]);

  const resetForm = () => {
    setShowAddModal(false);
    setIsEditing(false);
    setCurrentProductId(null);
    setPreviewUrl(null);
    setNewProduct({ name: "", description: "", price: "", category: "Crochet", imageFile: null, originProject: null });
  };

  // --- EDIT CLICK HANDLER ---
  const handleEditClick = (product) => {
    setIsEditing(true);
    setCurrentProductId(product._id);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      originProject: product.parentProject || product.originProject || null,
      imageFile: null 
    });
    // Set existing image as preview
    setPreviewUrl(product.imageUrl ? `http://localhost:5000${product.imageUrl}` : null);
    setShowAddModal(true);
  };

  // --- SUBMIT LOGIC (CREATE OR UPDATE) ---
  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", newProduct.name);
    data.append("description", newProduct.description);
    data.append("price", newProduct.price);
    data.append("category", newProduct.category);
    
    if (newProduct.originProject) data.append("originProject", newProduct.originProject);
    
    // Only append image if a NEW file was selected
    if (newProduct.imageFile) {
      data.append("image", newProduct.imageFile);
    }

    try {
      if (isEditing) {
        // Use PUT or PATCH based on your backend route
        await API.put(`/products/${currentProductId}`, data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Listing updated successfully! ✨");
      } else {
        await API.post("/products", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Work published to marketplace! 🧶");
      }
      resetForm();
      fetchProducts();
      window.history.replaceState({}, document.title, "/marketplace");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Operation failed. Check server console.");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Remove this listing permanently?")) return;
    try { await API.delete(`/products/${id}`); fetchProducts(); } 
    catch (err) { alert("Delete failed."); }
  };

  const updateStatus = async (id, status) => {
    try { await API.patch(`/products/${id}/status`, { status }); fetchProducts(); } 
    catch (err) { alert("Failed to update status."); }
  };

  const addToCart = async (productId) => {
    try { await API.post(`/users/cart`, { productId, quantity: 1 }); alert("Added to cart! 🛒"); } 
    catch (err) { alert("Cart update failed."); }
  };

  const inputClass = `p-4 rounded-2xl border-2 transition-all outline-none ${
    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
  }`;

  const displayedProducts = products.filter(p => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'artisan') {
      const sellerId = p.seller?._id || p.seller || p.artisan?._id || p.artisan;
      return sellerId === user?.id || sellerId === user?._id;
    }
    return p.status === 'approved';
  });

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDark ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-12 border-b-2 border-indigo-100 pb-6">
          <div>
            <h1 className="text-5xl font-serif font-black">
              The <span className="italic text-indigo-500">{viewMode === "gallery" ? "Market" : "Ledger"}</span>
            </h1>
            <div className="flex gap-6 mt-4">
              <button onClick={() => setViewMode("gallery")} className={`text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'gallery' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}`}>Gallery</button>
              {user?.role === "artisan" && (
                <button onClick={() => { setViewMode("sales"); fetchSalesData(); }} className={`text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'sales' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}`}>My Sales</button>
              )}
            </div>
          </div>

          {user?.role === "artisan" && (
            <div className="flex flex-col items-end gap-2">
              {viewMode === "sales" && (
                <div className="text-right mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">My Balance</p>
                  <p className="text-3xl font-black text-emerald-500">{formatKES(user.balance || 0)}</p>
                </div>
              )}
              <button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-slate-900 text-white dark:bg-indigo-600 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl transform hover:-translate-y-1 transition-all">
                + LIST WORK
              </button>
            </div>
          )}
        </header>

        {/* VIEW: ARTISAN SALES */}
        {viewMode === "sales" && (
          <div className="space-y-6">
            {artisanOrders.map(order => (
              <div key={order._id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Order ID: #{order._id.slice(-8)}</span>
                    <h3 className="text-2xl font-bold mt-1 dark:text-white">Customer: {order.customer?.name}</h3>
                    <p className="text-sm text-slate-400">{order.customer?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {order.status}
                    </span>
                    <p className="text-xl font-black mt-3">{formatKES(order.totalAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
            {artisanOrders.length === 0 && <div className="p-20 text-center text-slate-400 italic font-serif">Waiting for your first sale...</div>}
          </div>
        )}

        {/* VIEW: GALLERY */}
        {viewMode === "gallery" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {displayedProducts.map((product) => (
              <div key={product._id} className="group flex flex-col">
                <div className={`aspect-[4/5] rounded-[2.5rem] overflow-hidden border mb-4 relative ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white shadow-sm"}`}>
                  {user?.role === 'admin' && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[9px] font-black uppercase bg-amber-400 text-white">
                      {product.status}
                    </div>
                  )}
                  <img 
                    src={product.imageUrl ? `http://localhost:5000${product.imageUrl}` : "https://via.placeholder.com/400x500"}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-1 dark:text-white">{product.name}</h3>
                <p className="text-indigo-600 dark:text-indigo-400 font-black text-xl mb-4">{formatKES(product.price)}</p>
                
                <div className="flex gap-2">
                  {user?.role === "customer" && (
                    <button onClick={() => addToCart(product._id)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all">
                      Add to Cart
                    </button>
                  )}
                  {user?.role === "artisan" && (
                    <>
                      <button onClick={() => handleEditClick(product)} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase">Edit</button>
                      <button onClick={() => deleteProduct(product._id)} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase">Delete</button>
                    </>
                  )}
                  {user?.role === "admin" && product.status === "pending" && (
                    <div className="flex gap-2 w-full">
                      <button onClick={() => updateStatus(product._id, 'approved')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-tighter">Approve</button>
                      <button onClick={() => updateStatus(product._id, 'rejected')} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-tighter">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTING MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white"}`}>
              <div className="flex justify-between items-start mb-6">
                <h2 className="font-serif text-3xl font-bold dark:text-white underline decoration-indigo-200">
                  {isEditing ? "Edit Work" : "New Listing"}
                </h2>
                <button onClick={resetForm} className="text-2xl">✕</button>
              </div>
              <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Product Name</label>
                  <input placeholder="Name" className={inputClass} value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Category</label>
                  <select className={inputClass} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    <option>Crochet</option><option>Knitting</option><option>Beading</option><option>Jewelry</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Price (KSH)</label>
                  <input type="number" placeholder="Price" className={inputClass} value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Change Image</label>
                  <div className="flex items-center gap-3">
                    <input type="file" className="text-[10px]" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) { setNewProduct({ ...newProduct, imageFile: file }); setPreviewUrl(URL.createObjectURL(file)); }
                    }} />
                    {previewUrl && <img src={previewUrl} className="h-10 w-10 object-cover rounded-lg border border-indigo-500" />}
                  </div>
                </div>
                <textarea placeholder="Description..." className={`md:col-span-2 ${inputClass}`} rows="3" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                <div className="md:col-span-2 flex gap-4 mt-4">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90">
                    {isEditing ? "SAVE UPDATES" : "PUBLISH WORK"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-8 font-black text-[10px] uppercase text-slate-400">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Marketplace;