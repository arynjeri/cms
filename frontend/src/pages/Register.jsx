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

  const validatePhoneNumber = (phone) => {
    const regex = /^(07|01)\d{8}$/;
    return regex.test(phone);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate password
    if (!validatePassword(formData.password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      );
      setLoading(false);
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(formData.phoneNumber)) {
      setError("Phone number must be in format 07xxxxxxxx or 01xxxxxxxx");
      setLoading(false);
      return;
    }

    try {
      const res = await API.post("/auth/register", formData);

      // Save token + user to context
      login(res.data.token);

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/bg-auth.jpg')" }}
    >
      {/* Background Overlay */}
      <div className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-white/30"}`}></div>

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className={`p-8 rounded-2xl shadow-xl border transition-all duration-200 ${
          isDark
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200"
        }`}>

          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🚀</div>
            <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Join CMS
            </h2>
            <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Create your account to get started
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-4 rounded-lg text-sm border ${
              isDark
                ? "bg-red-900 border-red-700 text-red-100"
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              ❌ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                className={`w-full border p-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                className={`w-full border p-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="07xxxxxxxx"
                className={`w-full border p-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
              <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Format: 07xxxxxxxx or 01xxxxxxxx
              </p>
            </div>

            {/* Password with Toggle */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  className={`w-full border p-3 rounded-lg pr-12 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors ${
                    isDark
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Min 8: uppercase, lowercase, number, special char (@$!%*?&)
              </p>
            </div>

            {/* Role */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Account Type
              </label>
              <select
                name="role"
                className={`w-full border p-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                value={formData.role}
                onChange={handleChange}
              >
                <option value="artisan">Artisan (Service Provider)</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full p-3 rounded-lg font-semibold transition-all duration-200 ${
                isDark
                  ? "bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className={`my-6 flex items-center ${isDark ? "text-gray-600" : "text-gray-300"}`}>
            <div className="flex-1 h-px bg-current"></div>
            <span className="px-3 text-sm">Already registered?</span>
            <div className="flex-1 h-px bg-current"></div>
          </div>

          {/* Login Link */}
          <p className={`text-sm text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Have an account?{" "}
            <Link
              to="/login"
              className={`font-semibold transition-colors ${
                isDark
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-indigo-600 hover:text-indigo-700"
              }`}
            >
              Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Register;