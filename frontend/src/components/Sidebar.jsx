import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

function Sidebar() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!user) return null;

  const role = user.role;

  const isActive = (path) => location.pathname.includes(path);

  const menuItems = [
    { path: "/dashboard", label: "📊 Dashboard", show: true },
    { path: "/inventory", label: "📦 Inventory", show: role === "artisan" },
    { path: "/projects", label: "🎯 Projects", show: role === "artisan" },
    { path: "/chat", label: "💬 Messages", show: role === "artisan" },
    { path: "/users", label: "👥 Manage Users", show: role === "admin" },
    { path: "/marketplace", label: "🛍️ Marketplace", show: role==="artisan" || role === "admin" },
     // Customer-specific links
     {path: "/customer-marketplace", label: "🛍️ Marketplace", show: role === "customer" },
    { path: "/orders", label: "🛒 My Orders", show: role === "customer" },
    { path: "/cart", label: "🛍️ Cart", show: role === "customer" },
    {path: "/chat", label: "💬 Chat", show: role === "customer" },
];
  


  const NavLink = ({ to, label, active }) => (
    <Link
      to={to}
      className={`px-4 py-3 rounded-lg transition-all duration-200 ${
        active
          ? isDark
            ? "bg-indigo-600 text-white"
            : "bg-indigo-100 text-indigo-700"
          : isDark
          ? "text-gray-300 hover:bg-gray-700"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );

  const sidebarContent = (
    <>
      <div className="mb-10">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-indigo-700"}`}>
          ✨ CMS
        </h1>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Role: <span className="font-semibold capitalize">{role}</span>
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map(
          (item) =>
            item.show && (
              <NavLink
                key={item.path}
                to={item.path}
                label={item.label}
                active={isActive(item.path)}
              />
            )
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg ${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-700"
        }`}
      >
        ☰
      </button>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col p-6 transition-colors duration-200 border-r ${
          isDark
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-screen w-64 flex flex-col p-6 ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;