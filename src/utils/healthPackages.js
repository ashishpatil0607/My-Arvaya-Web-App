/* ─── Health Packages shared by Home & Labs ───
   Fallback list is shown when /api/diagnostic/getPackages returns nothing
   (e.g. user not logged in → API responds 401 "Token not provided"). */
export const fallbackHealthPackages = [
  {
    id: "pkg-1",
    title: "Ortho Robotics Package",
    category: "Bone & Joint Advanced",
    tests: "45+ Tests Included",
    price: 197380,
    oldPrice: 225000,
    discount: "12% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/full-body-checkup.png",
    badge: "Specialized"
  },
  {
    id: "pkg-2",
    title: "Paediatric Surgery 3A.S14.17143",
    category: "Child Health & Pre-Surgery",
    tests: "30+ Tests Included",
    price: 40000,
    oldPrice: 50000,
    discount: "20% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/thyroid-profile.png",
    badge: "Clinical"
  },
  {
    id: "pkg-3",
    title: "Comprehensive Full Body Checkup",
    category: "Complete Preventive Care",
    tests: "80+ Tests Included",
    price: 1499,
    oldPrice: 2300,
    discount: "35% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/images/full-body-checkup.png",
    badge: "Most Booked"
  },
  {
    id: "pkg-4",
    title: "Senior Citizen Diabetes & Cardiac Care",
    category: "Geriatric Special",
    tests: "55+ Tests Included",
    price: 799,
    oldPrice: 1200,
    discount: "33% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/images/diabetes.png",
    badge: "Popular for Seniors"
  },
  {
    id: "pkg-5",
    title: "Advanced Cardiac Health Profile",
    category: "Heart & Vascular Risk",
    tests: "40+ Tests Included",
    price: 1199,
    oldPrice: 1800,
    discount: "33% OFF",
    fasting: "Fasting Required",
    reportTime: "24 Hours",
    img: "/images/heart-health.png",
    badge: "Doctor Verified"
  }
];

// Maps a raw /api/diagnostic/getPackages item to the card shape used across pages
export function normalizeHealthPackage(p, idx) {
  let rawTitle = p.package_name || p.name || p.title || `Health Package ${idx + 1}`;
  if (rawTitle.includes('-')) rawTitle = rawTitle.split('-')[0].trim();
  const priceVal = parseFloat(p.package_price || p.price || p.cost || p.amount || 999);
  const oldPriceVal = Math.round(priceVal * 1.25);
  const itemCount = Array.isArray(p.subitems) && p.subitems.length > 0
    ? `${p.subitems.length}+ Tests Included`
    : "30+ Tests Included";
  const lower = rawTitle.toLowerCase();

  return {
    id: p.rateplan_package_id || p.id || p.package_key || `api-pkg-${idx}`,
    title: rawTitle,
    category: p.category || p.package_category || "Comprehensive Health Care",
    tests: itemCount,
    subitems: Array.isArray(p.subitems) ? p.subitems : [],
    price: priceVal,
    oldPrice: oldPriceVal,
    discount: `${Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100)}% OFF`,
    fasting: p.fasting || (p.fasting_required ? "Fasting Required" : "10-12 Hrs Fasting"),
    reportTime: p.reportTime || p.report_time || "24 Hours",
    img: p.img || p.image || (lower.includes("diabet") ? "/images/diabetes.png" : lower.includes("heart") ? "/images/heart-health.png" : lower.includes("thyroid") ? "/images/thyroid-profile.png" : "/images/full-body-checkup.png"),
    badge: p.badge || (idx === 0 ? "Most Booked" : idx === 1 ? "Popular" : "Doctor Verified")
  };
}
