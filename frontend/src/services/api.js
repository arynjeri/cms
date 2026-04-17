import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: false
});

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

// Add token to all requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    
    // If token exists and is not expired, add it
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      // Token is expired, remove it
      localStorage.removeItem("token");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors - unauthorized/expired token
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      console.warn("Unauthorized - token invalid or expired");
      localStorage.removeItem("token");
      
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;