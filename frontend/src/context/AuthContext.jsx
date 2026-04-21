/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

// 1. Create the context internally
const AuthContext = createContext(null);

// 2. Export the Provider (Vite likes this as a named export)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Basic check: is token expired?
        if (decoded.exp < Date.now() / 1000) {
          localStorage.removeItem("token");
          return null;
        }
        return decoded;
      } catch {
        localStorage.removeItem("token");
        return null;
      }
    }
    return null;
  });

  // Function to sync with real DB data (Real Gmail/Balance)
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      // Direct axios call to avoid circular dependency with your api.js
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error("User refresh failed - check your profile route");
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    const decoded = jwtDecode(token);
    setUser(decoded);
    refreshUser(); 
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Export the hook (Vite is fine with this alongside the Provider)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};