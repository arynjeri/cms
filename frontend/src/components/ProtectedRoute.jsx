import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  // no redirect while we are still checking the token!
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default ProtectedRoute;