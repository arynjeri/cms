import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, Link } from "react-router-dom"; // Added Link

function Topbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`flex justify-between items-center sticky top-0 z-30 px-8 py-4 transition-colors duration-200 border-b ${
        isDark
          ? "bg-gray-800 border-gray-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      <div>
        <h2 className="text-xl font-bold">Welcome Back</h2>
        {/* Username and Role appearing together */}
        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
          {user.name} <span className="mx-2 opacity-30 text-slate-400">|</span> {user.role}
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors duration-200 ${
            isDark
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
          title="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        {/* User Menu / Profile Icon linked to Edit Page */}
        <Link 
          to="/profile-edit" 
          className="group flex items-center gap-4 cursor-pointer"
          title="Edit Profile"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white overflow-hidden transition-transform group-hover:scale-110 ${
            isDark ? "bg-indigo-600" : "bg-indigo-500"
          }`}>
            {user.profilePic ? (
              <img 
                src={`http://localhost:5000${user.profilePic}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'; // Hide if image fails
                }}
              />
            ) : (
              <span>{user.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 text-xs font-bold uppercase tracking-widest ${
            isDark
              ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Topbar;