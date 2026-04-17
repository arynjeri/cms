/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

const formatKES = (value) => {
  if (!value || Number.isNaN(value)) return "KSH 0";
  return `KSH ${Number(value).toLocaleString("en-KE")}`;
};

function AdminMarketplace() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  // --- STATES ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("products"); // products, orders, stats
  const [filter, setFilter] = useState("all");

  // --- DATA FETCHING ---
  const fetchAllAdminData = useCallback(async () => {
    if (user?.role !== "admin") {
      setError("You don't have permission to access this page");
      return;
    }
    try {
      setLoading(true);
      const [prodRes, orderRes, statsRes] = await Promise.all([
        API.get("/admin-marketplace/products"),
        API.get("/admin-marketplace/orders"),
        API.get("/admin-marketplace/stats")
      ]);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setStats(statsRes.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      setError("Failed to load management console data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  // --- PRODUCT ACTIONS ---
  const updateProductStatus = async (productId, status) => {
    try {
      await API.put(`/admin-marketplace/products/${productId}/status`, { status });
      fetchAllAdminData();
    } catch (err) {
      alert("Failed to update product status");
    }
  };

  // --- ORDER ACTIONS (SUPERUSER CONTROLS) ---
  const handleOrderAction = async (orderId, action) => {
    const confirmMsg = action === 'delete' 
      ? "Are you sure? This permanently removes the order from the database." 
      : `Mark this order as ${action === 'pay' ? 'PAID' : 'DELIVERED'}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (action === 'pay') {
        await API.patch(`/admin-marketplace/orders/${orderId}/pay`);
      } else if (action === 'deliver') {
        await API.patch(`/admin-marketplace/orders/${orderId}/deliver`);
      } else if (action === 'delete') {
        await API.delete(`/admin-marketplace/orders/${orderId}`);
      }
      fetchAllAdminData(); 
    } catch (err) {
      alert(err.response?.data?.message || `Failed to perform ${action}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  return (
    <div className={`space-y-8 p-6 ${isDark ? "text-white" : "text-slate-900"}`}>
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Admin <span className="text-indigo-600">Console</span></h1>
          <p className={isDark ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>
            Overseeing the artisan marketplace and system transactions
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl dark:bg-slate-800">
          {["products", "orders", "stats"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" 
                : "text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase">
          {error}
        </div>
      )}

      {/* VIEW: STATS SUMMARY */}
      {activeTab === "stats" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className={`p-8 rounded-[2rem] border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Revenue</p>
            <p className="text-3xl font-black text-emerald-500">{formatKES(stats.totalRevenue)}</p>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Orders</p>
            <p className="text-3xl font-black">{stats.totalOrders}</p>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Pending Approvals</p>
            <p className="text-3xl font-black text-amber-500">{stats.pendingProducts}</p>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Active Artisans</p>
            <p className="text-3xl font-black text-indigo-500">{stats.totalArtisans}</p>
          </div>
        </div>
      )}

      {/* VIEW: PRODUCTS MANAGEMENT */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${
                  filter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className={`rounded-[2.5rem] border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
            <table className="w-full text-left">
              <thead className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-slate-700 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                <tr>
                  <th className="px-8 py-5">Item</th>
                  <th className="px-8 py-5">Artisan</th>
                  <th className="px-8 py-5">Price</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((p) => (
                  <tr key={p._id} className={isDark ? "hover:bg-slate-700/50" : "hover:bg-slate-50/50"}>
                    <td className="px-8 py-6 font-bold">{p.name}</td>
                    <td className="px-8 py-6 text-sm">{p.artisan?.name}</td>
                    <td className="px-8 py-6 font-black text-indigo-600">{formatKES(p.price)}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                        p.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 
                        p.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {p.status !== "approved" && (
                        <button onClick={() => updateProductStatus(p._id, "approved")} className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm">Approve</button>
                      )}
                      {p.status !== "rejected" && (
                        <button onClick={() => updateProductStatus(p._id, "rejected")} className="px-4 py-2 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm">Reject</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: ALL ORDERS */}
      {activeTab === "orders" && (
        <div className={`rounded-[2.5rem] border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
          <table className="w-full text-left">
            <thead className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-slate-700 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
              <tr>
                <th className="px-8 py-5">Order ID</th>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {orders.map((o) => (
                <tr key={o._id} className={isDark ? "hover:bg-slate-700/50" : "hover:bg-slate-50/50"}>
                  <td className="px-8 py-6 text-xs font-mono">#{o._id.slice(-8)}</td>
                  <td className="px-8 py-6 text-sm">
                    <div className="font-bold">{o.customer?.name}</div>
                    <div className="text-[10px] text-slate-400">{o.customer?.email}</div>
                  </td>
                  <td className="px-8 py-6 font-black">{formatKES(o.totalAmount)}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                      o.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 
                      o.status === 'delivered' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    {o.status === 'pending' && (
                      <button onClick={() => handleOrderAction(o._id, 'pay')} className="px-3 py-1 border border-emerald-500 text-emerald-500 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-white transition-all">Force Paid</button>
                    )}
                    {o.status === 'paid' && (
                      <button onClick={() => handleOrderAction(o._id, 'deliver')} className="px-3 py-1 border border-indigo-500 text-indigo-500 text-[9px] font-black uppercase rounded-lg hover:bg-indigo-500 hover:text-white transition-all">Deliver</button>
                    )}
                    <button onClick={() => handleOrderAction(o._id, 'delete')} className="px-3 py-1 text-red-400 hover:text-red-600 text-[9px] font-black uppercase transition-all">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="p-20 text-center italic text-slate-400">No system orders recorded.</div>}
        </div>
      )}
    </div>
  );
}

export default AdminMarketplace;