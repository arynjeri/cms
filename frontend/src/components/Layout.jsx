import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useTheme } from "../context/ThemeContext";

function Layout() {
  const { isDark } = useTheme();

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