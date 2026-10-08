import { api } from "./api";
import { getImageUrl } from "./uploadService";
import { slots as mockSlots, packages as mockPackages } from "../mocks/data";
const USE_MOCK = true; // Forced static data for the dashboard after login

export function getStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("arvaya_user"));
    return user?.id || user?.user_id || user?.app_user_id || null;
  } catch {
    return null;
  }
}


/**
 * Helper to build/normalize filters array of objects:
 * [
 *   { column: "is_active", operator: "=", value: 1 },
 *   { column: "client_id", operator: "IN", value: [10, 20, 30] },
 *   { column: "created_modified_date", operator: "BETWEEN", value: ["2026-01-01", "2026-12-31"] }
 * ]
 */
export function buildFiltersArray(filtersParam = {}, defaultFilters = []) {
  let filtersArray = [];
  const nonFilterKeys = [
    "pageIndex", "pageSize", "sortKey", "sortValue",
    "page_index", "page_size", "sort_key", "sort_value",
    "filters", "filter", "filterQuery", "page", "limit", "sort", "order"
  ];

  if (Array.isArray(filtersParam)) {
    filtersArray = [...filtersParam];
  } else if (filtersParam && typeof filtersParam === "object") {
    const { filters, filter, filterQuery, ...rest } = filtersParam;

    if (Array.isArray(filters)) {
      filtersArray = [...filters];
    } else {
      Object.entries(rest).forEach(([key, val]) => {
        if (nonFilterKeys.includes(key)) return;
        if (val !== undefined && val !== null && val !== "") {
          let operator = "=";
          if (Array.isArray(val)) {
            operator = key.includes("date") || key.includes("between") ? "BETWEEN" : "IN";
          }
          filtersArray.push({
            column: key,
            operator: operator,
            value: val
          });
        }
      });
    }
  }

  if (Array.isArray(defaultFilters)) {
    defaultFilters.forEach(defFilter => {
      if (defFilter && defFilter.column) {
        const exists = filtersArray.some(f => f.column === defFilter.column);
        if (!exists) {
          filtersArray.push(defFilter);
        }
      }
    });
  }

  return filtersArray;
}

/* ─── Patients / App Users ─── */
export async function getPatients(filtersParam = {}) {
  try {
    const storedUserId = getStoredUserId();
    const defaultFilters = storedUserId
      ? [{ column: "id", operator: "=", value: Number(storedUserId) || storedUserId }]
      : [];

    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);
    const payload = { filters: filtersArray };

    const res = await api.post("/api/appUser/get", payload);
    return res?.data || res?.patients || res?.list || res?.result || res?.UserData || res || [];
  } catch (err) {
    console.error("getPatients error:", err);
    return [];
  }
}

export async function updateAppUser(payload) {
  try {
    const res = await api.post("/api/appUser/upsert", payload);
    return res?.data || res?.result || res;
  } catch (err) {
    console.error("updateAppUser error:", err);
    throw err;
  }
}


/* ─── Family Details ─── */
export async function getFamilyDetails(filtersParam = {}) {
  try {
    const storedUserId = getStoredUserId();
    const appUserId =
      (typeof filtersParam === "object" && !Array.isArray(filtersParam)
        ? filtersParam.app_user_id || filtersParam.user_id || filtersParam.appUserId
        : null) || storedUserId || 107602;

    const defaultFilters = [
      { column: "user_id", operator: "=", value: Number(appUserId) || appUserId }
    ];

    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);

    let extraPayload = {};
    if (typeof filtersParam === "object" && !Array.isArray(filtersParam)) {
      const { filters, filter, filterQuery, ...rest } = filtersParam;
      extraPayload = rest;
    }

    const payload = {
      user_id: Number(appUserId) || appUserId,
      filters: filtersArray,
      ...extraPayload
    };

    const res = await api.post("/api/familyDetails/get", payload);
    const data = res?.data || res?.list || res?.result || res?.familyDetails || [];
    const primaryAccount = res?.primary_account;

    const list = Array.isArray(data) ? data.slice() : [];

    if (primaryAccount) {
      list.unshift({ ...primaryAccount, isPrimary: true });
    }

    return list;
  } catch (err) {
    console.error("getFamilyDetails error:", err);
    return [];
  }
}

export async function upsertFamilyDetails(payload) {
  try {
    let genderCode = payload.gender || "M";
    const lower = String(genderCode).trim().toLowerCase();
    if (lower.startsWith("f")) genderCode = "F";
    else if (lower.startsWith("m")) genderCode = "M";
    else if (lower.startsWith("o")) genderCode = "O";

    const formattedPayload = {
      ...payload,
      gender: genderCode
    };

    const res = await api.post("/api/familyDetails/upsert", formattedPayload);
    return res?.data || res?.result || res;
  } catch (err) {
    console.error("upsertFamilyDetails error:", err);
    throw err;
  }
}

export async function addFamilyMember(payload) {
  try {
    let genderCode = payload.gender || "M";
    const lower = String(genderCode).trim().toLowerCase();
    if (lower.startsWith("f")) genderCode = "F";
    else if (lower.startsWith("m")) genderCode = "M";
    else if (lower.startsWith("o")) genderCode = "O";

    const formattedPayload = {
      ...payload,
      gender: genderCode
    };

    const res = await api.post("/api/familyDetails/addFamilyMember", formattedPayload);
    return res?.data || res?.result || res;
  } catch (err) {
    console.error("addFamilyMember error:", err);
    throw err;
  }
}



function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("arvaya_user"));
    return user?.user_id || 1;
  } catch {
    return 1;
  }
}

function mapDoctor(d) {
  const loc = d.locations && d.locations[0];
  const hospital = loc ? (loc.locname || loc.name || "") : "";
  const city = loc ? loc.city || "" : "";
  const specialty = Array.isArray(d.speciality) ? d.speciality.join(", ") : (d.speciality || "");
  return {
    ...d,
    id: d.drkey || d.id,
    name: (d.name || "").trim(),
    qualification: d.ug_degree ? d.ug_degree.replace(/<[^>]+>/g, "").trim() : "",
    specialty,
    hospital,
    city,
    locations: d.locations || [],
    consultationFee: d.amount ? `₹${parseFloat(d.amount).toFixed(0)}` : "",
    gender: d.gender || "",
    mobile: d.mobile || "",
    blocked: d.blocked || false,
    image: (d.profile_image || d.image || d.photo)
      ? getImageUrl(d.profile_image || d.image || d.photo, 'doctorProfileImage')
      : `https://ui-avatars.com/api/?name=${encodeURIComponent((d.name || "Dr").trim())}&background=2e666e&color=fff&size=150`,
    experienceText: d.experience ? `${parseInt(d.experience)} Years` : "10+ Years",
    experience: d.experience ? `${parseInt(d.experience)}` : "10+",
    fee: d.amount ? parseInt(d.amount) : 500,
    rating: d.rating ? parseFloat(d.rating) : null,
    reviews: d.reviews ? parseInt(d.reviews) : null,
  };
}

/* ─── Doctors ─── */
export async function getDoctors(filters = {}) {

  const payload = {
    pageIndex: filters.pageIndex || 1,
    pageSize: filters.pageSize || 10,
    sortKey: filters.sortKey || "",
    sortValue: filters.sortValue || "desc",
    filter: filters.filter || "",
    entitylocation: filters.location_key || "",
  };

  const isLoggedIn = typeof window !== 'undefined' && (!!localStorage.getItem("arvaya_token") || !!localStorage.getItem("arvaya_user"));
  const endpoint = isLoggedIn ? "/api/get/dr/admin-secure-hospitals" : "/get-doctors";

  const res = await api.post(endpoint, payload);
  const data = res?.dr || res?.data?.dr || res?.data || res || [];
  return {
    list: Array.isArray(data) ? data.map(mapDoctor) : [],
    count: res?.count || res?.data?.count || data.length || 0,
  };
}

let cachedLocationsPromise = null;

export async function getLocations(pageIndex = 1, pageSize = 10, filter = "") {
  const isCacheable = pageIndex === 1 && !filter && pageSize >= 10;

  if (isCacheable && cachedLocationsPromise) {
    return cachedLocationsPromise;
  }

  const payload = {
    pageIndex,
    pageSize,
    sortKey: "",
    sortValue: "desc",
    filter
  };

  const requestPromise = api.post("/get-hospitals-locations", payload).then(res => ({
    list: res?.entitylocations || res?.data?.entitylocations || [],
    count: res?.count || res?.data?.count || 100
  })).catch(err => {
    if (isCacheable) cachedLocationsPromise = null;
    throw err;
  });

  if (isCacheable) {
    cachedLocationsPromise = requestPromise;
  }

  return requestPromise;
}

export async function getHospitalsForLocation(locationKey) {
  const payload = {
    pageIndex: 1,
    pageSize: 100,
    sortKey: "",
    sortValue: "desc",
    filter: "",
    entitylocation: locationKey
  };

  const isLoggedIn = typeof window !== 'undefined' && (!!localStorage.getItem("arvaya_token") || !!localStorage.getItem("arvaya_user"));
  const endpoint = isLoggedIn ? "/api/get/dr/admin-secure-hospitals" : "/get-doctors";
  const res = await api.post(endpoint, payload);
  const data = res?.dr || res?.data?.dr || res?.data || res || [];

  const uniqueHospitals = [];
  const map = new Map();

  data.forEach(d => {
    const loc = d.locations && d.locations[0];
    if (loc) {
      const name = loc.locname || loc.name || loc.alt_name || "";
      if (name && !map.has(name)) {
        map.set(name, true);
        uniqueHospitals.push({
          ...loc,
          id: loc.id || loc.entitylocation || name,
          name: name,
          city: loc.city || "",
          entitylocation: loc.entitylocation || locationKey
        });
      }
    }
  });

  return uniqueHospitals;
}

export async function getDoctor(id) {
  const payload = {
    pageIndex: 1,
    pageSize: 100,
    sortKey: "id",
    sortValue: "desc",
    filter: "",
  };

  const isLoggedIn = typeof window !== 'undefined' && (!!localStorage.getItem("arvaya_token") || !!localStorage.getItem("arvaya_user"));
  const endpoint = isLoggedIn ? "/api/get/dr/admin-secure-hospitals" : "/get-doctors";

  const res = await api.post(endpoint, payload);
  const data = res?.dr || res?.data?.dr || res?.data || [];
  const doc = data.find(u => (u.drkey || u.id) === id) || data[0];
  return doc ? mapDoctor(doc) : {};
}

export async function getDoctorSlots(doctorId, dateObj) {
  let dStr = dateObj;
  if (typeof dateObj !== 'string' && dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    dStr = `${year}${month}${day}`;
  }

  const payload = {
    entitykey: "secure-hospitals",
    startdate: dStr,
    enddate: dStr,
    drkey: doctorId
  };

  try {
    const res = await api.post("/api/calendar/secure-hospitals", payload);
    return res?.data || res || [];
  } catch (err) {
    console.error("Failed to fetch slots", err);
    return [];
  }
}

export async function getPlans(filters = {}) {
  try {
    const res = await api.post("/api/plan/get", filters);
    return res?.data || res?.plans || res?.result || res?.list || res || [];
  } catch (err) {
    console.error("getPlans error:", err);
    return [];
  }
}

/* ─── Banners ─── */
export async function getBanners(filtersParam = {}) {
  try {
    const defaultFilters = [{ column: "is_active", operator: "=", value: 1 }];
    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);
    const payload = {
      filters: filtersArray
    };
    const res = await api.post("/banner/get", payload);
    return res?.data || res?.result || res?.list || res || [];
  } catch (error) {
    console.error("Failed to fetch banners", error);
    return [];
  }
}

export async function upsertPlan(data) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/plan/upsert", data);
}

function mapTest(t) {
  return {
    ...t,
    id: t.id,
    title: t.name,
    tests: t.test_category_name,
    price: t.price ? `₹${t.price}` : null,
    oldPrice: t.oldPrice ? `₹${t.oldPrice}` : null,
  };
}

/* ─── Lab Tests / Packages ─── */
export async function getLabPackages(filters = {}) {
  if (USE_MOCK) return getPlans({ type: "lab" }); // fallback for mock

  const payload = {
    pageIndex: filters.pageIndex || 1,
    pageSize: filters.pageSize || 10,
    sortKey: filters.sortKey || "id",
    sortValue: filters.sortValue || "desc",
    filter: filters.filter || "",
  };

  const res = await api.post("/api/test/get", payload);
  const data = res.data || [];
  return Array.isArray(data) ? data.map(mapTest) : [];
}

export async function getDiagnosticTests(filters = {}) {
  try {
    const payload = {
      pageIndex: filters.pageIndex || 1,
      pageSize: filters.pageSize || 300,
      sortKey: filters.sortKey || "id",
      sortValue: filters.sortValue || "desc",
      filter: filters.filter || "",
      search: filters.search || filters.q || "",
      q: filters.q || filters.search || "",
      ...filters
    };
    const res = await api.post("/api/diagnostic/getTests", payload);
    const list = res?.data || res?.tests || res?.list || res?.result || res || [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("getDiagnosticTests API error:", err);
    return [];
  }
}

export async function getDiagnosticPackages(filters = {}) {
  try {
    const payload = {
      pageIndex: filters.pageIndex || 1,
      pageSize: filters.pageSize || 200,
      sortKey: filters.sortKey || "id",
      sortValue: filters.sortValue || "desc",
      filter: filters.filter || "",
      search: filters.search || filters.q || "",
      q: filters.q || filters.search || "",
      ...filters
    };
    const res = await api.post("/api/diagnostic/getPackages", payload);
    const list = res?.data || res?.packages || res?.list || res?.result || res || [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("getDiagnosticPackages API error:", err);
    return [];
  }
}

export async function getLabOrderHistory(patient_id, options = {}) {
  try {
    const extraParams = typeof options === 'object' && options !== null ? options : { pageSize: options };
    const pSize = Number(extraParams.pageSize) || 10;
    const pNum = Number(extraParams.page || extraParams.pageIndex) || 1;
    const offset = (pNum - 1) * pSize;

    const payload = {
      patient_id,
      pageSize: pSize,
      pageIndex: pNum,
      page: pNum,
      limit: pSize,
      offset: offset,
      ...extraParams
    };

    const res = await api.post("/api/lims/laborder/history", payload);

    // Extract list: handles { "data": [...], "count": 17 } exactly matching backend response
    const rawList =
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.data?.orders ||
      res?.data?.list ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      res?.list ||
      res?.orders ||
      res?.result ||
      (Array.isArray(res) ? res : []);

    const allItems = Array.isArray(rawList) ? rawList : [];

    // Extract total count from { "count": 17 } or fallback count properties
    const totalCount =
      res?.count ??
      res?.totalCount ??
      res?.total ??
      res?.total_records ??
      res?.total_count ??
      res?.data?.count ??
      res?.data?.totalCount ??
      res?.data?.total ??
      allItems.length;

    // If server returned all records in one array (e.g. 17 items all at once),
    // dynamically slice for the requested page so exactly pSize (10) records are returned:
    let pageItems = allItems;
    if (allItems.length > pSize) {
      pageItems = allItems.slice(offset, offset + pSize);
    }

    const resultList = pageItems.map((item, idx) => ({
      ...item,
      id: item.order_id || item.lab_order_id || item.id || `LAB-${item.created_at || (offset + idx)}-${offset + idx}`,
    }));

    resultList.total = totalCount;
    resultList.count = totalCount;
    resultList.totalPages = Math.max(1, Math.ceil(totalCount / pSize));
    resultList.page = pNum;
    resultList.pageSize = pSize;
    resultList.raw = res;

    return resultList;
  } catch (err) {
    console.error("getLabOrderHistory API error:", err);
    return [];
  }
}

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function createLabOrder(payload) {
  const res = await api.post("/api/lims/laborder/create-order", payload);
  return res.data || res;
}

export async function verifyLabPayment(payload) {
  const res = await api.post("/api/lims/laborder/verify-payment", payload);
  return res.data || res;
}

export async function getPatientReviews(filters = {}) {
  try {
    const payload = {
      pageIndex: filters.pageIndex || 1,
      pageSize: filters.pageSize || 10,
      sortKey: filters.sortKey || "id",
      sortValue: filters.sortValue || "desc",
      filter: filters.filter || " and is_active=1",
      ...filters
    };
    const res = await api.post("/api/patientReview/get", payload);
    const list = res?.data || res?.result || res || [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("getPatientReviews API error:", err);
    return [];
  }
}

/* ─── Forms ─── */
export async function getForms(filters = {}) {
  if (USE_MOCK) return [];
  // POST api/form/get
  const res = await api.post("/api/form/get", filters);
  return res.data || res;
}

export async function createForm(data) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/form/create", data);
}

export async function updateForm(data) {
  if (USE_MOCK) return { success: true };
  return api.put("/api/form/update", data);
}

/* ─── Roles ─── */
export async function getRoles(filters = {}) {
  if (USE_MOCK) return [];
  const res = await api.post("/api/role/get", filters);
  return res.data || res;
}

export async function createRole(data) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/role/create", data);
}

export async function updateRole(data) {
  if (USE_MOCK) return { success: true };
  return api.put("/api/role/update", data);
}

export async function getRoleDetails(filters = {}) {
  if (USE_MOCK) return [];
  const res = await api.post("/api/roleDetails/getData", filters);
  return res.data || res;
}

export async function addBulkRoleDetails(data) {
  if (USE_MOCK) return { success: true };
  return api.post("/api/roleDetails/addBulk", data);
}

/* ─── Appointments / Bookings (via form) ─── */
export async function bookAppointment(data) {
  const res = await api.post("/api/appointments/create-order", data);
  return res.data || res;
}

export async function verifyPayment(data) {
  const res = await api.post("/api/appointments/verify-payment", data);
  return res.data || res;
}

export async function getWalletAmount(patient_id) {
  try {
    const res = await api.post("/api/appointments/get-wallet-amount", { patient_id });
    return res?.data || res || { balance: 0 };
  } catch (err) {
    console.error("getWalletAmount error:", err);
    return { balance: 0 };
  }
}
export async function getAppointmentHistory(patient_id) {
  try {
    const res = await api.post("/api/appointments/history", { patient_id });
    return res?.data || res?.history || res?.appointments || res?.result || res?.list || res || [];
  } catch (err) {
    console.error("getAppointmentHistory error:", err);
    return [];
  }
}

export async function getLoyaltyConfig(filters = {}) {
  try {
    const payload = {
      pageIndex: filters.pageIndex || 1,
      pageSize: filters.pageSize || 100,
      sortKey: filters.sortKey || "id",
      sortValue: filters.sortValue || "desc",
      filterQuery: filters.filterQuery || "and is_active=1",
      filter: filters.filter || "and is_active=1",
      is_active: 1,
      ...filters
    };
    const res = await api.post("/api/loyalty/get", payload);
    const data = res?.data || res?.list || res?.config || res?.result || (Array.isArray(res) ? res : []);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getLoyaltyConfig error:", err);
    return [];
  }
}

export const getLoyaltyRedemptionConfig = getLoyaltyConfig;


export async function getPatientLoyalty(patient_id) {
  try {
    const payload = {
      patient_id,
      id: patient_id,
      user_id: patient_id,
      app_user_id: patient_id
    };
    const res = await api.post("/api/loyalty/get-patient-loyalty", payload);
    return res?.data || res || {};
  } catch (err) {
    console.error("getPatientLoyalty error:", err);
    return {};
  }
}

export async function redeemLoyaltyPoints(patient_id, points_to_redeem) {
  try {
    const payload = {
      patient_id,
      points_to_redeem
    };
    const res = await api.post("/api/loyalty/redeem", payload);
    return res?.data || res?.result || res || {};
  } catch (err) {
    console.error("redeemLoyaltyPoints error:", err);
    throw err;
  }
}

export async function getLoyaltyHistory(patient_id) {
  try {
    const payload = {
      patient_id
    };
    const res = await api.post("/api/loyalty/history", payload);
    return res?.data || res?.history || res?.list || res?.transactions || res?.logs || res?.result || (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error("getLoyaltyHistory error:", err);
    return [];
  }
}
export async function checkVisitType(payload) {
  const res = await api.post("/api/appointments/check-visit-type", payload);
  return res?.data || res || {};
}

// keepalive lets the request finish even if the tab is closing
export async function releaseSlot(payload, { keepalive = false } = {}) {
  const res = await api.post("/api/appointments/release-slot", payload, {}, { keepalive });
  return res?.data || res || {};
}

/* ─── Reports ─── */
export async function getPatientPaymentsReport(filters = {}) {
  if (USE_MOCK) {
    return {
      balance: 1250,
      transactions: [
        { id: 1, title: "Cashback – Dr. Priya", amount: "+₹50", date: "10 Jul 2026", type: "credit" },
        { id: 2, title: "Consultation Fee", amount: "-₹600", date: "08 Jul 2026", type: "debit" },
        { id: 3, title: "Referral Bonus", amount: "+₹200", date: "05 Jul 2026", type: "credit" },
        { id: 4, title: "Lab Test Payment", amount: "-₹799", date: "02 Jul 2026", type: "debit" },
      ],
    };
  }
  // POST api/reports/getPatientPaymentsReport
  const res = await api.post("/api/reports/getPatientPaymentsReport", filters);
  return res.data || res;
}

export async function getReferralReport(filters = {}) {
  if (USE_MOCK) {
    return {
      points: 2450,
      history: [
        { id: 1, title: "Appointment Booking", points: "+100", date: "10 Jul 2026" },
        { id: 2, title: "Profile Completed", points: "+50", date: "08 Jul 2026" },
        { id: 3, title: "Referral – Amit", points: "+200", date: "05 Jul 2026" },
      ],
    };
  }
  // POST api/reports/getReferralReport
  const res = await api.post("/api/reports/getReferralReport", filters);
  return res.data || res;
}

export async function getRecentReferralActivity(filters = {}) {
  if (USE_MOCK) return [];
  const res = await api.post("/api/reports/getRecentReferralActivity", filters);
  return res.data || res;
}

export async function getRewardsReport(filters = {}) {
  if (USE_MOCK) {
    return {
      points: 2450,
      history: [
        { id: 1, title: "Appointment Booking", points: "+100", date: "10 Jul 2026" },
        { id: 2, title: "Profile Completed", points: "+50", date: "08 Jul 2026" },
        { id: 3, title: "Referral – Amit", points: "+200", date: "05 Jul 2026" },
        { id: 4, title: "Lab Test Booking", points: "+75", date: "01 Jul 2026" },
      ],
    };
  }
  // POST api/reports/getRewardsReport
  const res = await api.post("/api/reports/getRewardsReport", filters);
  return res.data || res;
}

export async function getRewardDistributionLogs(filters = {}) {
  if (USE_MOCK) return [];
  const res = await api.post("/api/reports/getRewardDistributionLogs", filters);
  return res.data || res;
}

/* ─── Wallet (uses payment report) ─── */
export async function getWallet() {
  return getPatientPaymentsReport();
}

/* ─── Rewards (uses rewards report) ─── */
export async function getRewards() {
  return getRewardsReport();
}


/* ─── Health Records ─── */
export async function getRecords(filtersParam = {}) {
  try {
    const storedUserId = getStoredUserId();
    const appUserId =
      (typeof filtersParam === "object" && filtersParam !== null && !Array.isArray(filtersParam)
        ? filtersParam.app_user_id || filtersParam.user_id || filtersParam.appUserId
        : null) || storedUserId;

    const defaultFilters = [
      ...(appUserId ? [{ column: "app_user_id", operator: "=", value: Number(appUserId) || appUserId }] : []),
      { column: "is_active", operator: "=", value: 1 }
    ];

    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);

    let extraPayload = {};
    if (typeof filtersParam === "object" && filtersParam !== null && !Array.isArray(filtersParam)) {
      const { filters, filter, filterQuery, ...rest } = filtersParam;
      extraPayload = rest;
    }

    const payload = {
      ...(appUserId ? { app_user_id: Number(appUserId) || appUserId } : {}),
      filters: filtersArray,
      ...extraPayload
    };

    const res = await api.post("/api/patientHealthRecord/get", payload);
    const rawList = res?.data || res?.list || res?.records || res?.result || res?.UserData || (Array.isArray(res) ? res : []);
    const count = res?.count || res?.totalCount || res?.total || (Array.isArray(rawList) ? rawList.length : 0);

    const mappedList = Array.isArray(rawList) ? rawList.map(r => {
      const rawFile = r.file_url || r.file_path || r.file_name || r.url || r.file || "";
      const filePath = (rawFile && rawFile !== "null" && rawFile !== "undefined") ? String(rawFile).trim() : "";
      const resolvedUrl = filePath ? getImageUrl(filePath, "HealthRecords") : null;
      return {
        id: r.id || r.record_id || Math.random(),
        title: r.title || r.name || r.record_name || r.file_name || "Health Record",
        doctor: r.hospital_name || r.lab_name || r.doctor_name || r.doctor || r.hospital || r.created_by_name || "Consultant",
        hospital_name: r.hospital_name || r.lab_name || r.hospital || r.doctor_name || r.doctor || "Consultant",
        date: r.created_modified_date
          ? new Date(r.created_modified_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : r.created_date
            ? new Date(r.created_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : (r.date || "Recent"),
        type: r.document_name || r.document_type_name || r.document_type || r.type_name || r.type || r.record_type || r.category || "Diagnostic",
        document_name: r.document_name || r.document_type_name || r.document_type || r.type_name || "",
        filePath: filePath,
        fileUrl: resolvedUrl,
        raw: r
      };
    }) : [];

    return { list: mappedList, count: count || mappedList.length };
  } catch (err) {
    console.error("getRecords API error:", err);
    return { list: [], count: 0 };
  }
}

/* ─── Appointments ─── */
export async function getAppointments(filters = {}) {
  try {
    const storedUserId = getStoredUserId();
    const payload = {
      patientId: storedUserId,
      ...filters
    };
    const res = await api.post("/api/appointments/getPatientAppointments", payload);
    const rawList = res?.data || res?.list || res?.appointments || res?.result || (Array.isArray(res) ? res : []);

    const mapped = Array.isArray(rawList) ? rawList.map(apt => {
      let mappedStatus = (apt.appointment_status || apt.status || "upcoming").toLowerCase();
      if (mappedStatus === "confirmed") mappedStatus = "upcoming";

      return {
        id: apt.appointment_id || apt.id || apt._id || Math.random(),
        doctor: apt.name || apt.doctor_name || apt.doctor || "Consultant",
        specialty: apt.speciality || apt.specialty || apt.department_name || "Specialist",
        date: apt.appointment_date || apt.date || new Date().toISOString(),
        time: apt.appointment_time || apt.time || "10:00 AM",
        type: apt.appointment_type || apt.consultation_type || apt.type || "In-Person",
        hospital: apt.hospital_name || apt.hospital || apt.clinic || "Arvaya Health",
        status: mappedStatus,
        amount: apt.amount || "0.00",
        patientName: apt.patient_name || "",
        patientMobile: apt.patient_mobile || "",
        image: apt.image || apt.doctor_image || "https://i.pravatar.cc/150",
        raw: apt
      };
    }) : [];

    mapped.count = res?.count ?? mapped.length;
    mapped.total = res?.count ?? res?.total ?? mapped.length;
    mapped.totalPages = res?.totalPages ?? Math.max(1, Math.ceil((mapped.total || mapped.length) / (filters.pageSize || 10)));
    return mapped;
  } catch (err) {
    console.error("getAppointments error:", err);
    return [];
  }
}

export async function cancelAppointment(payload) {
  try {
    const res = await api.post("/api/appointments/cancel", payload);
    return res?.data || res;
  } catch (err) {
    console.error("cancelAppointment error:", err);
    throw err;
  }
}

export async function rescheduleAppointment(payload) {
  try {
    const res = await api.post("/api/appointments/reschedule", payload);
    return res?.data || res;
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    throw err;
  }
}

/* ─── Notifications ─── */
export async function getNotifications(filtersParam = {}) {
  try {
    const storedUserId = getStoredUserId();
    const userId =
      (typeof filtersParam === "object" && filtersParam !== null && !Array.isArray(filtersParam)
        ? filtersParam.user_id || filtersParam.userId || filtersParam.app_user_id
        : null) || storedUserId;

    const defaultFilters = [
      ...(userId ? [{ column: "user_id", operator: "=", value: Number(userId) || userId }] : []),
      { column: "is_active", operator: "=", value: 1 }
    ];

    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);

    let extraPayload = {};
    if (typeof filtersParam === "object" && filtersParam !== null && !Array.isArray(filtersParam)) {
      const { filters, filter, filterQuery, ...rest } = filtersParam;
      extraPayload = rest;
    }

    const payload = {
      ...(userId ? { user_id: Number(userId) || userId } : {}),
      filters: filtersArray,
      ...extraPayload
    };

    const res = await api.post("/api/notification/get", payload);
    const data = res?.data || res?.list || res?.notifications || res?.result || (Array.isArray(res) ? res : []);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getNotifications error:", err);
    return [];
  }
}

/* ─── Document Types ─── */
export async function getDocumentTypes(filtersParam = {}) {
  try {
    const defaultFilters = [{ column: "is_active", operator: "=", value: 1 }];
    const filtersArray = buildFiltersArray(filtersParam, defaultFilters);
    const payload = { filters: filtersArray };

    const res = await api.post("/api/documentType/get", payload);
    const list = res?.data || res?.list || res?.records || res?.result || (Array.isArray(res) ? res : []);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("getDocumentTypes error:", err);
    return [];
  }
}

