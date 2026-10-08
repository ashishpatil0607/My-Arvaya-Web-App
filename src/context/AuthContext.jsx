import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authService from "../services/authService";
import { getPatients } from "../services/dataService";
import Toast from "../components/common/Toast";
import { removeFcmToken } from "../services/firebase";

function setCookie(name, value, days = 365) {
  if (typeof document === "undefined" || !value) return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return "";
}

function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=-99999999; path=/;`;
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("arvaya_user");
    try {
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getCookie("token") || localStorage.getItem("token") || localStorage.getItem("arvaya_token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const [loginMethod, setLoginMethod] = useState(() => localStorage.getItem("arvaya_login_method") || "user_verify_otp");
  const [loginModalScreen, setLoginModalScreen] = useState("landing");
  const [loginModalExtraState, setLoginModalExtraState] = useState({});
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });

  const [linkedProfiles, setLinkedProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem("arvaya_linked_profiles");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });


  // options: { title, duration } - title renders bold above the message
  const showToast = useCallback((message, type = "success", options = {}) => {
    setToast({ id: Date.now(), isOpen: true, message, type, title: options.title, duration: options.duration });
  }, []);

  async function fetchUserProfile(currentUser) {
    if (!currentUser) return;
    try {
      const storedUser = localStorage.getItem("arvaya_user");
      let storedUserId = currentUser?.id || currentUser?.user_id || currentUser?.app_user_id;
      if (!storedUserId && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          storedUserId = parsed?.id || parsed?.user_id || parsed?.app_user_id;
        } catch (e) {}
      }

      const mobile = currentUser.phone || currentUser.mobile_number || currentUser.mobile;
      const filters = [
        ...(storedUserId ? [{ column: "id", operator: "=", value: storedUserId }] : []),
        ...(mobile ? [{ column: "mobile_number", operator: "=", value: mobile }] : [])
      ];
      const res = await getPatients(filters);
      
      let patientData = null;
      if (Array.isArray(res) && res.length > 0) {
        patientData = res.find(p => String(p.id || p.user_id || p.app_user_id) === String(storedUserId)) 
          || res.find(p => (p.mobile_number || p.phone || p.mobile) === mobile) 
          || res[0];
      } else if (res && typeof res === "object" && !Array.isArray(res) && (res.name || res.full_name || res.first_name || res.mobile_number || res.phone || res.id || res.user_id)) {
        patientData = res;
      }

      if (patientData) {
        let fullName = patientData.name || patientData.full_name || patientData.fullName || patientData.user_name;
        if (!fullName && (patientData.first_name || patientData.last_name)) {
          const title = patientData.title ? patientData.title.trim() + " " : "";
          fullName = `${title}${patientData.first_name || ""} ${patientData.last_name || ""}`.trim();
        }
        
        const phone = patientData.mobile_number || patientData.phone || patientData.mobile || patientData.mobile_no || mobile;

        let rawGender = patientData.gender || currentUser.gender;
        let formattedGender = rawGender;
        if (rawGender) {
          const code = String(rawGender).trim().toUpperCase();
          if (code === "F" || code.startsWith("FEMALE")) formattedGender = "Female";
          else if (code === "M" || code.startsWith("MALE")) formattedGender = "Male";
          else if (code === "O" || code.startsWith("OTHER")) formattedGender = "Other";
        }

        const updatedUser = {
          ...currentUser,
          ...patientData,
          name: (fullName || currentUser.name || "").replace(/\.\./g, "."),
          phone: phone || currentUser.phone,
          gender: formattedGender
        };

        setUser(updatedUser);
        localStorage.setItem("arvaya_user", JSON.stringify(updatedUser));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("arvaya_profile_updated"));
        }
      }
    } catch (err) {
      console.error("fetchUserProfile error:", err);
    }
  }

  function openLoginModal(redirectPath = null, screen = "landing", extraState = {}) {
    if (redirectPath) setPendingRedirect(redirectPath);
    setLoginModalScreen(screen);
    setLoginModalExtraState(extraState);
    setLoginModalOpen(true);
  }

  function closeLoginModal() {
    setLoginModalOpen(false);
    setTimeout(() => {
      setPendingRedirect(null);
      setLoginModalScreen("landing");
      setLoginModalExtraState({});
    }, 300); // clear after animation
  }

  function saveSession(data, notify = true) {
    if (data.loginMethod) {
      localStorage.setItem("arvaya_login_method", data.loginMethod);
      setLoginMethod(data.loginMethod);
      if (data.loginMethod === "user_verify_otp") {
        localStorage.setItem("arvaya_abha_linked", "false");
        localStorage.removeItem("abha_user_token");
        localStorage.removeItem("abha_token");
        localStorage.removeItem("abha_profile_token");
      }
    }

    if (data.token) {
      localStorage.setItem("token", data.token);
      setCookie("token", data.token);
      deleteCookie("arvaya_token");
      localStorage.removeItem("arvaya_token");
    }

    let resolvedUser = data.user;
    if (resolvedUser && typeof resolvedUser === "object") {
      let derivedName = resolvedUser.name || resolvedUser.full_name || resolvedUser.fullName || resolvedUser.user_name || resolvedUser.userName;
      if (!derivedName || derivedName === "User" || derivedName.startsWith("User (")) {
        const firstName = resolvedUser.first_name || resolvedUser.firstName || "";
        const lastName = resolvedUser.last_name || resolvedUser.lastName || "";
        if (firstName || lastName) {
          const title = resolvedUser.title ? resolvedUser.title.trim() + " " : "";
          derivedName = `${title}${firstName} ${lastName}`.trim();
        }
      }
      if (derivedName) {
        resolvedUser = { ...resolvedUser, name: derivedName.replace(/\.\./g, ".") };
      }
    }

    if (resolvedUser) {
      localStorage.setItem("arvaya_user", JSON.stringify(resolvedUser));
    }
    setToken(data.token);
    setUser(resolvedUser);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("arvaya_profile_updated"));
    }

    if (resolvedUser) {
      fetchUserProfile(resolvedUser);
    }

    if (notify) {
      showToast("Logged in successfully!", "success");
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserProfile(user);
    }
  }, []);

  async function login(email, password) {
    setLoading(true);
    setError("");
    try {
      const data = await authService.login(email, password);
      saveSession(data);
      return true;
    } catch (e) {
      const msg = e.message || "Login failed";
      setError(msg);
      showToast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function register(formData) {
    setLoading(true);
    setError("");
    try {
      const data = await authService.register(formData);
      saveSession(data);
      return true;
    } catch (e) {
      const msg = e.message || "Registration failed";
      setError(msg);
      showToast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authService.logout(user);
    } catch (e) {
      console.error("Logout API error:", e);
    } finally {
      removeFcmToken();
      localStorage.removeItem("token");
      localStorage.removeItem("arvaya_token");
      localStorage.removeItem("arvaya_user");
      localStorage.removeItem("arvaya_login_method");
      localStorage.removeItem("abha_user_token");
      localStorage.removeItem("abha_token");
      localStorage.removeItem("arvaya_linked_profiles");      
      deleteCookie("token");
      deleteCookie("arvaya_token");
      setToken(null);
      setUser(null);
      setLinkedProfiles([]);
      setLoginMethod("user_verify_otp");
      showToast("Logged out successfully!", "success");
    }
  }

  async function switchProfile(targetProfile) {
    if (!targetProfile) return false;
    setLoading(true);
    try {
      const mobile = targetProfile.mobile_number || targetProfile.phone || user?.phone || user?.mobile_number || "";
      const selectPayload = {
        user_id: targetProfile.id,
        mobile_number: mobile,
        is_notification_on: 1,
        cloud_id: authService.getCloudId ? authService.getCloudId() : "",
        device_id: authService.getDeviceId ? authService.getDeviceId() : "",
        external_id: targetProfile.external_id || "",
        referred_by_code: null,
      };
 
      let res = null;
      try {
        res = await authService.selectProfile(selectPayload);
      } catch (err) {
        console.warn("selectProfile API warning:", err);
      }
 
      const newToken = res?.token || res?.accessToken || token;
      let derivedName = targetProfile.name || res?.UserData?.name || "User";
      derivedName = derivedName.replace(/\.\./g, ".");
 
      const updatedUser = {
        ...user,
        ...res?.UserData,
        ...targetProfile,
        id: targetProfile.id,
        user_id: targetProfile.id,
        app_user_id: targetProfile.id,
        name: derivedName,
        external_id: targetProfile.external_id || null,
        phone: mobile,
        mobile_number: mobile,
      };
 
      saveSession({ token: newToken, user: updatedUser, loginMethod: "user_verify_otp" }, false);
      showToast(`Switched account to ${derivedName}`, "success");
      return true;
    } catch (e) {
      const msg = e.message || "Failed to switch account";
      showToast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }
 

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, error, 
      login, register, logout, setError,
      isLoginModalOpen, pendingRedirect, openLoginModal, closeLoginModal,
      saveSession, loginMethod, setLoginMethod, loginModalScreen, loginModalExtraState,
      showToast, linkedProfiles, setLinkedProfiles, switchProfile
    }}>
      {children}
      <Toast
        key={toast.id}
        isOpen={toast.isOpen}
        title={toast.title}
        message={toast.message}
        duration={toast.duration}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
