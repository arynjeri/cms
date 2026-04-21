/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const formatKES = (v) => `KSH ${Number(v || 0).toLocaleString("en-KE")}`;

function AdminMarketplace() {
  const { token } = useAuth();
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [filter, setFilter] = useState("all");

  const fetchAllData = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [pRes, oRes] = await Promise.all([
        API.get("/admin-marketplace/products", config),
        API.get("/admin-marketplace/orders", config)
      ]);
      setProducts(pRes.data);
      setOrders(oRes.data);
    } catch (err) { console.error("Sync Error"); }
  }, [token]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  //  Revenue is only counted for Shipped or Completed orders
  const financialBase = useMemo(() => {
    return orders.filter(o => ["shipped", "completed"].includes(o.status));
  }, [orders]);

  const revenueData = useMemo(() => {
    const total = financialBase.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    return [
      { name: "Artisan Share (90%)", value: total * 0.9, color: "#4F46E5" },
      { name: "System Earnings (10%)", value: total * 0.1, color: "#10B981" }
    ];
  }, [financialBase]);

  const filteredItems = useMemo(() => {
    if (activeTab === "stats") {
       return filter === "all" ? financialBase : financialBase.filter(o => o.status === filter);
    }
    if (activeTab === "orders") {
       const base = orders.filter(o => o.status !== 'paid'); 
       return filter === "all" ? base : base.filter(o => o.status === filter);
    }
    return filter === "all" ? products : products.filter(p => p.status === filter);
  }, [orders, products, filter, activeTab, financialBase]);

  const handleAction = async (id, type, action) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (type === 'prod') {
        await API.put(`/admin-marketplace/products/${id}/status`, { status: action }, config);
        alert(`Product ${action}!`);
      } else if (action === 'release') {
        await API.post(`/admin-marketplace/orders/${id}/payout`, {}, config);
        alert("💰 Funds released to Artisan!");
      } else if (action === 'paid') {
        await API.patch(`/admin-marketplace/orders/${id}/status`, { status: 'paid' }, config);
        alert("✅ Order manually confirmed as PAID");
      } else {
        await API.patch(`/admin-marketplace/orders/${id}/status`, { status: action }, config);
        alert(`Status: ${action}`);
      }
      fetchAllData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  return (
    <div className={`min-h-screen p-10 ${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
      
      <div className="flex justify-between items-center mb-10 border-b pb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">System <span className="text-indigo-600">Console</span></h1>
        <nav className="flex gap-8">
          {["orders", "products", "stats"].map(t => (
            <button key={t} onClick={() => {setActiveTab(t); setFilter("all");}} className={`text-[10px] font-black uppercase ${activeTab === t ? "text-indigo-600 underline underline-offset-8" : "text-slate-400"}`}>{t}</button>
          ))}
        </nav>
      </div>

      {activeTab === "stats" && (
        <div className="space-y-12">
          {/* Revenue Summary Section */}
          <div className="flex flex-col md:flex-row gap-12 items-center bg-white dark:bg-slate-800 p-10 rounded-[3rem] border shadow-sm">
            <div className="w-full md:w-1/2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8}>
                    {revenueData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 gap-4">
               <div className="p-6 border-l-4 border-indigo-600 bg-slate-50 dark:bg-slate-900 rounded-r-2xl">
                 <p className="text-[9px] font-black uppercase text-slate-400">In-System Revenue</p>
                 <p className="text-3xl font-black text-indigo-600">{formatKES(revenueData[0].value + revenueData[1].value)}</p>
               </div>
               <div className="p-6 border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-900 rounded-r-2xl">
                 <p className="text-[9px] font-black uppercase text-slate-400">Net Profit (10%)</p>
                 <p className="text-3xl font-black text-emerald-500">{formatKES(revenueData[1].value)}</p>
               </div>
               <div className="p-6 border-l-4 border-blue-400 bg-slate-50 dark:bg-slate-900 rounded-r-2xl">
                 <p className="text-[9px] font-black uppercase text-slate-400">Artisan Payouts (90%)</p>
                 <p className="text-3xl font-black text-blue-400">{formatKES(revenueData[0].value)}</p>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-900 w-fit rounded-2xl border">
              {["all", "shipped", "completed"].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filter === f ? "bg-indigo-600 text-white" : "text-slate-400"}`}>{f}</button>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-800 border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[9px] font-black uppercase opacity-50 bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="p-5">M-Pesa Ref</th>
                    <th className="p-5">Status</th>
                    <th className="p-5">Total</th>
                    <th className="p-5 text-emerald-500">Platform (10%)</th>
                    <th className="p-5">Artisan (90%)</th>
                    <th className="p-5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold">
                  {filteredItems.map(o => (
                    <tr key={o._id}>
                      <td className="p-5 font-mono text-indigo-600">{o.paymentMpesaReceipt || "N/A"}</td>
                      <td className="p-5 italic opacity-60 uppercase">{o.status}</td>
                      <td className="p-5">{formatKES(o.totalAmount)}</td>
                      <td className="p-5 text-emerald-500">+{formatKES(Number(o.totalAmount) * 0.1)}</td>
                      <td className="p-5">+{formatKES(Number(o.totalAmount) * 0.9)}</td>
                      <td className="p-5 opacity-40">{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab !== "stats" && (
        <div className="space-y-6">
          <div className="flex gap-4">
            {(activeTab === "orders" ? ["all", "pending", "shipped", "completed"] : ["all", "pending", "approved", "rejected"]).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase border ${filter === f ? "bg-indigo-600 text-white border-indigo-600" : "text-slate-400 border-slate-200"}`}>{f}</button>
            ))}
          </div>

          <div className="border rounded-[2rem] overflow-hidden bg-white dark:bg-slate-800 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase">
                <tr>
                  {activeTab === "orders" ? (
                    <>
                      <th className="p-6">M-Pesa Ref</th>
                      <th className="p-6">Customer</th>
                      <th className="p-6">Amount</th>
                      <th className="p-6">Status</th>
                      <th className="p-6 text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="p-6">Product</th>
                      <th className="p-6">Artisan</th>
                      <th className="p-6">Price</th>
                      <th className="p-6 text-right">Moderation</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredItems.map(item => (
                  <tr key={item._id}>
                    {activeTab === "orders" ? (
                      <>
                        <td className="p-6 font-mono font-black text-indigo-600">{item.paymentMpesaReceipt || "---"}</td>
                        <td className="p-6 opacity-60 uppercase">{item.customer?.name || "N/A"}</td>
                        <td className="p-6 font-bold">{formatKES(item.totalAmount)}</td>
                        <td className="p-6 text-[9px] font-black uppercase italic opacity-60">{item.status}</td>
                        <td className="p-6 text-right space-x-2">
                          {item.status === 'pending' && (
                            <button onClick={() => handleAction(item._id, 'order', 'paid')} className="border-2 border-emerald-500 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm">Force Paid</button>
                          )}
                          {(item.status === 'shipped' || item.status === 'completed') && item.escrowStatus !== 'released' && (
                            <button onClick={() => handleAction(item._id, 'order', 'release')} className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-md">Release Funds</button>
                          )}
                        </td >
                      </>
                    ) : (
                      <>
                        <td className="p-6 font-black uppercase">{item.name}</td>
                        <td className="p-6 font-bold uppercase opacity-60">{item.artisan?.name}</td>
                        <td className="p-6 font-black text-indigo-600">{formatKES(item.price)}</td>
                        <td className="p-6 text-right space-x-2">
                          <button onClick={() => handleAction(item._id, 'prod', 'approved')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Approve</button>
                          <button onClick={() => handleAction(item._id, 'prod', 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Reject</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMarketplace;