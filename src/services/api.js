const BASE = import.meta.env.VITE_API_BASE_URL || "https://p8rhkmb7-8867.inc1.devtunnels.ms/";

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return "";
}

function getToken() {
  return (
    getCookie("token") ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
    ""
  );
}

async function request(method, path, body, customHeaders = {}, fetchOptions = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {
    // testing
    "apikey": "JP76Ol1r5lMvzljKmeaTdP9EthTYzKFH",
    "applicationkey": "Xkit6MeT1Et4ZA2N",

    // local 
    // "apikey": "hLLSzt9IolCXGcdVbHUF5q0r52NaBOHb",
    // "applicationkey": "OXaAGQqANmAPsHz",
    ...customHeaders
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token && !headers["Authorization"]) {
    headers["token"] = token;
    headers["Authorization"] = `Bearer ${token}`;
    headers["authorization"] = token;
  }

  const isAbsolute = path.startsWith("http://") || path.startsWith("https://");
  const cleanBase = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = isAbsolute ? path : `${cleanBase}/${cleanPath}`;

  const res = await fetch(url, {
    ...fetchOptions,
    method,
    headers,
    body: isFormData ? body : (body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined),
  });

  if (res.status === 401) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("arvaya_token");
      localStorage.removeItem("arvaya_user");
    }
    if (typeof document !== "undefined") {
      document.cookie = "token=; Max-Age=-99999999; path=/;";
      document.cookie = "arvaya_token=; Max-Age=-99999999; path=/;";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let errData;
    try {
      errData = await res.json();
    } catch {
      try {
        const text = await res.text();
        errData = { message: text || res.statusText };
      } catch {
        errData = { message: res.statusText };
      }
    }

    const extractedMessage =
      (typeof errData === "string" ? errData : null) ||
      errData?.message ||
      errData?.error?.message ||
      (typeof errData?.error === "string" ? errData.error : null) ||
      (Array.isArray(errData?.details) ? (errData.details[0]?.message || errData.details[0]) : (typeof errData?.details === "string" ? errData.details : null)) ||
      (Array.isArray(errData?.errors) ? (errData.errors[0]?.message || errData.errors[0]) : (typeof errData?.errors === "string" ? errData.errors : null)) ||
      errData?.errorMessage ||
      errData?.errMessage ||
      errData?.msg ||
      errData?.response ||
      res.statusText ||
      "Request failed";

    const finalMsg = (typeof extractedMessage === "string" && extractedMessage.trim() && extractedMessage !== "Request failed")
      ? extractedMessage.trim()
      : "This Aadhaar number is not recognized. Try again.";

    const error = new Error(finalMsg);
    error.status = res.status;
    error.response = errData;
    throw error;
  }

  return res.json();
}

export const api = {
  get: (path, customHeaders = {}) => request("GET", path, null, customHeaders),
  post: (path, body, customHeaders = {}, fetchOptions = {}) => request("POST", path, body, customHeaders, fetchOptions),
  put: (path, body, customHeaders = {}) => request("PUT", path, body, customHeaders),
  delete: (path, customHeaders = {}) => request("DELETE", path, null, customHeaders),
};
