import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BadgeIndianRupee, FileHeart, FlaskConical, Home as HomeIcon, UserRound } from "lucide-react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./components/common/ScrollToTop";
import { useAuth } from "./context/AuthContext";
import ChatBot from "./components/chatbot/ChatBot";
import PushNotifications from "./components/common/PushNotifications";
import Login from "./pages/Login";
import FeedbackModal from "./components/FeedbackModal";

export default function App() {
  const { user, openLoginModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.authRequired) {
      openLoginModal(location.state.from);
      // Clear state so it doesn't trigger again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  return (
    <div className="arvaya-app-shell">
      <ScrollToTop />
      <Header />
      <div className="arvaya-app-content">
        <AppRoutes />
      </div>
      <Footer />
      <ChatBot />
      <PushNotifications />
      {/* Kept outside the route tree so auth can open above any workspace page. */}
      <Login modalHost />
      <FeedbackModal />
    </div>
  );
}
