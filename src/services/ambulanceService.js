import { api } from "./api";

const STORAGE_KEY = "arvaya_ambulance_requests";

function loadRequests() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRequests(requests) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

const EMERGENCY_TYPES = [
  { value: "cardiac", label: "Cardiac Emergency" },
  { value: "accident", label: "Accident / Trauma" },
  { value: "breathing", label: "Breathing Difficulty" },
  { value: "pregnancy", label: "Pregnancy / Maternity" },
  { value: "burns", label: "Burns" },
  { value: "stroke", label: "Stroke / Paralysis" },
  { value: "other", label: "Other" },
];

const STATUS_FLOW = ["Requested", "Assigned", "Dispatched", "Arriving", "Completed"];

function getStoredPatientId() {
  try {
    const stored = localStorage.getItem("arvaya_user") || localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      return user?.patient_id || user?.id || user?.user_id || user?.app_user_id || null;
    }
  } catch (e) { }
  return null;
}

/**
 * Submit an ambulance request.
 */
async function requestAmbulance(data) {
  const payload = {
    patient_id: data.patient_id ?? data.patientId ?? getStoredPatientId() ?? "",
    patient_name: data.patient_name ?? data.patientName ?? "",
    requester_phone: data.requester_phone ?? data.contactNumber ?? "",
    emergency_type: data.emergency_type ?? data.emergencyType ?? "",
    pickup_lat: data.pickup_lat ?? data.lat ?? null,
    pickup_lng: data.pickup_lng ?? data.lng ?? null,
    pickup_address: data.pickup_address ?? data.pickupAddress ?? "",
    location_key: data.location_key ?? data.locationKey ?? ""
  };

  let apiRes = null;
  try {
    apiRes = await api.post("/api/ambulance/create-request", payload);
  } catch (e) {
    console.error("Error calling api/ambulance/create-request:", e);
    throw e;
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}

  return apiRes;
}

/**
 * Fetch ambulance requests from /api/ambulance/my-requests with structured filters.
 * @param {object|string|number} [currentUser]
 */
async function getAmbulanceRequests(currentUser, pageSize, pageIndex = 1) {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}

  let patientId = typeof currentUser === "object"
    ? (currentUser?.patient_id || currentUser?.id || currentUser?.user_id || currentUser?.app_user_id)
    : currentUser;

  if (!patientId) {
    patientId = getStoredPatientId();
  }

  if (!patientId) {
    return [];
  }

  const initialPageSize = Number(pageSize) || 100;

  const payload = {
    pageIndex: Number(pageIndex) || 1,
    pageSize: initialPageSize,
    sortKey: "id",
    sortValue: "desc",
    filters: [
      {
        column: "patient_id",
        operator: "=",
        value: patientId
      },
      {
        column: "status",
        operator: "IN",
        value: ["requested", "assigned", "dispatched", "arriving", "completed", "delayed", "unavailable", "cancelled"]
      }
    ]
  };

  function normalizeStatus(raw) {
    if (!raw || typeof raw !== "string") return "Requested";
    const s = raw.trim().toLowerCase().replace(/_/g, " ");
    if (s.includes("cancel")) return "Cancelled";
    if (s.includes("unavailable")) return "Unavailable";
    if (s.includes("delay")) return "Delayed";
    if (s.includes("complete") || s.includes("done")) return "Completed";
    if (s.includes("arrive") || s.includes("reach") || s.includes("arriving")) return "Arriving";
    if (s.includes("dispatch")) return "Dispatched";
    if (s.includes("assign")) return "Assigned";
    return "Requested";
  }

  function normalizeApiItem(item) {
    const rawEta = item.eta_minutes ?? item.eta ?? item.eta_mins ?? item.estimated_time ?? item.estimated_eta ?? null;
    let parsedEta = null;
    if (rawEta !== null && rawEta !== undefined && rawEta !== "" && rawEta !== "null") {
      const num = Number(rawEta);
      parsedEta = isNaN(num) ? null : num;
    }

    const rawStatus = item.status || item.request_status || item.state || "Requested";

    return {
      id: item.id || item.request_id || item.queue_id || item.ambulance_id || ("AMB-" + String(item.id || Date.now())),
      requestId: item.request_id || item.id || item.queue_id || null,
      patientId: item.patient_id ?? item.patientId ?? item.app_user_id ?? item.user_id ?? "",
      patientName: item.patient_name || item.patientName || item.name || item.user_name || "Patient",
      contactNumber: item.requester_phone || item.contact_number || item.contactNumber || item.phone || item.mobile_number || "",
      pickupAddress: item.pickup_address || item.pickupAddress || item.address || item.location || "",
      pickupLat: Number(item.pickup_lat ?? item.pickupLat ?? item.latitude ?? item.lat ?? null) || null,
      pickupLng: Number(item.pickup_lng ?? item.pickupLng ?? item.longitude ?? item.lng ?? null) || null,
      emergencyType: item.emergency_type || item.emergencyType || item.emergency_category || "General Emergency",
      status: normalizeStatus(rawStatus),
      eta: parsedEta,
      createdAt: item.created_at || item.createdAt || item.created_date || item.created_modified_date || new Date().toISOString(),
      assignedAt: item.assigned_at || null,
      dispatchedAt: item.dispatched_at || null,
      completedAt: item.completed_at || null,
      updatedAt: item.updated_at || null,
      ambulanceId: item.ambulance_number || item.ambulance_no || item.ambulance_num || item.ambulance_id || item.ambulanceId || item.vehicle_number || item.vehicle_no || item.vehicle_num || item.vehicleId || "N/A",
      driverName: item.driver_name || item.driverName || item.driver || "Unassigned",
      driverPhone: item.driver_mobile_no || item.driver_phone || item.driverPhone || item.driver_mobile || "",
      raw: item
    };
  }

   let apiResult = [];
   try {
     let res = null;
     try {
       res = await api.post("/api/ambulance/my-requests", payload);
     } catch (e) {
       console.warn("POST /api/ambulance/my-requests failed, trying GET...", e);
       res = await api.get(`/api/ambulance/my-requests?filters=${encodeURIComponent(JSON.stringify(payload.filters))}&pageIndex=${payload.pageIndex}&pageSize=${payload.pageSize}`);
     }

    let rawList = res?.data?.data || res?.data || res?.queue || res?.list || res?.requests || res?.result || (Array.isArray(res) ? res : []);
    const totalCount = Number(res?.data?.count ?? res?.count ?? 0);

    // If more data exists than the initial page size and no explicit pageSize was provided,
    // dynamically fetch all records matching the total count so records are never truncated in the future
    if (!pageSize && totalCount > (Array.isArray(rawList) ? rawList.length : 0)) {
      payload.pageSize = totalCount;
      try {
        res = await api.post("/api/ambulance/my-requests", payload);
      } catch (e) {
        res = await api.get(`/api/ambulance/my-requests?filters=${encodeURIComponent(JSON.stringify(payload.filters))}&pageIndex=1&pageSize=${payload.pageSize}`);
      }
      rawList = res?.data?.data || res?.data || res?.queue || res?.list || res?.requests || res?.result || (Array.isArray(res) ? res : []);
    }

    if (Array.isArray(rawList)) {
      const filteredList = rawList.filter(item => {
        const pId = item?.patient_id ?? item?.patientId ?? item?.app_user_id ?? item?.user_id;
        return !pId || String(pId) === String(patientId);
      });
      apiResult = filteredList.map(normalizeApiItem);
    }
  } catch (err) {
    console.error("Error fetching ambulance requests from API:", err);
  }

  return apiResult.filter(item => !String(item.id).includes("AMB-MTR0CT9Q"));
}

/**
 * Get a single request by ID.
 */
async function getRequestById(id, currentUser) {
  const all = await getAmbulanceRequests(currentUser);
  return all.find(r => String(r.id) === String(id)) || null;
}

/**
 * Reverse-geocode lat/lng to a human address using Nominatim (OpenStreetMap).
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Fetch live tracking data for a single ambulance request.
 * GET /api/ambulance/track/:request_id
 * @param {string|number} requestId
 * @returns {Promise<object|null>}
 */
async function trackAmbulance(requestId) {
  if (!requestId) return null;
  try {
    const res = await api.get(`/api/ambulance/track/${requestId}`);
    return res?.data || res?.tracking || res?.result || res || null;
  } catch (err) {
    console.error("Error fetching ambulance tracking data:", err);
    return null;
  }
}

/**
 * Parse the raw location string from the API into { lat, lng } numbers.
 * Handles "16.861,74.576", { lat, lng }, { latitude, longitude } formats.
 * @returns {{lat:number,lng:number}|null}
 */
function parseLocation(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  }
  if (typeof raw === "object") {
    const lat = Number(raw.lat ?? raw.latitude);
    const lng = Number(raw.lng ?? raw.lon ?? raw.longitude);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

/**
 * Parse location_history entries into { lat, lng, timestamp } array.
 * @returns {Array<{lat:number,lng:number,timestamp:string}>}
 */
function parseLocationHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.map(h => {
    if (typeof h === "string") {
      const parts = h.split(",").map(s => s.trim());
      return { lat: Number(parts[0]), lng: Number(parts[1]), timestamp: parts[2] || null };
    }
    const loc = parseLocation(h);
    return {
      lat: loc?.lat,
      lng: loc?.lng,
      timestamp: h?.timestamp || h?.time || h?.created_at || h?.createdAt || null,
    };
  }).filter(h => h.lat != null && h.lng != null);
}

/**
 * Poll /api/ambulance/track/:request_id every `intervalMs` (default 10s).
 * Continues polling only when meaningful data is available — i.e.
 * `current_location`, `assigned_at`, or `dispatched_at` is non-null.
 * Stops when status becomes terminal (completed/cancelled/unavailable/delayed)
 * or when none of those fields are present (ambulance not yet dispatched).
 * @param {string|number} requestId
 * @param {function(object|null):void} onUpdate  – receives parsed tracking object or null on error
 * @param {number} [intervalMs=10000]
 * @param {function():void}  [onStop] – optional callback when polling stops
 * @returns {()=>void} stop function that clears the interval
 */
function startAmbulanceTracking(requestId, onUpdate, intervalMs = 10000, onStop) {
  let timerId = null;

  const TERMINAL_STATUSES = ["completed", "cancelled", "unavailable", "delayed"];

  async function fetchOnce() {
    const raw = await trackAmbulance(requestId);

    let tracking = null;
    let shouldStop = false;

    if (raw) {
      const r = raw.data || raw;
      const locationHistory = parseLocationHistory(r.location_history || r?.location_history);
      const currentLoc = parseLocation(r.current_location || r?.current_location);

      const hasMeaningfulData =
        currentLoc ||
        r?.assigned_at || r?.assignedAt ||
        r?.dispatched_at || r?.dispatchedAt;

      tracking = {
        requestId: r?.request_id || r?.id || requestId,
        status: r?.status || r?.request_status || "",
        eta: Number(r?.eta_minutes ?? r?.eta ?? r?.eta_mins ?? null) || null,
        driverName: r?.driver_name || r?.driverName || "",
        driverPhone: r?.driver_mobile_no || r?.driver_phone || r?.driverPhone || "",
        ambulanceNo: r?.ambulance_no || r?.ambulance_number || "",
        pickupLat: Number(r?.pickup_lat ?? r?.pickupLat ?? null) || null,
        pickupLng: Number(r?.pickup_lng ?? r?.pickupLng ?? null) || null,
        latitude: currentLoc ? currentLoc.lat : (locationHistory.length > 0 ? locationHistory[locationHistory.length - 1].lat : null),
        longitude: currentLoc ? currentLoc.lng : (locationHistory.length > 0 ? locationHistory[locationHistory.length - 1].lng : null),
        locationHistory,
        currentLocation: currentLoc,
        createdAt: r?.created_at || r?.createdAt || null,
        assignedAt: r?.assigned_at || r?.assignedAt || null,
        dispatchedAt: r?.dispatched_at || r?.dispatchedAt || null,
        completedAt: r?.completed_at || r?.completedAt || null,
        raw: r,
      };

      const currentStatus = (tracking.status || "").toLowerCase().replace(/_/g, " ");

      if (currentStatus && TERMINAL_STATUSES.some(t => currentStatus.includes(t))) {
        shouldStop = true;
      } else if (!hasMeaningfulData) {
        shouldStop = true;
      }
    } else {
      shouldStop = true;
    }

    onUpdate?.(tracking);

    if (shouldStop) {
      clearInterval(timerId);
      timerId = null;
      onStop?.();
    }
  }

  fetchOnce();
  timerId = setInterval(fetchOnce, intervalMs);

  return function stop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      onStop?.();
    }
  };
}

async function updateAmbulanceStatus({ requestId, status = "cancelled", cancellationReason = "" }) {
  const payload = {
    status,
    request_id: requestId,
    cancellation_reason: cancellationReason,
  };
  try {
    const res = await api.post("/api/ambulance/update-status", payload);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    return res?.data || res;
  } catch (err) {
    console.error("Error updating ambulance status:", err);
    throw err;
  }
}

/**
 * Fetch and parse one tracking snapshot for a request.
 * Returns the same shape as the tracking object inside startAmbulanceTracking,
 * or null if the request fails or returns no data.
 * @param {string|number} requestId
 * @returns {Promise<object|null>}
 */
async function fetchTrackingData(requestId) {
  if (!requestId) return null;
  const raw = await trackAmbulance(requestId);
  if (!raw) return null;
  const rawData = raw?.data ?? raw;
  const r = (rawData?.data ?? rawData?.result ?? rawData) || {};
  const locationHistory = parseLocationHistory(r.location_history || r.locationHistory || r.history || []);
  const currentLoc = parseLocation(r.current_location || r.currentLocation || r.live_location);
  return {
    requestId: r?.request_id || r?.id || requestId,
    status: r?.status || r?.request_status || "",
    eta: Number(r?.eta_minutes ?? r?.eta ?? r?.eta_mins ?? null) || null,
    driverName: r?.driver_name || r?.driverName || "",
    driverPhone: r?.driver_mobile_no || r?.driver_phone || r?.driverPhone || "",
    ambulanceNo: r?.ambulance_no || r?.ambulance_number || "",
    pickupLat: Number(r?.pickup_lat ?? r?.pickupLat ?? null) || null,
    pickupLng: Number(r?.pickup_lng ?? r?.pickupLng ?? null) || null,
    pickupAddress: r?.pickup_address || r?.address || "",
    patientName: r?.patient_name || r?.user_name || "",
    contactNumber: r?.requester_phone || r?.phone || r?.mobile_no || "",
    latitude: currentLoc ? currentLoc.lat : (locationHistory.length > 0 ? locationHistory[locationHistory.length - 1].lat : null),
    longitude: currentLoc ? currentLoc.lng : (locationHistory.length > 0 ? locationHistory[locationHistory.length - 1].lng : null),
    locationHistory,
    currentLocation: currentLoc,
    createdAt: r?.created_at || r?.createdAt || null,
    assignedAt: r?.assigned_at || r?.assignedAt || null,
    dispatchedAt: r?.dispatched_at || r?.dispatchedAt || null,
    completedAt: r?.completed_at || r?.completedAt || null,
    raw: r,
  };
}

export {
  EMERGENCY_TYPES,
  STATUS_FLOW,
  requestAmbulance,
  getAmbulanceRequests,
  getRequestById,
  reverseGeocode,
  trackAmbulance,
  fetchTrackingData,
  startAmbulanceTracking,
  updateAmbulanceStatus,
};
