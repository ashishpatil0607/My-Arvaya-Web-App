/* ─── Individual Lab Tests shared by Labs & AllLabTests ───
   Fallback list is shown when /api/diagnostic/getTests returns nothing
   (e.g. user not logged in → API responds 401 "Token not provided"). */
export const fallbackLabTests = [
  {
    id: "lt-1",
    title: "BILIRUBIN DIRECT",
    category: "Fluid Bilirubin",
    department: "Liver Care",
    price: 150,
    oldPrice: 250,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-2",
    title: "BILIRUBIN INDIRECT",
    category: "Fluid Bilirubin",
    department: "Liver Care",
    price: 150,
    oldPrice: 250,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  },
  {
    id: "lt-3",
    title: "BLOOD SUGAR FASTING",
    category: "Renal & Metabolic Function",
    department: "Diabetes",
    price: 100,
    oldPrice: 180,
    discount: "44% OFF",
    fasting: "8-10 Hrs Fasting",
    reportTime: "12 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-4",
    title: "COMPLETE BLOOD COUNT (CBC)",
    category: "Hematology Profile",
    department: "Blood",
    price: 299,
    oldPrice: 500,
    discount: "40% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-5",
    title: "THYROID STIMULATING HORMONE (TSH)",
    category: "Endocrine Profile",
    department: "Thyroid",
    price: 220,
    oldPrice: 400,
    discount: "45% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-6",
    title: "LIPID PROFILE TOTAL",
    category: "Cardiac Risk Panel",
    department: "Heart",
    price: 499,
    oldPrice: 900,
    discount: "44% OFF",
    fasting: "10-12 Hrs Fasting",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  },
  {
    id: "lt-7",
    title: "HbA1c GLYCATED HEMOGLOBIN",
    category: "3-Month Diabetes Monitor",
    department: "Diabetes",
    price: 350,
    oldPrice: 600,
    discount: "41% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: true
  },
  {
    id: "lt-8",
    title: "VITAMIN D3 (25-OH)",
    category: "Bone & Immune Health",
    department: "Vitamins",
    price: 599,
    oldPrice: 1200,
    discount: "50% OFF",
    fasting: "No Fasting Required",
    reportTime: "24 Hours",
    img: "/lab_test_sample.png",
    popular: false
  }
];
