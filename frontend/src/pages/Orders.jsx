/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const formatKES = (value) => (value ? `KSH ${Number(value).toLocaleString("en-KE")}` : "KSH 0");

function Orders() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/customer/orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <div>Loading orders...</div>;
  if (!orders.length) return <div>You have no orders yet</div>;

  return (
    <div className={`min-h-screen p-8 ${isDark ? "bg-slate-900 text-white" : "bg-[#FDFCFB] text-gray-900"}`}>
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order._id} className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <h2 className="font-bold">Order ID: {order._id}</h2>
              <p>Status: {order.status}</p>
              <p>Total: {formatKES(order.total)}</p>
            </div>
            {order.status === "pending" && (
              <button onClick={() => navigate(`/payments/${order._id}`)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Pay</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Orders;