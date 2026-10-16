import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  // Send guests home and let App open the login modal (handled via authRequired state)
  if (!user) return <Navigate to="/" state={{ authRequired: true, from: location.pathname }} replace />;
  return children;
}
