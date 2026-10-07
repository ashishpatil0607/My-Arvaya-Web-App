import React, { useState, useEffect, useRef } from "react";
import { Truck, Clock, Plus, Minus, MapPin, XCircle } from "lucide-react";
import { fetchTrackingData, GOOGLE_MAPS_API_KEY } from "../../services/ambulanceService";
import CancelAmbulanceModal from "./CancelAmbulanceModal";
import useGoogleMapsScript from "./useGoogleMapsScript";

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
const POLL_INTERVAL_MS = 10000;
const ACTIVE_STATUSES = new Set(["requested", "assigned", "dispatched", "arriving"]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "cancel", "unavailable", "delayed"]);

// ─── SVG icon helpers ────────────────────────────────────────────────────────

function makeAmbulanceSvg(rotation = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <g transform="rotate(${rotation} 18 18)">
      <rect x="4" y="10" width="28" height="18" rx="3" fill="#ef4444"/>
      <rect x="4" y="10" width="28" height="18" rx="3" fill="white" fill-opacity="0.15"/>
      <rect x="6" y="12" width="14" height="10" rx="1.5" fill="white" fill-opacity="0.9"/>
      <rect x="22" y="12" width="8" height="10" rx="1.5" fill="white" fill-opacity="0.9"/>
      <rect x="7" y="13" width="5" height="8" rx="1" fill="#3b82f6" fill-opacity="0.5"/>
      <rect x="13" y="13" width="5" height="8" rx="1" fill="#3b82f6" fill-opacity="0.5"/>
      <rect x="15" y="15" width="4" height="1.5" rx="0.75" fill="#ef4444"/>
      <rect x="16.25" y="14" width="1.5" height="4" rx="0.75" fill="#ef4444"/>
      <circle cx="10" cy="29" r="3.5" fill="#1e293b"/>
      <circle cx="10" cy="29" r="1.8" fill="#94a3b8"/>
      <circle cx="26" cy="29" r="3.5" fill="#1e293b"/>
      <circle cx="26" cy="29" r="1.8" fill="#94a3b8"/>
      <rect x="2" y="14" width="3" height="5" rx="1" fill="#fbbf24"/>
      <rect x="31" y="14" width="3" height="5" rx="1" fill="#fbbf24"/>
    </g>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
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

/** Calculate great-circle distance between two { lat, lng } points in meters (Haversine). */
function distanceMeters(p1, p2) {
  if (!p1 || !p2) return Infinity;
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

  const roadPoints = coords.map((c) => ({ lat: c[1], lng: c[0] }));

  // Connect startPoint (ambulance) to road if there's any gap
  if (distanceMeters(startPoint, roadPoints[0]) > 1) {
    roadPoints.unshift({ lat: startPoint.lat, lng: startPoint.lng });
  }

  // Connect end of road route directly into endPoint (pickup / user icon) to close any gap
  if (distanceMeters(endPoint, roadPoints[roadPoints.length - 1]) > 1) {
    roadPoints.push({ lat: endPoint.lat, lng: endPoint.lng });
  }

  return roadPoints;
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
  const polylineRef = useRef(null);
  const routeDrawnRef = useRef(false);       // track if animated draw already done

  // Animation frame handles
  const glideRafRef = useRef(null);
  const drawRafRef = useRef(null);

  // Polling
  const pollingTimerRef = useRef(null);
  const pollingStoppedRef = useRef(false);

  // Track last ambulance position for bearing & glide
  const prevPosRef = useRef(null);
  const lastRotationRef = useRef(0);

  // Track last routed ambulance & pickup positions to avoid redundant route API calls
  const lastRoutedAmbPosRef = useRef(null);
  const lastRoutedPickupPosRef = useRef(null);

  // Directions failure counter (for straight-line fallback)
  const directionFailsRef = useRef(0);

  // Keep stable ref to callback
  const onTrackingDataRef = useRef(onTrackingData);
  useEffect(() => { onTrackingDataRef.current = onTrackingData; }, [onTrackingData]);

  // Component state
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localStatus, setLocalStatus] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { loaded: mapsLoaded, error: mapsError } = useGoogleMapsScript(GOOGLE_MAPS_API_KEY);

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

  // ── Cancel animation frames on unmount ─────────────────────────────────────
  function cancelAnimations() {
    if (glideRafRef.current) { cancelAnimationFrame(glideRafRef.current); glideRafRef.current = null; }
    if (drawRafRef.current)  { cancelAnimationFrame(drawRafRef.current);  drawRafRef.current  = null; }
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
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18),
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
  function drawStraightLine(ambPos, pickupPos) {
    if (!polylineRef.current) return;
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    polylineRef.current.setPath([ambPos, pickupPos]);
    polylineRef.current.setOptions({
      strokeColor: "#2563eb",
      strokeOpacity: 0,
      icons: [{
        icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, scale: 6 },
        offset: "0",
        repeat: "22px",
      }],
    });
  }

  // ── Request a route and update polyline ────────────────────────────────────
  async function refreshRoute(ambPos, pickupPos, animate = false) {
    if (!polylineRef.current) return;

    // 1. Primary: Use OSRM for road-snapped routing (identical to Admin panel)
    try {
      const snapped = await snapRoute(ambPos, pickupPos);
      if (snapped && snapped.length >= 2) {
        directionFailsRef.current = 0;
        polylineRef.current.setOptions({
          strokeColor: "#2563eb",
          strokeOpacity: 0.95,
          strokeWeight: 7,
          icons: [],
        });

        if (animate) {
          animateRouteDraw(snapped, 800);
        } else {
          polylineRef.current.setPath(snapped);
        }

        // Fit map bounds around the road route
        if (mapInstanceRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          snapped.forEach((p) => bounds.extend(p));
          mapInstanceRef.current.fitBounds(bounds, { top: 60, bottom: 80, left: 40, right: 40 });
        }
        return;
      }
    } catch (osrmErr) {
      console.warn("OSRM road route failed, trying fallback:", osrmErr);
    }

    // 2. Secondary fallback: Google DirectionsService
    if (window.google?.maps?.DirectionsService) {
      try {
        const svc = new window.google.maps.DirectionsService();
        svc.route(
          {
            origin: ambPos,
            destination: pickupPos,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result?.routes?.length) {
              directionFailsRef.current = 0;
              const rawPath =
                result.routes[0].overview_path ||
                result.routes[0].legs?.flatMap((leg) =>
                  leg.steps?.flatMap((step) => step.path || []) || []
                ) || [];

              const path = rawPath.map((p) =>
                typeof p?.lat === "function" ? { lat: p.lat(), lng: p.lng() } : p
              );

              // Connect directly to ambulance and pickup to eliminate any gaps
              if (path.length > 0 && distanceMeters(ambPos, path[0]) > 1) {
                path.unshift({ lat: ambPos.lat, lng: ambPos.lng });
              }
              if (path.length > 0 && distanceMeters(pickupPos, path[path.length - 1]) > 1) {
                path.push({ lat: pickupPos.lat, lng: pickupPos.lng });
              }

              polylineRef.current?.setOptions({
                strokeColor: "#2563eb",
                strokeOpacity: 0.95,
                strokeWeight: 7,
                icons: [],
              });

              if (animate) {
                animateRouteDraw(path, 800);
              } else {
                polylineRef.current?.setPath(path);
              }

              if (mapInstanceRef.current && path.length) {
                const bounds = new window.google.maps.LatLngBounds();
                path.forEach((p) => bounds.extend(p));
                mapInstanceRef.current.fitBounds(bounds, { top: 60, bottom: 80, left: 40, right: 40 });
              }
              return;
            }

            // Both failed
            directionFailsRef.current += 1;
            console.warn("Google Directions failed:", status);
            if (directionFailsRef.current >= 3) {
              drawStraightLine(ambPos, pickupPos);
            }
          }
        );
        return;
      } catch (gErr) {
        console.warn("Directions routing error:", gErr);
      }
    }

    // 3. Fallback straight line
    directionFailsRef.current += 1;
    if (directionFailsRef.current >= 3) {
      drawStraightLine(ambPos, pickupPos);
    }
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
    if (!lastH) return;
    const pos = { lat: lastH.lat, lng: lastH.lng };
    if (lastLocationMarkerRef.current) {
      lastLocationMarkerRef.current.setPosition(pos);
    } else {
      lastLocationMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: "Last Recorded Location",
        icon: {
          url:
            "data:image/svg+xml," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>'
            ),
          scaledSize: new window.google.maps.Size(22, 22),
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

    const trackPoints = extractTrackCoordinates(mergedItem);

    // Pickup location point
    const pickupPt = trackPoints.find((p) => p.type === "pickup") || (() => {
      const pLat = parseCoordVal(pickupLat ?? data?.pickupLat);
      const pLng = parseLngVal(pickupLng ?? data?.pickupLng);
      return pLat !== null && pLng !== null ? { lat: pLat, lng: pLng } : null;
    })();

    // Ambulance location point
    const currentPt = trackPoints.slice().reverse().find((p) => p.type === "current") || (() => {
      const cLat = parseCoordVal(data?.latitude ?? data?.currentLocation);
      const cLng = parseLngVal(data?.longitude ?? data?.currentLocation);
      return cLat !== null && cLng !== null ? { lat: cLat, lng: cLng } : null;
    })();

    const hasAmb = currentPt != null;
    const hasPickup = pickupPt != null;
    const showRoute = isActiveStatus(currentSc);

    // ── Ambulance marker ──────────────────────────────────────────────────
    if (hasAmb && showRoute) {
      const newPos = { lat: currentPt.lat, lng: currentPt.lng };
      const prev = prevPosRef.current;

      if (!markerRef.current) {
        // create on first appearance
        markerRef.current = new window.google.maps.Marker({
          position: newPos,
          map: mapInstanceRef.current,
          title: "Ambulance",
          icon: {
            url: makeAmbulanceSvg(lastRotationRef.current),
            scaledSize: new window.google.maps.Size(36, 36),
            anchor: new window.google.maps.Point(18, 18),
          },
          zIndex: 10,
        });

        // InfoWindow for ambulance marker
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
        glideMarker(prev, newPos);
      } else {
        markerRef.current.setPosition(newPos);
        markerRef.current.setIcon({
          url: makeAmbulanceSvg(lastRotationRef.current),
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18),
        });
      }

      prevPosRef.current = newPos;

      // Keep InfoWindow content fresh
      if (infoWindowRef.current && infoWindowRef.current.getMap()) {
        const sc2 = normalizeStatus(data?.status || "");
        const col = STATUS_COLORS[sc2] || STATUS_COLORS.requested;
        infoWindowRef.current.setContent(buildAmbInfoContent(data, col));
      }

      // Sync pickup marker position if pickup is available
      if (hasPickup) {
        const pickupPos = { lat: pickupPt.lat, lng: pickupPt.lng };
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

        // Route: only call route API if distance has moved by >= 10m or on first draw
        const firstDraw = !routeDrawnRef.current;
        const lastAmb = lastRoutedAmbPosRef.current;
        const lastPickup = lastRoutedPickupPosRef.current;
        const ambDist = lastAmb ? distanceMeters(lastAmb, newPos) : Infinity;
        const pickupDist = lastPickup ? distanceMeters(lastPickup, pickupPos) : Infinity;
        const distanceMoved = ambDist >= 10 || pickupDist >= 10;
        const shouldCallRouteApi = firstDraw || distanceMoved;

        if (shouldCallRouteApi) {
          // On initial page/modal load: directly show route (no animation delay)
          // When ambulance moves: show smooth animation
          const animateOnMove = !firstDraw;
          refreshRoute(newPos, pickupPos, animateOnMove);
          routeDrawnRef.current = true;
          lastRoutedAmbPosRef.current = newPos;
          lastRoutedPickupPosRef.current = pickupPos;
        }
      }
    } else if (!showRoute) {
      // terminal — clear route, hide marker
      if (markerRef.current) markerRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setPath([]);
    }

    // ── Update location history tail marker ───────────────────────────────
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

    function scheduleNext() {
      if (cancelled || pollingStoppedRef.current) return;
      pollingTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    }

    async function tick() {
      if (cancelled || pollingStoppedRef.current) return;

      // Pause when tab is hidden
      if (document.hidden) {
        scheduleNext();
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
      } else {
        setLoading(false);
      }

      scheduleNext();
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
      routeDrawnRef.current = false;
      lastRoutedAmbPosRef.current = null;
      lastRoutedPickupPosRef.current = null;
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
      {(!mapsLoaded && !error && !mapsError) ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", color: "var(--text-muted)" }}>
          <div style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "12px" }}>Loading map…</span>
        </div>
      ) : (mapsError || error) ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px", color: "var(--text-muted)", padding: "16px", textAlign: "center" }}>
          <MapPin size={24} color="var(--danger)" />
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {(mapsError?.message || error?.message || "Map failed to load")}
          </span>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                delete window.google;
                window.location.reload();
              }
            }}
            style={{ padding: "4px 12px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-main)", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

          {/* Floating ETA Badge (Top-Left) */}
          {showOverlays && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                zIndex: 4,
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
          <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", flexDirection: "column", gap: "3px", zIndex: 4 }}>
            <button
              type="button"
              onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 15) + 1); }}
              style={{ width: "26px", height: "26px", borderRadius: "6px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              title="Zoom in"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 15) - 1); }}
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
                  border: `1.5px solid ${
                    isCancelled
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
