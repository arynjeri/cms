/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "artisan"
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pwd);
  };

  const validateEmail = (email) => {
    return email.toLowerCase().endsWith("@gmail.com");
  };

  const validatePhoneNumber = (phone) => {
    // Allows 07..., 01..., or 254... for the UI, backend will sanitize
    const regex = /^(?:254|0)(1|7)\d{8}$/;
    return regex.test(phone);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!validateEmail(formData.email)) {
      setError("Only official @gmail.com accounts are permitted.");
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError("Password must include uppercase, lowercase, number, and special character.");
      setLoading(false);
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      setError("Please enter a valid Kenyan phone number (e.g., 07xxxxxxxx).");
      setLoading(false);
      return;
    }

    try {
      const res = await API.post("/auth/register", formData);
      login(res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url('/bg-auth.jpg')" }}>
      <div className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-white/30"}`}></div>
      <div className="w-full max-w-md mx-4 relative z-10">
        <div className={`p-8 rounded-2xl shadow-xl border transition-all duration-200 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🚀</div>
            <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Join CMS</h2>
            <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Use your Gmail and M-Pesa number</p>
          </div>

          {error && <div className={`mb-4 p-4 rounded-lg text-sm border ${isDark ? "bg-red-900 border-red-700 text-red-100" : "bg-red-50 border-red-200 text-red-600"}`}>❌ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" placeholder="Full Name" className={inputStyle(isDark)} value={formData.name} onChange={handleChange} required />
            <input type="email" name="email" placeholder="name@gmail.com" className={inputStyle(isDark)} value={formData.email} onChange={handleChange} required />
            <input type="tel" name="phoneNumber" placeholder="07xxxxxxxx" className={inputStyle(isDark)} value={formData.phoneNumber} onChange={handleChange} required />
            
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" className={inputStyle(isDark)} value={formData.password} onChange={handleChange} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500 uppercase">{showPassword ? "Hide" : "Show"}</button>
            </div>

            <select name="role" className={inputStyle(isDark)} value={formData.role} onChange={handleChange}>
              <option value="artisan">Artisan (Service Provider)</option>
              <option value="customer">Customer</option>
            </select>

            <button type="submit" disabled={loading} className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className={`text-xs text-center mt-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Already have an account? <Link to="/login" className="text-indigo-500 font-bold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = (isDark) => `w-full border p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`;

export default Register;