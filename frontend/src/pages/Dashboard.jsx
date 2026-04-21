/* eslint-disable react-hooks/exhaustive-deps */
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const compactNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  const num = Number(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

function Dashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    inventoryCount: 0,
    projectsCount: 0,
    publishedCount: 0,
    adminUsers: 0,
    totalItems: 0,
    messagesCount: 0,
    ordersCount: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await API.get('/users/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };
  fetchStats();
}, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("Fetching stats for user role:", user.role);
      
      // Get message count for all roles
      const msgRes = await API.get("/chat/count/conversations").catch(() => ({ data: { count: 0 } }));
      
      if (user.role === "artisan") {
        const invRes = await API.get("/inventory").catch(() => ({ data: [] }));
        const prodRes = await API.get("/products").catch(() => ({ data: [] }));
        const orderRes = await API.get("/customer/orders/count/seller-orders").catch(() => ({ data: { count: 0 } }));
        
        // Filter the products locally before setting the stats
         const myProducts = prodRes.data.filter(p => 
  (p.artisan === user.id || p.artisan?._id === user.id || p.artisan === user._id)
        );

         setStats({
           inventoryCount: invRes.data.length,
            projectsCount: myProducts.filter(proj => proj.status !== "completed").length,
            publishedCount: myProducts.filter(p => p.status === "approved").length,
            adminUsers: 0,
            totalItems: 0,
            messagesCount: msgRes.data.count,
            ordersCount: orderRes.data.count,
            totalRevenue: 0
});   
      } else if (user.role === "admin") {
        const usersRes = await API.get("/users").catch(() => ({ data: [] }));
        const prodRes = await API.get("/admin-marketplace/products").catch(() => ({ data: [] }));
        const statsRes = await API.get("/admin-marketplace/stats").catch(() => ({ data: { totalRevenue: 0 } }));
        
        const artisanCount = usersRes.data.filter(u => u.role === "artisan").length;
        const totalUserCount =usersRes.data.length;

        setStats({
          inventoryCount: 0,
          projectsCount: prodRes.data.filter(proj => proj.status !== "completed").length, // You would need to calculate this based on your data
          publishedCount: prodRes.data.filter(p => p.status === "approved").length,
          adminUsers: artisanCount,
          totalItems: totalUserCount,
          messagesCount: msgRes.data.count,
          ordersCount: 0,
          totalRevenue: statsRes.data.totalRevenue || 0
        });
      } else if (user.role === "customer") {
    const ordersRes = await API.get("/customer/orders").catch(() => ({ data: [] }));
    
    // 🔥 FILTER: Only count completed orders in the dashboard stat card
    const completedCount = ordersRes.data.filter(o => o.status === "completed" || o.status === "delivered").length;

    setStats({
      ...stats,
      messagesCount: msgRes.data.count,
      ordersCount: completedCount, // Only shows finished business
    });
}
      setError("");
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className={isDark ? "text-gray-400" : "text-gray-500"}>Loading dashboard...</p>
      </div>
    );
  }

  const role = user.role;

  const StatCard = ({ icon, label, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={`p-6 rounded-lg border transition-all duration-200 cursor-pointer transform hover:scale-105 ${
        isDark
          ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
          : "bg-white border-gray-200 hover:shadow-lg"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {label}
          </p>
          <p className="text-3xl font-bold mt-2">{loading ? "--" : compactNumber(value)}</p>
        </div>
        <div className={`text-3xl ${color}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {error && (
        <div
          className={`p-4 rounded-lg border ${
            isDark
              ? "bg-red-900 border-red-700 text-red-100"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {error}
        </div>
      )}

      {/* Header */}

      {/* ADMIN DASHBOARD */}
      {role === "admin" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold">📊 System Overview</h3>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>System-wide statistics and management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon="👥"
              label="Active Artisans"
              value={stats.adminUsers}
              color="text-blue-500"
              onClick={() => navigate("/users?role=artisan")}
            />
            <StatCard
              icon="📈"
              label="Total Users"
              value={stats.totalItems}
              color="text-green-500"
              onClick={() => navigate("/users")}
            />
            <StatCard
              icon="🛍️"
              label="Live Products"
              value={stats.publishedCount}
              color="text-purple-500"
              onClick={() => navigate("/admin-marketplace")}
            />
            <StatCard
              icon="💸"
              label="Total Revenue"
              value={stats.totalRevenue}
              color="text-green-500"
              onClick={() => navigate("/admin-marketplace")}
            />
          </div>

          <div
            className={`p-6 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h3 className="text-xl font-bold mb-4">🔧 Admin Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate("/users")}
                className={`p-4 rounded-lg transition-colors duration-200 ${
                  isDark
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-indigo-500 hover:bg-indigo-600"
                } text-white font-medium`}
              >
                👥 Manage Users Accounts
              </button>
              <button
                onClick={() => navigate("/admin-marketplace")}
                className={`p-4 rounded-lg transition-colors duration-200 ${
                  isDark
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-500 hover:bg-green-600"
                } text-white font-medium`}
              >
                🛍️ Moderate Marketplace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTISAN DASHBOARD */}
      {role === "artisan" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold">🎨 Artisan Overview</h3>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>Your inventory and products at a glance</p>
          </div>
         {/* <div className="stat-card">
                <h4>Active Orders</h4>
              <p className="text-2xl font-black">{stats.ordersCount || 0}</p>
            </div>
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon="📦"
              label="My Inventory Items"
              value={stats.inventoryCount}
              color="text-blue-500"
              onClick={() => navigate("/inventory")}
            />
            <StatCard
              icon="🎯"
              label="Active Projects"
              value={stats.projectsCount}
              color="text-orange-500"
              onClick={() => navigate("/projects")}
            />
            <StatCard
            icon="💬"
            label="Messages"
            value={stats.messagesCount || 0}
            color="text-yellow-500"
            onClick={() => navigate("/chat")}
          />
          <StatCard
            icon="🛍️"
            label="Approved Products"
            value={stats.publishedCount}
            color="text-green-500"
              onClick={() => navigate("/marketplace")}
            />
          </div>

          <div
            className={`p-6 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h3 className="text-xl font-bold mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/inventory")}
                className={`p-4 rounded-lg transition-colors duration-200 ${
                  isDark
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white font-medium`}
              >
                + Add Inventory
              </button>
              <button
                onClick={() => navigate("/projects")}
                className={`p-4 rounded-lg transition-colors duration-200 ${
                  isDark
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-orange-500 hover:bg-orange-600"
                } text-white font-medium`}
              >
                + New Project
              </button>
              <button
                onClick={() => navigate("/marketplace")}
                className={`p-4 rounded-lg transition-colors duration-200 ${
                  isDark
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-500 hover:bg-green-600"
                } text-white font-medium`}
              >
                🛍️ My Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DASHBOARD */}
      {role === "customer" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold">🛍️ Customer Dashboard</h3>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>View your orders and saved products</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              icon="🛒"
              label="My Orders"
              value={stats.ordersCount}
              color="text-blue-500"
              onClick={() => navigate("/orders")}
            />
            <StatCard
              icon="💬"
              label="Chat"
              value={stats.messagesCount}
              color="text-yellow-500"
              onClick={() => navigate("/chat")}
            />
          
          </div>
           
          <div
            className={`p-6 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h3 className="text-xl font-bold mb-4">🎯 Explore</h3>
            <button
              onClick={() => navigate("/customer-marketplace")}
              className={`w-full p-4 rounded-lg transition-colors duration-200 ${
                isDark
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-indigo-500 hover:bg-indigo-600"
              } text-white font-medium`}
            >
              🔍 Browse Marketplace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;