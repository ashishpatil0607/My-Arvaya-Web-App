import { api } from "./api";
import { checkOtpResponse } from "./abhaService";
import { ensureFcmToken, getStoredFcmToken } from "./firebase";

const USE_MOCK = false; // Set to false for real API calls

const MOCK_USER = {
  id: "user_1",
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "+91 98765 43210",
};

/* ─── Login ─── */
export async function login(email, password) {
  if (USE_MOCK) {
    return { token: "mock_token_" + Date.now(), user: MOCK_USER };
  }
  const res = await api.post("/user/login", { username: email, password, created_by: 1 });
  let user = res?.UserData || res?.userData || res?.user || res?.data?.user || res?.result?.user || res?.data || res?.result;
  return { token: res.token || res.accessToken || res?.UserData?.token, user };
}

/* ─── Cookie Helpers ─── */
export function getCookie(name) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return "";
}

// cloud_id carries the Firebase Cloud Messaging token used for push notifications
export function getCloudId() {
  return getStoredFcmToken() || getCookie("cloudID") || getCookie("CLOUD_ID") || getCookie("cloud_id") || "";
}

export function getDeviceId() {
  return getCookie("deviceId") || getCookie("DEVICE_ID") || getCookie("device_id") || "";
}

export function getClientId() {
  return getCookie("clientID") || getCookie("CLIENT_ID") || getCookie("client_id") || getCookie("clientKey") || (typeof localStorage !== "undefined" && localStorage.getItem("client_id")) || "1";
}

function getReferredByCode() {
  return getCookie("referred_by_code") || getCookie("referralCode") || getCookie("refCode") || getCookie("referral_code") || (typeof localStorage !== "undefined" && (localStorage.getItem("referred_by_code") || localStorage.getItem("referral_code"))) || "";
}

/* ─── Register ─── */
export async function register(data) {
  if (USE_MOCK) {
    return {
      token: "mock_token_" + Date.now(),
      user: { ...MOCK_USER, name: data.name || `${data.title || ''}${data.first_name || ''} ${data.last_name || ''}`.trim(), phone: data.mobile_number },
    };
  }

  let genderCode = data.gender || "M";
  if (genderCode.toLowerCase().startsWith("m")) genderCode = "M";
  else if (genderCode.toLowerCase().startsWith("f")) genderCode = "F";
  else if (genderCode.toLowerCase().startsWith("o")) genderCode = "O";

  const fullName = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim();

  const payload = {
    title: data.title,
    name: fullName,
    gender: genderCode,
    date_of_birth: data.date_of_birth || data.dob,
    mobile_number: data.mobile_number || data.phone || data.mobile,
    blood_group: data.blood_group || "B+",
    cloud_id: data.cloud_id || getCloudId(),
    device_id: data.device_id || getDeviceId(),
    client_id: data.client_id || getClientId(),
    entitylocation: data.entitylocation,
    entitykey: 'secure-hospitals',
    referred_by_code: data.referred_by_code || getReferredByCode(),
  };

  const res = await api.post("/appUser/register", payload);
  const token = res?.token || res?.accessToken || res?.data?.token || res?.result?.token || res?.UserData?.token || "token_" + Date.now();
  let user = res?.user || res?.UserData || res?.data?.user || res?.result?.user || res?.data || res?.result || { name: fullName, phone: payload.mobile_number };
  return { token, user, ...res };
}

/* ─── Send OTP ─── */
export async function sendOtp(mobile, clientId) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    return { success: true, message: `OTP sent to ${mobile}`, is_registered: true };
  }
  return api.post("/user/sendOtp", {
    mobile_number: mobile,
    client_id: clientId || getClientId()
  });
}
/* ─── Verify OTP ─── */
export async function verifyOtp(otp, mobile, options = {}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    return {
      token: "mock_token_" + Date.now(),
      user: { ...MOCK_USER, phone: mobile ? `+91 ${mobile}` : MOCK_USER.phone }
    };
  }
  const clientId = typeof options === "string" ? options : options?.clientId;
  await ensureFcmToken();
  const cloudId = options?.cloudId || options?.cloud_id || getCloudId();
  const referredByCode = options?.referredByCode || options?.referred_by_code || getReferredByCode();

  const payload = {
    otp,
    mobile_number: mobile,
    client_id: clientId || getClientId(),
    cloud_id: cloudId,
    referred_by_code: referredByCode,
  };

  const res = await api.post("/user/verifyOtp", payload);
  checkOtpResponse(res);

  const token = res?.token || res?.accessToken || res?.data?.token || res?.result?.token || res?.UserData?.token || res?.UserData?.accessToken || res?.jwt || "token_" + Date.now();

  let rawUser = res?.UserData || res?.userData || res?.user || res?.data?.user || res?.result?.user || res?.data || res?.result;
  if (!rawUser || typeof rawUser !== "object") {
    rawUser = {};
  }

  const firstProfile =
    Array.isArray(rawUser?.profiles) && rawUser.profiles.length > 0
      ? rawUser.profiles[0]
      : null;

  let derivedName =
    rawUser?.name ||
    rawUser?.full_name ||
    rawUser?.fullName ||
    rawUser?.user_name ||
    rawUser?.userName ||
    firstProfile?.name ||
    firstProfile?.full_name;

  if (!derivedName || derivedName === "User" || derivedName.startsWith("User (")) {
    const firstName =
      rawUser?.first_name ||
      rawUser?.firstName ||
      firstProfile?.first_name ||
      firstProfile?.firstName ||
      "";
    const lastName =
      rawUser?.last_name ||
      rawUser?.lastName ||
      firstProfile?.last_name ||
      firstProfile?.lastName ||
      "";
    if (firstName || lastName) {
      const rawTitle = rawUser?.title || firstProfile?.title || "";
      const title = rawTitle ? rawTitle.trim() + " " : "";
      derivedName = `${title}${firstName} ${lastName}`.trim();
    }
  }
  if (!derivedName || derivedName.startsWith("User (")) {
    derivedName = "User";
  }
  derivedName = derivedName.replace(/\.\./g, ".");

  const user = {
    ...rawUser,
    name: derivedName,
    phone: rawUser?.mobile_number || rawUser?.phone || rawUser?.mobile || mobile
  };

  return {
    token,
    user,
    ...res
  };
}

/* ─── Select Profile ─── */
export async function selectProfile(data) {
  if (USE_MOCK) {
    return {
      code: 200,
      message: "SUCCESS",
      UserData: {
        id: data.user_id,
        external_id: data.external_id,
        mobile_number: data.mobile_number,
      }
    };
  }
  const payload = {
    user_id: data.user_id,
    mobile_number: data.mobile_number || data.phone || "",
    is_notification_on: data.is_notification_on !== undefined ? data.is_notification_on : 1,
    cloud_id: data.cloud_id || getCloudId(),
    device_id: data.device_id || getDeviceId(),
    external_id: data.external_id !== undefined ? data.external_id : "",
    referred_by_code: data.referred_by_code !== undefined ? data.referred_by_code : (getReferredByCode() || null),
  };

  const res = await api.post("/user/selectProfile", payload);
  return res;
}


/* ─── Forgot Password ─── */
export async function forgotPassword(email) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/user/forgetPasswordAdmin", { email });
}

/* ─── Change Password ─── */
export async function changePassword(data) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/user/changePassword", data);
}

/* ─── Get Profile ─── */
export async function getProfile() {
  if (USE_MOCK) return MOCK_USER;
  const res = await api.post("/api/user/get", {});
  return res.user || res.data || res;
}

/* ─── Update Profile ─── */
export async function updateProfile(data) {
  if (USE_MOCK) return { ...MOCK_USER, ...data };
  return api.put("/api/user/update", data);
}

/* ─── Logout ─── */
export async function logout(currentUser) {
  if (USE_MOCK) return { success: true };

  let appUserId = currentUser?.app_user_id || currentUser?.id || currentUser?.user_id || currentUser?.patient_id || currentUser?.userKey;
  if (!appUserId) {
    try {
      const savedUser = localStorage.getItem("arvaya_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        appUserId = parsed?.app_user_id || parsed?.id || parsed?.user_id || parsed?.patient_id || parsed?.userKey;
      }
    } catch (e) { }
  }

  const payload = {
    app_user_id: appUserId || ""
  };

  try {
    const res = await api.post("/api/appUser/logout", payload);
    return res;
  } catch (e) {
    console.error("Error triggering api/appUser/logout:", e);
    return null;
  }
}

