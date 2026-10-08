import React, { useState, useEffect, useRef, useMemo } from "react";
import { Truck, Clock, Plus, Minus, MapPin, XCircle } from "lucide-react";
import { fetchTrackingData, GOOGLE_MAPS_API_KEY } from "../../services/ambulanceService";
import CancelAmbulanceModal from "./CancelAmbulanceModal";
import useGoogleMapsScript from "./useGoogleMapsScript";

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function getAmbulanceSvgString(rotation = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="34" viewBox="0 0 48 34" fill="none">
    <g transform="rotate(${rotation} 24 17)">
      <!-- Ground contact shadow -->
      <ellipse cx="24" cy="30.5" rx="19" ry="2.5" fill="#0f172a" fill-opacity="0.28"/>
 
      <!-- Emergency Siren Lightbar (Red & Blue with center flash) -->
      <rect x="21" y="2" width="6" height="3.5" rx="1.5" fill="#dc2626"/>
      <rect x="27" y="2" width="6" height="3.5" rx="1.5" fill="#2563eb"/>
      <circle cx="27" cy="3.75" r="0.9" fill="#ffffff"/>
 
      <!-- Main Ambulance Body (Clean Medical White with crisp dark outline) -->
      <path d="M5 9.5C5 7.6 6.6 6 8.5 6H33.5C34.7 6 35.8 6.6 36.6 7.5L42.5 14.3C43.5 15.5 44 17.1 44 18.7V25.5C44 26.6 43.1 27.5 42 27.5H6.5C5.4 27.5 4.5 26.6 4.5 25.5V9.5Z" fill="#FFFFFF" stroke="#1e293b" stroke-width="1.3" stroke-linejoin="round"/>
 
      <!-- Red Emergency Reflective Side Stripe -->
      <path d="M4.5 17.5H44V21.5H4.5V17.5Z" fill="#DC2626"/>
 
      <!-- Medical Red Cross -->
      <rect x="14.5" y="10" width="4" height="11" rx="0.8" fill="#DC2626"/>
      <rect x="11" y="13.5" width="11" height="4" rx="0.8" fill="#DC2626"/>
      <circle cx="16.5" cy="15.5" r="1.2" fill="#FFFFFF"/>
 
      <!-- Front Windshield & Cab Window (Tinted Glass with reflection) -->
      <path d="M33.5 7.8H27.5V14.5H39.5L34.6 8.5C34.3 8.1 33.9 7.8 33.5 7.8Z" fill="#0f172a"/>
      <path d="M29.5 8.8L35.5 14H32L28 8.8H29.5Z" fill="#60A5FA" fill-opacity="0.65"/>
 
      <!-- Rear Patient Window -->
      <rect x="7.5" y="8.8" width="7" height="6" rx="1.2" fill="#E2E8F0" stroke="#94A3B8" stroke-width="0.8"/>
 
      <!-- Headlight (Front Amber) -->
      <path d="M43 18.5H44V21H43C42.4 21 42 20.6 42 19.75C42 19.1 42.4 18.5 43 18.5Z" fill="#FBBF24"/>
      <!-- Taillight (Rear Red) -->
      <rect x="4.5" y="18.5" width="1.2" height="3" rx="0.6" fill="#EF4444"/>
 
      <!-- Front Bumper -->
      <rect x="42.5" y="23" width="2" height="3" rx="1" fill="#64748B"/>
 
      <!-- Wheels (Front & Rear) -->
      <circle cx="13" cy="27" r="4.2" fill="#0f172a"/>
      <circle cx="13" cy="27" r="2" fill="#94a3b8"/>
      <circle cx="13" cy="27" r="0.9" fill="#f8fafc"/>
 
      <circle cx="35" cy="27" r="4.2" fill="#0f172a"/>
      <circle cx="35" cy="27" r="2" fill="#94a3b8"/>
      <circle cx="35" cy="27" r="0.9" fill="#f8fafc"/>
    </g>
  </svg>`;
}

function makeAmbulanceLeafletIcon(rotation = 0) {
  return L.divIcon({
    className: "leaflet-amb-marker-wrapper",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 34px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); cursor: pointer;">
        ${getAmbulanceSvgString(rotation)}
      </div>
    `,
    iconSize: [48, 34],
    iconAnchor: [24, 17],
    popupAnchor: [0, -17],
  });
}

function makePickupLeafletIcon() {
  return L.divIcon({
    className: "leaflet-pickup-marker-wrapper",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(220,38,38,0.45)); cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#dc2626"/>
          <circle cx="16" cy="10" r="4" fill="white"/>
          <path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

function LeafletFitBoundsHelper({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points) return;
    const valid = points.filter((p) => p && p.lat != null && p.lng != null);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], Math.max(map.getZoom(), 15));
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, JSON.stringify(points)]);
  return null;
}

function LeafletMapInstanceSync({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

const STATUS_LABELS = {
  requested: "Requested",
  assigned: "Assigned",
  dispatched: "Dispatched",
  arriving: "Arriving",
  completed: "Completed",
  delayed: "Delayed",
  unavailable: "Unavailable",
  cancelled: "Cancelled",
  cancel: "Cancelled",
};

const STATUS_COLORS = {
  requested: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  assigned: { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  dispatched: { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" },
  arriving: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  completed: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  delayed: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  unavailable: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  cancel: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const DEFAULT_CENTER = [20.5937, 78.9629];
const POLL_INTERVAL_MS = 15000;
const ACTIVE_STATUSES = new Set(["requested", "assigned", "dispatched", "arriving"]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "cancel", "unavailable", "delayed"]);

// ─── SVG icon helpers ────────────────────────────────────────────────────────

function makeAmbulanceSvg(rotation = 0) {
  return "data:image/svg+xml," + encodeURIComponent(getAmbulanceSvgString(rotation));
}

const PICKUP_SVG_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">' +
    '<path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#dc2626"/>' +
    '<circle cx="16" cy="10" r="4" fill="white"/>' +
    '<path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white"/>' +
    "</svg>"
  );

// ─── Coordinate & Parsing Helpers (from Admin Panel) ─────────────────────────

const parseCoordVal = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) || val === 0 ? null : val;
  if (typeof val === "string") {
    const v = parseFloat(val);
    return isNaN(v) || v === 0 ? null : v;
  }
  if (typeof val === "object") {
    return parseCoordVal(val.latitude ?? val.lat ?? val.lat_val);
  }
  return null;
};

const parseLngVal = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) || val === 0 ? null : val;
  if (typeof val === "string") {
    const v = parseFloat(val);
    return isNaN(v) || v === 0 ? null : v;
  }
  if (typeof val === "object") {
    return parseLngVal(val.longitude ?? val.lng ?? val.long ?? val.lng_val);
  }
  return null;
};

const parseTime = (dateStr) => {
  if (!dateStr) return 0;
  const s = String(dateStr).replace(" ", "T");
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
};

const extractTrackCoordinates = (data) => {
  if (!data) return [];
  const points = [];

  // 1. Pickup Location
  const pLat = parseCoordVal(data.pickup_lat ?? data.pickup_location ?? data.pick_lat ?? data.lat);
  const pLng = parseLngVal(data.pickup_lng ?? data.pickup_location ?? data.pick_lng ?? data.lng);
  const address = String(data.pickup_address || data.address || "");
  if (pLat !== null && pLng !== null) {
    points.push({
      lat: pLat,
      lng: pLng,
      label: "Pickup Location",
      type: "pickup",
      address,
    });
  }

  // 2. Location History (Array format)
  const rawHistory = Array.isArray(data.location_history)
    ? data.location_history
    : Array.isArray(data.locationHistory)
      ? data.locationHistory
      : Array.isArray(data.history)
        ? data.history
        : [];

  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    const sorted = [...rawHistory].sort((a, b) => {
      const tA = parseTime(a.recorded_at || a.timestamp || a.created_at);
      const tB = parseTime(b.recorded_at || b.timestamp || b.created_at);
      return tA - tB;
    });

    sorted.forEach((item) => {
      const hLat = parseCoordVal(item);
      const hLng = parseLngVal(item);
      const recorded_at = String(item.recorded_at || item.timestamp || item.created_at || "");
      if (hLat !== null && hLng !== null) {
        points.push({
          lat: hLat,
          lng: hLng,
          label: "Location History",
          type: "history",
          recorded_at,
        });
      }
    });
  }

  // 3. Current Location (Object format)
  const rawCurrent = data.current_location ?? data.currentLocation ?? data.live_location;
  const cLat = parseCoordVal(rawCurrent);
  const cLng = parseLngVal(rawCurrent);
  const cTime = String(rawCurrent?.recorded_at || rawCurrent?.timestamp || rawCurrent?.updated_at || "");

  if (cLat !== null && cLng !== null) {
    points.push({
      lat: cLat,
      lng: cLng,
      label: "Current Ambulance Location",
      type: "current",
      recorded_at: cTime,
    });
  }

  // Deduplicate adjacent identical points (within 0.000005 distance)
  const filteredPoints = [];
  points.forEach((pt) => {
    const last = filteredPoints[filteredPoints.length - 1];
    if (!last || Math.abs(last.lat - pt.lat) > 0.000005 || Math.abs(last.lng - pt.lng) > 0.000005) {
      filteredPoints.push(pt);
    }
  });

  return filteredPoints;
};

const getCoordinates = (item) => {
  if (!item) return { lat: null, lng: null, currentLat: null, currentLng: null, pickupLat: null, pickupLng: null, dropLat: null, dropLng: null, address: "" };

  let currentLat = null;
  let currentLng = null;

  if (item.current_location && typeof item.current_location === "object") {
    const cl = item.current_location;
    const cLat = cl.latitude ?? cl.lat;
    const cLng = cl.longitude ?? cl.lng;
    if (cLat !== undefined && cLat !== null && cLat !== "") {
      const v = Number(cLat);
      if (!isNaN(v) && v !== 0) currentLat = v;
    }
    if (cLng !== undefined && cLng !== null && cLng !== "") {
      const v = Number(cLng);
      if (!isNaN(v) && v !== 0) currentLng = v;
    }
  }

  let pickupLat = null;
  let pickupLng = null;

  const latKeys = ["pickup_lat", "pickup_latitude", "pick_lat", "lat", "latitude"];
  const lngKeys = ["pickup_lng", "pickup_longitude", "pick_lng", "lng", "longitude"];

  for (const k of latKeys) {
    if (item[k] !== undefined && item[k] !== null && item[k] !== "") {
      const val = Number(item[k]);
      if (!isNaN(val) && val !== 0) {
        pickupLat = val;
        break;
      }
    }
  }

  for (const k of lngKeys) {
    if (item[k] !== undefined && item[k] !== null && item[k] !== "") {
      const val = Number(item[k]);
      if (!isNaN(val) && val !== 0) {
        pickupLng = val;
        break;
      }
    }
  }

  if (pickupLat === null || pickupLng === null) {
    for (const key of Object.keys(item)) {
      const lower = key.toLowerCase();
      if (pickupLat === null && (lower.includes("pickuplat") || lower.includes("plat") || (lower.includes("lat") && !lower.includes("drop")))) {
        const val = Number(item[key]);
        if (!isNaN(val) && val !== 0) pickupLat = val;
      }
      if (pickupLng === null && (lower.includes("pickuplng") || lower.includes("plng") || (lower.includes("lng") && !lower.includes("drop")))) {
        const val = Number(item[key]);
        if (!isNaN(val) && val !== 0) pickupLng = val;
      }
    }
  }

  let dropLat = null;
  let dropLng = null;
  if (item.drop_lat !== undefined && item.drop_lat !== null) dropLat = Number(item.drop_lat);
  if (item.drop_lng !== undefined && item.drop_lng !== null) dropLng = Number(item.drop_lng);

  const lat = currentLat ?? pickupLat;
  const lng = currentLng ?? pickupLng;

  const address = String(item.pickup_address || item.address || item.location_key || item.patient_name || "");
  return { lat, lng, currentLat, currentLng, pickupLat, pickupLng, dropLat, dropLng, address };
};

const ROUTE_REFRESH_INTERVAL_MS = 60000;
const ROUTE_MIN_MOVE_METERS = 150;
const ROUTE_ERROR_BACKOFF_MS = 90000;

const toCoord = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : NaN;
  return Number.isFinite(n) && n !== 0 ? n : null;
};


function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** Calculate great-circle distance between two { lat, lng } points in meters (Haversine). */
function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lng - a.lng);

  const sinΔφ2 = Math.sin(Δφ / 2);
  const sinΔλ2 = Math.sin(Δλ / 2);

  const d =
    2 *
    R *
    Math.asin(Math.sqrt(sinΔφ2 * sinΔφ2 + Math.cos(φ1) * Math.cos(φ2) * sinΔλ2 * sinΔλ2));
  return d;
}

/** Trims the completed portion of the polyline as ambulance travels (matching RN trimPolyline). */
function trimPolyline(coords, current) {
  if (!coords || coords.length < 2 || !current) return coords;
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const d = distanceMeters(coords[i], current);
    if (d < minDistance) {
      minDistance = d;
      closestIndex = i;
    }
  }

  // If within 150m of the path, trim the points passed and start directly at ambulance
  if (minDistance < 150) {
    return [current, ...coords.slice(closestIndex + 1)];
  }
  return coords;
}

/**
 * Snap route to roads using OSRM (same as Admin Panel).
 * Coordinates: [lng, lat] in OSRM URL, returns array of { lat, lng } points on the road.
 * Connects directly to startPoint (ambulance) and endPoint (pickup / user icon) to eliminate any gaps.
 */
async function snapRoute(startPoint, endPoint) {
  const coordString = `${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data?.code !== "Ok") throw new Error(`OSRM ${data?.code || "error"}`);
  const coords = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) throw new Error("OSRM empty geometry");
  return coords.map((c) => ({ lat: c[1], lng: c[0] }));
}

function normalizeStatus(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase().replace(/_/g, " ");
}

function isActiveStatus(sc) {
  return ACTIVE_STATUSES.has(sc);
}

function isTerminalStatus(sc) {
  return TERMINAL_STATUSES.has(sc) || sc.includes("cancel") || sc.includes("complete");
}

/** Compute compass bearing (0–360) from point A to point B. */
function bearing(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Linear interpolation between two LatLng positions, t in [0,1]. */
function lerpLatLng(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/** Ease-in-out cubic. */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LiveAmbulanceTracker({
  requestId,
  pickupLat,
  pickupLng,
  pickupAddress,
  status: propStatus,
  patientName,
  contactNumber,
  onTrackingData,
  onCancelRequest,
  live = true,
  hideBottomBar = false,
  showOverlays = true,
}) {
  // DOM ref for the map container
  const mapRef = useRef(null);

  // Map & map-object refs (never stored in state to avoid re-renders)
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const lastLocationMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const polylineRef = useRef(null);      // track if animated draw already done

  // Animation frame handles
  const glideRafRef = useRef(null);
  const drawRafRef = useRef(null);

  // Polling
  const pollingTimerRef = useRef(null);
  const pollingStoppedRef = useRef(false);

  // Track last ambulance position for bearing & glide
  const prevPosRef = useRef(null);
  const lastRotationRef = useRef(0);

  const lastRouteOriginRef = useRef(null);
  const lastRouteDestRef = useRef(null);
  const lastRouteFetchTsRef = useRef(0);
  const routeBackoffUntilRef = useRef(0);
  const lastTripTypeRef = useRef(null);
  const roadCoordsRef = useRef([]);
  const hasFitInitialBoundsRef = useRef(false);

  // Keep stable ref to callback
  const onTrackingDataRef = useRef(onTrackingData);
  useEffect(() => { onTrackingDataRef.current = onTrackingData; }, [onTrackingData]);

  // Component state
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localStatus, setLocalStatus] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [forceFallback, setForceFallback] = useState(false);
  const [fallbackRoute, setFallbackRoute] = useState([]);
  const fallbackRouteRef = useRef([]);
  const lastFallbackOriginRef = useRef(null);
  const lastFallbackDestRef = useRef(null);
  const leafletMapRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    fallbackRouteRef.current = fallbackRoute;
  }, [fallbackRoute]);

  const { loaded: mapsLoaded, error: mapsError } = useGoogleMapsScript(GOOGLE_MAPS_API_KEY, ["routes"]);

  // If Google Maps fails to load or takes longer than 3.5s, smoothly activate Leaflet fallback
  useEffect(() => {
    if (!mapsLoaded && !mapsError) {
      const timer = setTimeout(() => {
        if (!window.google?.maps) {
          setForceFallback(true);
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [mapsLoaded, mapsError]);

  const isUsingFallback = Boolean(forceFallback || mapsError || !GOOGLE_MAPS_API_KEY);

  // ── Derived status ──────────────────────────────────────────────────────────
  const rawStatus = (localStatus || tracking?.status || propStatus || "requested").toString().trim();
  const sc = normalizeStatus(rawStatus);
  const isCancelled = sc.includes("cancel");
  const isCompleted = sc.includes("complete");
  const isTerminal = isCancelled || isCompleted;
  const isActive = isActiveStatus(sc);
  const isRequested = !isCancelled && (sc === "requested" || sc === "request");
  const statusColor = isCancelled ? STATUS_COLORS.cancelled : (STATUS_COLORS[sc] || STATUS_COLORS.requested);
  const statusLabel = isCancelled ? "Cancelled" : (STATUS_LABELS[sc] || rawStatus || "—");
  const isAwaitingDriver = !isCancelled && !tracking?.driverName && sc !== "dispatched" && sc !== "arriving" && sc !== "completed";
  const driverDisplayName = isCancelled
    ? "Request Cancelled"
    : (tracking?.driverName || (sc === "dispatched" || sc === "arriving" ? "Driver assigned" : "Awaiting driver"));

  const rawLoc =
    tracking?.current_location ||
    tracking?.location ||
    tracking?.currentLocation ||
    tracking?.live_location ||
    tracking?.raw?.current_location;
  const rawLat =
    rawLoc?.latitude ??
    rawLoc?.lat ??
    tracking?.latitude ??
    tracking?.current_lat ??
    tracking?.driver_latitude ??
    tracking?.raw?.latitude;
  const rawLng =
    rawLoc?.longitude ??
    rawLoc?.lng ??
    tracking?.longitude ??
    tracking?.current_lng ??
    tracking?.driver_longitude ??
    tracking?.raw?.longitude;
  const ambLat = toCoord(rawLat);
  const ambLng = toCoord(rawLng);
  const ambPos = ambLat != null && ambLng != null ? { lat: ambLat, lng: ambLng } : null;

  const pLat = toCoord(pickupLat ?? tracking?.pickupLat ?? tracking?.pickup_lat ?? tracking?.raw?.pickup_lat);
  const pLng = toCoord(pickupLng ?? tracking?.pickupLng ?? tracking?.pickup_lng ?? tracking?.raw?.pickup_lng);
  const pickupPos = pLat != null && pLng != null ? { lat: pLat, lng: pLng } : null;

  // Extract history points from tracking data
  const historyPoints = useMemo(() => {
    if (!tracking) return [];
    return extractTrackCoordinates(tracking).filter((p) => p.type === "history");
  }, [tracking]);

  // Update ambulance heading/bearing
  useEffect(() => {
    if (prevPosRef.current && ambPos) {
      const moved = Math.abs(ambPos.lat - prevPosRef.current.lat) > 1e-6 || Math.abs(ambPos.lng - prevPosRef.current.lng) > 1e-6;
      if (moved) {
        lastRotationRef.current = bearing(prevPosRef.current.lat, prevPosRef.current.lng, ambPos.lat, ambPos.lng);
      }
    } else if (ambPos && pickupPos) {
      lastRotationRef.current = bearing(ambPos.lat, ambPos.lng, pickupPos.lat, pickupPos.lng);
    }
  }, [ambPos?.lat, ambPos?.lng]);

  // Fetch road route for fallback Leaflet map (stationary-aware with client-side trimming)
  useEffect(() => {
    if (!ambPos || !pickupPos) {
      setFallbackRoute([]);
      fallbackRouteRef.current = [];
      lastFallbackOriginRef.current = null;
      lastFallbackDestRef.current = null;
      return;
    }

    const lastOrig = lastFallbackOriginRef.current;
    const lastDest = lastFallbackDestRef.current;
    const hasExistingRoute = fallbackRouteRef.current && fallbackRouteRef.current.length >= 2;

    if (hasExistingRoute && lastOrig && lastDest) {
      const destMoved = distanceMeters(lastDest, pickupPos) > 50;
      const ambMovedSignificantly = distanceMeters(lastOrig, ambPos) >= ROUTE_MIN_MOVE_METERS;

      // When ambulance is stationary or moved < 150m and destination hasn't changed,
      // completely skip external OSRM API call and trim the existing path client-side!
      if (!destMoved && !ambMovedSignificantly) {
        setFallbackRoute((prev) => {
          if (prev && prev.length >= 2) {
            const trimmed = trimPolyline(prev, ambPos);
            fallbackRouteRef.current = trimmed;
            return trimmed;
          }
          return prev;
        });
        return;
      }
    }

    let cancelled = false;
    snapRoute(ambPos, pickupPos)
      .then((coords) => {
        if (!cancelled && coords && coords.length >= 2) {
          lastFallbackOriginRef.current = ambPos;
          lastFallbackDestRef.current = pickupPos;
          fallbackRouteRef.current = coords;
          setFallbackRoute(coords);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const direct = [ambPos, pickupPos];
          lastFallbackOriginRef.current = ambPos;
          lastFallbackDestRef.current = pickupPos;
          fallbackRouteRef.current = direct;
          setFallbackRoute(direct);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ambPos?.lat, ambPos?.lng, pickupPos?.lat, pickupPos?.lng]);

  // ── Cancel animation frames on unmount ─────────────────────────────────────
  function cancelAnimations() {
    if (glideRafRef.current) { cancelAnimationFrame(glideRafRef.current); glideRafRef.current = null; }
    if (drawRafRef.current) { cancelAnimationFrame(drawRafRef.current); drawRafRef.current = null; }
  }

  // ── Glide ambulance marker from old pos to new pos ─────────────────────────
  function glideMarker(fromPos, toPos, durationMs = 1000) {
    if (!markerRef.current) return;
    if (glideRafRef.current) cancelAnimationFrame(glideRafRef.current);
    const start = performance.now();
    const rot = bearing(fromPos.lat, fromPos.lng, toPos.lat, toPos.lng);
    const moved = Math.abs(toPos.lat - fromPos.lat) > 1e-7 || Math.abs(toPos.lng - fromPos.lng) > 1e-7;
    if (moved) lastRotationRef.current = rot;

    function step(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const e = easeInOut(t);
      const pos = lerpLatLng(fromPos, toPos, e);
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
        markerRef.current.setIcon({
          url: makeAmbulanceSvg(lastRotationRef.current),
          scaledSize: new window.google.maps.Size(48, 34),
          anchor: new window.google.maps.Point(24, 17),
        });
      }
      if (t < 1) {
        glideRafRef.current = requestAnimationFrame(step);
      } else {
        glideRafRef.current = null;
      }
    }
    glideRafRef.current = requestAnimationFrame(step);
  }

  // ── Animate route drawing progressively ────────────────────────────────────
  function animateRouteDraw(fullPath, durationMs = 800) {
    if (!polylineRef.current || !fullPath || fullPath.length < 2) return;
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    const start = performance.now();
    const total = fullPath.length;

    function step(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const count = Math.max(2, Math.round(t * total));
      if (polylineRef.current) polylineRef.current.setPath(fullPath.slice(0, count));
      if (t < 1) {
        drawRafRef.current = requestAnimationFrame(step);
      } else {
        drawRafRef.current = null;
      }
    }
    drawRafRef.current = requestAnimationFrame(step);
  }

  // ── Draw straight dashed fallback line ─────────────────────────────────────
  function drawStraightLine(ambPos, targetPos) {
    if (!polylineRef.current || !ambPos || !targetPos) return;
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    polylineRef.current.setPath([ambPos, targetPos]);
    polylineRef.current.setOptions({
      strokeColor: "#2563eb",
      strokeOpacity: 0,
      strokeWeight: 7,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, scale: 5 },
          offset: "0",
          repeat: "20px",
        },
      ],
    });
  }

  // ── Request a route and update polyline ────────────────────────────────────
  function applyRoadRoute(points, animate = false) {
    if (!polylineRef.current || !points || points.length < 2) return;
    roadCoordsRef.current = points;
    polylineRef.current.setOptions({
      strokeColor: "#2563eb",
      strokeOpacity: 0.95,
      strokeWeight: 7,
      icons: [],
    });

    if (animate) {
      animateRouteDraw(points, 800);
    } else {
      polylineRef.current.setPath(points);
    }

    if (mapInstanceRef.current && points.length) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      mapInstanceRef.current.fitBounds(bounds, { top: 60, bottom: 80, left: 40, right: 40 });
    }
  }

  // ── Request a route and update polyline (OSRM primary, DirectionsService secondary) ──
  async function fetchRoadRoute(origin, destination, animate = false) {
    if (!polylineRef.current || !origin || !destination) return;

    let routePoints = null;

    // 1. Primary: OSRM driving route (free, no Google Cloud Console setup required)
    try {
      const osrmPoints = await snapRoute(origin, destination);
      if (osrmPoints && osrmPoints.length >= 2) {
        console.debug("[Routes] Used OSRM route");
        routePoints = osrmPoints;
      }
    } catch (osrmErr) {
      console.debug("[Routes] OSRM route unavailable:", osrmErr?.message);
    }

    // 2. Secondary: Google Maps DirectionsService (if available)
    if (!routePoints && window.google?.maps?.DirectionsService) {
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const result = await new Promise((resolve, reject) => {
          directionsService.route(
            {
              origin: { lat: origin.lat, lng: origin.lng },
              destination: { lat: destination.lat, lng: destination.lng },
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (res, status) => {
              if (status === window.google.maps.DirectionsStatus.OK && res?.routes?.length) {
                resolve(res);
              } else {
                reject(new Error(status));
              }
            }
          );
        });
        if (result?.routes?.[0]?.overview_path) {
          const points = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
          if (points.length >= 2) {
            console.debug("[Routes] Used Google DirectionsService");
            routePoints = points;
          }
        }
      } catch (dirErr) {
        console.debug("[Routes] DirectionsService unavailable:", dirErr?.message);
      }
    }

    if (routePoints && routePoints.length >= 2) {
      applyRoadRoute(routePoints, animate);
      return;
    }

    // 3. Fallback: Straight dashed line while loading or unavailable
    console.debug("[Routes] Used straight-line fallback");
    drawStraightLine(origin, destination);
  }


  // ── Show / hide route and ambulance marker based on status ─────────────────
  function applyVisibility(currentSc) {
    const show = isActiveStatus(currentSc);
    if (markerRef.current) markerRef.current.setVisible(show);
    if (polylineRef.current) polylineRef.current.setVisible(show);
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setVisible(!isTerminalStatus(currentSc));
    }
  }

  // ── Update lastLocationMarker (yellow tail dot) ────────────────────────────
  function updateLastLocationMarker(mergedItem) {
    if (!mapInstanceRef.current) return;
    const historyPoints = extractTrackCoordinates(mergedItem).filter((p) => p.type === "history");
    const lastH = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
    if (!lastH) {
      if (lastLocationMarkerRef.current) lastLocationMarkerRef.current.setMap(null);
      return;
    }
    // If the last history point is right at the active ambulance position, hide redundant overlapping dot
    if (prevPosRef.current && Math.abs(lastH.lat - prevPosRef.current.lat) < 0.0001 && Math.abs(lastH.lng - prevPosRef.current.lng) < 0.0001) {
      if (lastLocationMarkerRef.current) lastLocationMarkerRef.current.setMap(null);
      return;
    }
    const pos = { lat: lastH.lat, lng: lastH.lng };
    if (lastLocationMarkerRef.current) {
      lastLocationMarkerRef.current.setPosition(pos);
      lastLocationMarkerRef.current.setMap(mapInstanceRef.current);
    } else {
      lastLocationMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: "Last Recorded Location",
        icon: {
          url:
            "data:image/svg+xml," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0891b2" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/></svg>'
            ),
          scaledSize: new window.google.maps.Size(16, 16),
          anchor: new window.google.maps.Point(8, 8),
        },
      });
    }
  }

  // ── Apply tracking update to map ───────────────────────────────────────────
  function applyTrackingToMap(data) {
    if (!mapInstanceRef.current) return;
    const currentSc = normalizeStatus(data?.status || "");

    applyVisibility(currentSc);

    const mergedItem = {
      ...(data?.raw || {}),
      ...(data || {}),
      pickup_lat: pickupLat ?? data?.pickupLat ?? data?.raw?.pickup_lat,
      pickup_lng: pickupLng ?? data?.pickupLng ?? data?.raw?.pickup_lng,
      pickup_address: pickupAddress ?? data?.pickupAddress ?? data?.raw?.pickup_address,
      patient_name: patientName ?? data?.patientName ?? data?.raw?.patient_name,
      contact_number: contactNumber ?? data?.contactNumber ?? data?.raw?.requester_phone,
    };

    // 1. Raw Origin (Ambulance): Use raw current_location only (matching RN)
    const rawLoc =
      data?.current_location ||
      data?.location ||
      data?.currentLocation ||
      data?.live_location ||
      data?.raw?.current_location;
    const rawLat =
      rawLoc?.latitude ??
      rawLoc?.lat ??
      data?.latitude ??
      data?.current_lat ??
      data?.driver_latitude ??
      data?.raw?.latitude;
    const rawLng =
      rawLoc?.longitude ??
      rawLoc?.lng ??
      data?.longitude ??
      data?.current_lng ??
      data?.driver_longitude ??
      data?.raw?.longitude;
    const ambLat = toCoord(rawLat);
    const ambLng = toCoord(rawLng);
    const ambPos = ambLat != null && ambLng != null ? { lat: ambLat, lng: ambLng } : null;

    // 2. Pickup Coordinate
    const pLat = toCoord(pickupLat ?? data?.pickupLat ?? data?.pickup_lat ?? data?.raw?.pickup_lat);
    const pLng = toCoord(pickupLng ?? data?.pickupLng ?? data?.pickup_lng ?? data?.raw?.pickup_lng);
    const pickupPos = pLat != null && pLng != null ? { lat: pLat, lng: pLng } : null;

    // 3. Drop / Hospital Coordinate
    const dLat = toCoord(data?.drop_lat ?? data?.dropLat ?? data?.raw?.drop_lat);
    const dLng = toCoord(data?.drop_lng ?? data?.dropLng ?? data?.raw?.drop_lng);
    const dropPos = dLat != null && dLng != null ? { lat: dLat, lng: dLng } : null;

    // 4. Destination by phase: "np" -> pickup; "ph" -> drop/hospital (matching RN)
    const tripType = String(data?.type || data?.raw?.type || "").toLowerCase();
    const isPatientToHospital = tripType === "ph";
    const targetPos = isPatientToHospital && dropPos ? dropPos : pickupPos;

    // Re-fit camera bounds when phase changes ("np" -> "ph")
    if (lastTripTypeRef.current && lastTripTypeRef.current !== tripType) {
      if (ambPos && targetPos) {
        const b = new window.google.maps.LatLngBounds();
        b.extend(ambPos);
        b.extend(targetPos);
        mapInstanceRef.current.fitBounds(b, { top: 60, bottom: 80, left: 40, right: 40 });
      }
    }
    lastTripTypeRef.current = tripType;

    // Initial camera fitting (matching RN)
    if (!hasFitInitialBoundsRef.current && ambPos && targetPos) {
      hasFitInitialBoundsRef.current = true;
      const b = new window.google.maps.LatLngBounds();
      b.extend(ambPos);
      b.extend(targetPos);
      mapInstanceRef.current.fitBounds(b, { top: 60, bottom: 80, left: 40, right: 40 });
    }

    const hasAmb = ambPos != null;
    const hasPickup = pickupPos != null;
    const showRoute = isActiveStatus(currentSc);

    // ── Ambulance marker ──────────────────────────────────────────────────
    if (hasAmb && showRoute) {
      const prev = prevPosRef.current;

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: ambPos,
          map: mapInstanceRef.current,
          title: "Ambulance",
          icon: {
            url: makeAmbulanceSvg(lastRotationRef.current),
            scaledSize: new window.google.maps.Size(48, 34),
            anchor: new window.google.maps.Point(24, 17),
          },
          zIndex: 10,
        });

        if (infoWindowRef.current) {
          markerRef.current.addListener("click", () => {
            const sc2 = normalizeStatus(data?.status || "");
            const col = STATUS_COLORS[sc2] || STATUS_COLORS.requested;
            infoWindowRef.current.setContent(buildAmbInfoContent(data, col));
            infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
          });
        }
      }

      if (prev) {
        glideMarker(prev, ambPos);
      } else {
        markerRef.current.setPosition(ambPos);
        markerRef.current.setIcon({
          url: makeAmbulanceSvg(lastRotationRef.current),
          scaledSize: new window.google.maps.Size(48, 34),
          anchor: new window.google.maps.Point(24, 17),
        });
      }

      prevPosRef.current = ambPos;

      if (infoWindowRef.current && infoWindowRef.current.getMap()) {
        const sc2 = normalizeStatus(data?.status || "");
        const col = STATUS_COLORS[sc2] || STATUS_COLORS.requested;
        infoWindowRef.current.setContent(buildAmbInfoContent(data, col));
      }

      // Sync pickup marker position (DO NOT add hospital marker)
      if (hasPickup) {
        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.setPosition(pickupPos);
        } else {
          pickupMarkerRef.current = new window.google.maps.Marker({
            position: pickupPos,
            map: mapInstanceRef.current,
            title: "Pickup Location",
            icon: {
              url: PICKUP_SVG_URL,
              scaledSize: new window.google.maps.Size(28, 35),
              anchor: new window.google.maps.Point(14, 35),
            },
            zIndex: 8,
          });
          pickupMarkerRef.current.addListener("click", () => {
            infoWindowRef.current.setContent(buildPickupInfoContent());
            infoWindowRef.current.open(mapInstanceRef.current, pickupMarkerRef.current);
          });
        }
      }

      // ── Client-side Route Trimming between API fetches (matching RN) ───────
      if (roadCoordsRef.current && roadCoordsRef.current.length >= 2) {
        const trimmed = trimPolyline(roadCoordsRef.current, ambPos);
        roadCoordsRef.current = trimmed;
        if (polylineRef.current) {
          polylineRef.current.setPath(trimmed);
        }
      }

      // ── Route refresh rules (matching RN exactly) ──────────────────────────
      if (targetPos) {
        const now = Date.now();
        if (now >= routeBackoffUntilRef.current) {
          const targetChanged =
            !lastRouteDestRef.current || distanceMeters(lastRouteDestRef.current, targetPos) > 50;
          const lastOrigin = lastRouteOriginRef.current;
          const movedSignificantly =
            !lastOrigin || distanceMeters(lastOrigin, ambPos) >= ROUTE_MIN_MOVE_METERS;
          const dueForRefresh = now - lastRouteFetchTsRef.current > ROUTE_REFRESH_INTERVAL_MS;

          const shouldFetch =
            targetChanged ||
            (roadCoordsRef.current.length === 0 && now - lastRouteFetchTsRef.current > 15000) ||
            (movedSignificantly && now - lastRouteFetchTsRef.current > 20000) ||
            (dueForRefresh && lastOrigin && distanceMeters(lastOrigin, ambPos) > 50);

          if (shouldFetch) {
            lastRouteOriginRef.current = ambPos;
            lastRouteDestRef.current = targetPos;
            lastRouteFetchTsRef.current = now;
            const animateOnMove = roadCoordsRef.current.length > 0;
            fetchRoadRoute(ambPos, targetPos, animateOnMove);
          }
        }
      }
    } else if (!showRoute) {
      if (markerRef.current) markerRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setPath([]);
      roadCoordsRef.current = [];
    }

    updateLastLocationMarker(mergedItem);
  }

  // ── InfoWindow HTML builders ───────────────────────────────────────────────
  function buildAmbInfoContent(data, col) {
    const sc2 = normalizeStatus(data?.status || "");
    return `
      <div style="font-size:13px;padding:4px 0;min-width:160px">
        <div style="font-weight:700;margin-bottom:4px">Ambulance ${data?.ambulanceNo || ""}</div>
        <div style="margin-bottom:4px">
          <span style="background:${col.bg};color:${col.color};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;border:1px solid ${col.border}">
            ${STATUS_LABELS[sc2] || data?.status || "Tracking"}
          </span>
        </div>
        ${data?.driverName ? `<div style="margin-top:4px">Driver: ${data.driverName}</div>` : ""}
        ${data?.driverPhone ? `<div style="margin-top:2px"><a href="tel:${data.driverPhone}" style="color:#2563eb">${data.driverPhone}</a></div>` : ""}
        ${data?.eta != null ? `<div style="margin-top:4px">ETA: ${data.eta} min</div>` : ""}
      </div>
    `;
  }

  function buildPickupInfoContent() {
    return `
      <div style="font-size:13px;padding:4px 0;min-width:160px">
        <div style="font-weight:700;margin-bottom:4px">Pickup Location</div>
        ${patientName ? `<div style="margin-top:2px">Patient: ${patientName}</div>` : ""}
        ${contactNumber ? `<div style="margin-top:2px"><a href="tel:${contactNumber}" style="color:#2563eb">${contactNumber}</a></div>` : ""}
        ${pickupAddress ? `<div style="margin-top:4px;color:#64748b;font-size:11px">${pickupAddress}</div>` : ""}
      </div>
    `;
  }

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapsLoaded || mapInstanceRef.current || !mapRef.current) return;

    const mergedInit = {
      ...(tracking?.raw || {}),
      ...(tracking || {}),
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
    };
    const coords = getCoordinates(mergedInit);

    const lat = coords.lat ?? DEFAULT_CENTER[0];
    const lng = coords.lng ?? DEFAULT_CENTER[1];

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: coords.pickupLat != null ? 15 : 14,
        disableDefaultUI: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        rotateControl: false,
        scaleControl: false,
        cameraControl: false,
        tilt: 0,
        gestureHandling: "auto",
      });

      mapInstanceRef.current = map;

      // Blue route polyline with increased thickness
      polylineRef.current = new window.google.maps.Polyline({
        map,
        path: [],
        strokeColor: "#2563eb",
        strokeOpacity: 0.95,
        strokeWeight: 7,
        icons: [],
        zIndex: 5,
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();

      // Pickup marker (red person pin)
      const pLat = parseCoordVal(pickupLat ?? coords.pickupLat);
      const pLng = parseLngVal(pickupLng ?? coords.pickupLng);
      if (pLat != null && pLng != null) {
        pickupMarkerRef.current = new window.google.maps.Marker({
          position: { lat: pLat, lng: pLng },
          map,
          title: "Pickup Location",
          icon: {
            url: PICKUP_SVG_URL,
            scaledSize: new window.google.maps.Size(28, 35),
            anchor: new window.google.maps.Point(14, 35),
          },
          zIndex: 8,
        });

        pickupMarkerRef.current.addListener("click", () => {
          infoWindowRef.current.setContent(buildPickupInfoContent());
          infoWindowRef.current.open(map, pickupMarkerRef.current);
        });
      }
    } catch (e) {
      console.error("Error initializing Google Map:", e);
      setError(e.message || "Failed to initialize map");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  // ── Keep pickup marker position synced if props change ─────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const pLat = parseCoordVal(pickupLat);
    const pLng = parseLngVal(pickupLng);
    if (pickupMarkerRef.current && pLat != null && pLng != null) {
      pickupMarkerRef.current.setPosition({ lat: pLat, lng: pLng });
    }
  }, [pickupLat, pickupLng]);

  // ── Polling loop (setTimeout-chained) ─────────────────────────────────────
  useEffect(() => {
    if (!requestId) return;
    if (!mapsLoaded) return; // wait until maps are ready so we can update markers

    setError(mapsError);

    let cancelled = false;
    pollingStoppedRef.current = false;
    let consecutiveStationaryTicks = 0;
    let lastPolledPos = null;

    function scheduleNext(customDelayMs) {
      if (cancelled || pollingStoppedRef.current) return;
      const delay = customDelayMs ?? POLL_INTERVAL_MS;
      pollingTimerRef.current = setTimeout(tick, delay);
    }

    async function tick() {
      if (cancelled || pollingStoppedRef.current) return;

      // Slow down when tab is in background to save server resources
      if (document.hidden) {
        scheduleNext(30000);
        return;
      }

      let data = null;
      try {
        data = await fetchTrackingData(requestId);
      } catch (err) {
        console.error("Tracking fetch error:", err);
      }

      if (cancelled) return;

      if (data) {
        setTracking(data);
        onTrackingDataRef.current?.(data);
        setLoading(false);
        setError(null);

        // Apply to map
        if (mapInstanceRef.current) {
          applyTrackingToMap(data);
        }

        const currentSc = normalizeStatus(data.status || "");
        if (isTerminalStatus(currentSc)) {
          pollingStoppedRef.current = true;
          return; // do not schedule next tick
        }

        // Check if ambulance moved or is stationary
        const curLat = data.latitude ?? data.currentLocation?.lat;
        const curLng = data.longitude ?? data.currentLocation?.lng;

        if (curLat != null && curLng != null) {
          const curPos = { lat: Number(curLat), lng: Number(curLng) };
          if (lastPolledPos) {
            const dist = distanceMeters(lastPolledPos, curPos);
            // If moved less than 15 meters, the vehicle is stationary (idle/parked/red light)
            if (dist < 15) {
              consecutiveStationaryTicks += 1;
            } else {
              // Ambulance is actively moving! Reset stationary counter to resume 10s polling
              consecutiveStationaryTicks = 0;
            }
          }
          lastPolledPos = curPos;
        } else {
          // No coordinates yet (e.g. pending dispatch)
          consecutiveStationaryTicks += 1;
        }

        // Adaptive polling interval based on stationary state:
        // Moving (0 stationary ticks): 10,000ms (10s)
        // Stationary 1-2 ticks: 20,000ms (20s)
        // Stationary 3+ ticks: 30,000ms (30s)
        let nextInterval = POLL_INTERVAL_MS;
        if (consecutiveStationaryTicks >= 3) {
          nextInterval = 30000;
        } else if (consecutiveStationaryTicks >= 1) {
          nextInterval = 20000;
        }

        scheduleNext(nextInterval);
      } else {
        setLoading(false);
        scheduleNext(POLL_INTERVAL_MS * 1.5);
      }
    }

    // Resume immediately when tab becomes visible again
    function handleVisibilityChange() {
      if (!document.hidden && !pollingStoppedRef.current && !cancelled) {
        // cancel pending timer and run a tick right now
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        tick();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // First tick immediately
    tick();

    return () => {
      cancelled = true;
      pollingStoppedRef.current = true;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, mapsLoaded]);

  // ── Stop polling when status becomes terminal ──────────────────────────────
  useEffect(() => {
    if (isTerminal) {
      pollingStoppedRef.current = true;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      cancelAnimations();
      // Hide route/markers
      if (markerRef.current) markerRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setPath([]);
      if (pickupMarkerRef.current) pickupMarkerRef.current.setVisible(false);
      roadCoordsRef.current = [];
      lastRouteOriginRef.current = null;
      lastRouteDestRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminal]);

  // ── Cleanup on full unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pollingStoppedRef.current = true;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      cancelAnimations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cancel handlers ────────────────────────────────────────────────────────
  const handleOpenCancelModal = (e) => {
    if (e) e.stopPropagation();
    setShowCancelModal(true);
  };

  const handleModalCancelled = (cancellationReason) => {
    setLocalStatus("cancelled");
    pollingStoppedRef.current = true;
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    cancelAnimations();
    if (tracking) {
      setTracking((prev) => (prev ? { ...prev, status: "cancelled", cancellationReason } : null));
    }
    onTrackingData?.({ ...(tracking || {}), status: "cancelled", cancellationReason });
    onCancelRequest?.(requestId, tracking, cancellationReason);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="live-tracker" style={{ height: "100%", width: "100%", borderRadius: "12px", overflow: "hidden", position: "relative", background: "var(--bg-app)" }}>
      {(!mapsLoaded && !isUsingFallback && !error) ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", color: "var(--text-muted)" }}>
          <div style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "12px" }}>Loading map…</span>
        </div>
      ) : (
        <>
          {isUsingFallback ? (
            /* ── Leaflet OpenStreetMap Fallback with Live Route & Tracking ── */
            <div style={{ height: "100%", width: "100%", position: "relative" }}>
              <MapContainer
                center={ambPos ? [ambPos.lat, ambPos.lng] : pickupPos ? [pickupPos.lat, pickupPos.lng] : DEFAULT_CENTER}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LeafletMapInstanceSync onMapReady={(m) => { leafletMapRef.current = m; }} />
                <LeafletFitBoundsHelper points={[ambPos, pickupPos].filter(Boolean)} />

                {/* History trail (past recorded ambulance route) */}
                {historyPoints.length >= 2 && (
                  <Polyline
                    positions={historyPoints.map((p) => [p.lat, p.lng])}
                    pathOptions={{
                      color: "#0891b2",
                      weight: 4,
                      opacity: 0.7,
                      dashArray: "6, 8",
                    }}
                  />
                )}

                {/* Live road route to destination */}
                {fallbackRoute.length >= 2 && isActive && (
                  <Polyline
                    positions={fallbackRoute.map((p) => [p.lat, p.lng])}
                    pathOptions={{
                      color: "#2563eb",
                      weight: 6,
                      opacity: 0.9,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                {/* Pickup Location Marker */}
                {pickupPos && !isTerminal && (
                  <Marker position={[pickupPos.lat, pickupPos.lng]} icon={makePickupLeafletIcon()}>
                    <Popup>
                      <div style={{ padding: "4px" }}>
                        <div style={{ fontWeight: 800, fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}>
                          Pickup Location
                        </div>
                        <div style={{ fontSize: "12px", color: "#334155" }}>
                          <strong>Patient:</strong> {patientName || tracking?.patientName || "Patient"}
                        </div>
                        {pickupAddress && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                            {pickupAddress}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Live Ambulance Location Marker */}
                {ambPos && isActive && (
                  <Marker position={[ambPos.lat, ambPos.lng]} icon={makeAmbulanceLeafletIcon(lastRotationRef.current || 0)}>
                    <Popup>
                      <div style={{ padding: "4px" }}>
                        <div style={{ fontWeight: 800, fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}>
                          🚑 Ambulance En Route
                        </div>
                        <div style={{ fontSize: "12px", color: "#334155" }}>
                          <strong>Driver:</strong> {driverDisplayName}
                        </div>
                        {tracking?.ambulanceNo && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            Vehicle: {tracking.ambulanceNo}
                          </div>
                        )}
                        {tracking?.eta && (
                          <div style={{ fontSize: "11px", color: "#0891b2", fontWeight: 700, marginTop: "4px" }}>
                            ETA: {tracking.eta} min
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          ) : (
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          )}

          {/* Floating ETA Badge (Top-Left) */}
          {showOverlays && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                zIndex: 1000,
                background: "#ffffff",
                padding: "4px 10px",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#1e293b",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Clock size={11} color="#64748b" />
              <span>
                ETA {tracking?.eta ? (String(tracking.eta).includes("min") ? tracking.eta : `${tracking.eta} min`) : "8 min"}
              </span>
            </div>
          )}

          {/* Floating Zoom Controls (Top-Right) */}
          <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", flexDirection: "column", gap: "3px", zIndex: 1000 }}>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 15) + 1);
                } else if (leafletMapRef.current) {
                  leafletMapRef.current.zoomIn();
                }
              }}
              style={{ width: "26px", height: "26px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              title="Zoom in"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 15) - 1);
                } else if (leafletMapRef.current) {
                  leafletMapRef.current.zoomOut();
                }
              }}
              style={{ width: "26px", height: "26px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              title="Zoom out"
            >
              <Minus size={13} />
            </button>
          </div>


          {/* Bottom Driver / Address / Status overlay bar (only if not hideBottomBar) */}
          {!hideBottomBar && (
            <div
              className="live-tracker-bottom-bar"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(255, 255, 255, 0.97)",
                backdropFilter: "blur(12px)",
                borderTop: "1px solid var(--border)",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                zIndex: 10,
                boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "180px" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: isCancelled
                      ? "rgba(220, 38, 38, 0.12)"
                      : isAwaitingDriver
                        ? "rgba(245, 158, 11, 0.12)"
                        : "var(--primary-light)",
                    border: `1.5px solid ${isCancelled
                        ? "rgba(220, 38, 38, 0.35)"
                        : isAwaitingDriver
                          ? "rgba(245, 158, 11, 0.35)"
                          : "rgba(46,102,110,0.25)"
                      }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {isCancelled ? (
                    <XCircle size={15} color="#dc2626" />
                  ) : (
                    <Truck size={15} color={isAwaitingDriver ? "#d97706" : "var(--primary)"} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "800",
                        color: isCancelled ? "#dc2626" : isAwaitingDriver ? "#b45309" : "var(--text-main)",
                        letterSpacing: "-0.01em",
                        lineHeight: "1.2"
                      }}
                    >
                      {driverDisplayName}
                    </span>
                    {isAwaitingDriver && !isCancelled && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#b45309",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          lineHeight: "1.2"
                        }}
                      >
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", animation: "pulse-dot 1.5s infinite" }} />
                        Searching
                      </span>
                    )}
                    {isCancelled && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: "rgba(220, 38, 38, 0.12)",
                          color: "#dc2626",
                          border: "1px solid rgba(220, 38, 38, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          lineHeight: "1.2"
                        }}
                      >
                        Cancelled
                      </span>
                    )}
                  </div>
                  {pickupAddress && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: "2px",
                        lineHeight: "1.2"
                      }}
                      title={pickupAddress}
                    >
                      {pickupAddress}
                    </div>
                  )}
                </div>
              </div>

              <div className="live-tracker-badges" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {/* Cancel Request button */}
                {isRequested && !isCancelled && (
                  <button
                    type="button"
                    onClick={handleOpenCancelModal}
                    className="live-tracker-cancel-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "10px",
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                      lineHeight: "1.2",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#b91c1c"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#dc2626"; }}
                    title="Cancel ambulance request"
                  >
                    <XCircle size={14} color="#ffffff" />
                    <span>Cancel Request</span>
                  </button>
                )}

                {!isCancelled && tracking?.eta && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--primary-light)", padding: "3px 8px", borderRadius: "12px", border: "1px solid rgba(46,102,110,0.15)" }}>
                    <Clock size={11} color="var(--primary)" />
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>{tracking.eta} min</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
        @media (max-width: 520px) {
          .live-tracker-bottom-bar {
            padding: 8px 10px !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
          }
          .live-tracker-badges {
            gap: 4px !important;
          }
        }
        @media (max-width: 380px) {
          .live-tracker-bottom-bar {
            padding: 6px 8px !important;
          }
          .live-tracker-cancel-btn {
            padding: 5px 9px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      <CancelAmbulanceModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        requestId={requestId}
        onCancelled={handleModalCancelled}
      />
    </div>
  );
}
