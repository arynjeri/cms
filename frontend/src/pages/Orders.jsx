/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const formatKES = (v) => `KSH ${Number(v || 0).toLocaleString("en-KE")}`;

function Orders() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/customer/orders");
      setOrders(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // 🔥 LOGIC: Split orders so Active items "disappear" into Archive
  const activeOrders = useMemo(() => 
    orders.filter(o => ["pending", "paid", "shipped"].includes(o.status)), 
  [orders]);

  const completedArchive = useMemo(() => 
    orders.filter(o => ["delivered", "completed"].includes(o.status)), 
  [orders]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-[10px]">Syncing Archive...</div>;

  return (
    <div className={`min-h-screen p-8 md:p-16 ${isDark ? "bg-slate-950 text-white" : "bg-[#FDFCFB] text-slate-900"}`}>
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* SECTION: ACTIVE ORDERS */}
        <section>
          <header className="mb-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Current <span className="text-indigo-600">Trackings</span></h1>
            <p className="text-[9px] font-black uppercase opacity-40 tracking-[0.2em]">Items currently in transit or awaiting payment</p>
          </header>

          <div className="space-y-4">
            {activeOrders.map(order => (
              <div key={order._id} className={`p-6 rounded-[2rem] border-2 flex justify-between items-center ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"}`}>
                <div className="flex gap-6 items-center">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600 font-bold text-xs">#</div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40">{order.transactionCode || order._id.slice(-8)}</p>
                    <p className="text-lg font-black">{formatKES(order.totalAmount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase">{order.status}</span>
                  {order.status === "pending" && (
                    <button onClick={() => navigate(`/payments/${order._id}`)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase">Pay Now</button>
                  )}
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed rounded-[2rem] opacity-20 font-serif italic">No active trackings.</div>
            )}
          </div>
        </section>

        {/* SECTION: SUCCESSFUL ARCHIVE */}
        {completedArchive.length > 0 && (
          <section className="pt-12 border-t border-dashed">
            <header className="mb-8">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase opacity-60 text-emerald-600">Purchase <span className="text-slate-400">Vault</span></h2>
              <p className="text-[9px] font-black uppercase opacity-30 tracking-[0.2em]">Successful purchases</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedArchive.map(order => (
                <div key={order._id} className={`p-5 rounded-2xl border flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <p className="text-[8px] font-black opacity-40 uppercase mb-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="font-bold text-xs uppercase tracking-tighter">{order.transactionCode}</p>
                  </div>
                  <p className="font-black text-emerald-600 text-sm">{formatKES(order.totalAmount)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Orders;