import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
// Import the socket instance you created in services/socket.js
import socket from "../services/socket"; 

function Layout() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // 1. Map Socket ID to User ID
      socket.emit("addUser", user.id || user._id);

      // 2. Listen for the order notification
      socket.on("orderNotification", (data) => {
        alert(`🎉 ${data.message}`); 
      });
    }

    // CLEANUP: Stop listening when the component unmounts
    return () => {
      socket.off("orderNotification");
    };
  }, [user]); // Add user to dependency array

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-64">
        <Topbar />
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;