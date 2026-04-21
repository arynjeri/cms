/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        ...formData,
        email: formData.email.toLowerCase() // Force lowercase for matching
      });
      login(res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url('/bg-auth.jpg')" }}>
      <div className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-white/30"}`}></div>
      <div className="w-full max-w-md mx-4 relative z-10">
        <div className={`p-10 rounded-[2.5rem] shadow-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">✨</div>
            <h2 className={`text-3xl font-bold italic tracking-tighter ${isDark ? "text-white" : "text-gray-900"}`}>Welcome Back</h2>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold text-center">❌ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="email" name="email" placeholder="Gmail Address" className={inputStyle(isDark)} value={formData.email} onChange={handleChange} required />
            
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" className={inputStyle(isDark)} value={formData.password} onChange={handleChange} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-500">{showPassword ? "Hide" : "Show"}</button>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all">
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          <p className={`text-xs text-center mt-10 font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            New to CMS? <Link to="/register" className="text-indigo-500 font-bold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = (isDark) => `w-full border-2 p-5 rounded-2xl outline-none transition-all font-bold ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-50 text-gray-900 focus:bg-white focus:border-indigo-100"}`;

export default Login;