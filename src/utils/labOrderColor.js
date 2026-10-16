// Picks an accent colour for a lab order card based on keywords in the test name.
// Shared by the Labs "My Orders" strip and the Orders page so a test gets the same colour in both.
const orderColorRules = [
  { match: /hba1c|glucose|sugar|diabet|insulin|glycosylated/, color: "#E11D48" },
  { match: /lipid|cholesterol|triglycer|cardiac|troponin|heart|hdl|ldl/, color: "#DB2777" },
  { match: /thyroid|\btsh\b|\bt3\b|\bt4\b/, color: "#7C3AED" },
  { match: /liver|\blft\b|bilirubin|sgot|sgpt|\balt\b|\bast\b|albumin|globulin|protein/, color: "#D97706" },
  { match: /kidney|\bkft\b|renal|creatinine|urea|uric|urine/, color: "#0891B2" },
  { match: /vitamin|\bb12\b|\bd3\b|\biron\b|ferritin|calcium/, color: "#16A34A" },
  { match: /bone|joint|arthritis/, color: "#64748B" },
  { match: /\bcbc\b|blood count|hemoglobin|haemoglobin|platelet|\besr\b/, color: "#DC2626" },
  { match: /pregnan|\bhcg\b|fertility|\bamh\b|prolactin/, color: "#EC4899" },
  { match: /cancer|tumou?r|\bpsa\b|\bcea\b|\bca[- ]?125\b/, color: "#9333EA" },
  { match: /covid|allergy|lung|respirat/, color: "#0EA5E9" },
  { match: /full body|package|checkup|profile/, color: "#2563EB" },
];

export function getLabOrderColor(name) {
  const text = String(name || "").toLowerCase();
  return orderColorRules.find((r) => r.match.test(text))?.color || "var(--primary)";
}
