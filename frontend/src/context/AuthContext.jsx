/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

// Helper function to validate token payload
const isValidToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    // Ensure token has required fields
    return decoded.id || decoded._id;
  } catch {
    return false;
  }
};

// 1. Keep this internal (not exported) to satisfy the "only-export-components" rule
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (token && !isTokenExpired(token) && isValidToken(token)) {
      try {
        return jwtDecode(token);
      } catch {
        localStorage.removeItem("token");
        return null;
      }
    } else {
      localStorage.removeItem("token");
      return null;
    }
  });

  const [loading] = useState(false);

  // Token validation effect - check periodically
  useEffect(() => {
    const checkTokenValidity = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token || isTokenExpired(token) || !isValidToken(token)) {
        console.warn("Token expired or invalid, logging out");
        localStorage.removeItem("token");
        setUser(null);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTokenValidity);
  }, []);

  const login = (token) => {
    if (!token) return;
    
    if (isTokenExpired(token)) {
      console.error("Cannot login with expired token");
      return;
    }
    
    localStorage.setItem("token", token);
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      console.error("Login decode failed", err);
      localStorage.removeItem("token");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 2. Export the hook from here. 
// If Vite still complains, move this function to a file named useAuth.js
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};