import {
  Activity, FlaskConical, Heart, Droplets, Bone, Baby, Apple, Beaker, TestTube, Stethoscope,
  Bean, Microscope, ShieldPlus, Dna, Wind, Sun, Zap, Flame, Brain, Syringe
} from "lucide-react";

export default function LabItemIcon({ item, size = 38 }) {
  const value = `${item?.title || ""} ${item?.name || ""} ${item?.service_name || ""} ${item?.category || ""} ${item?.department || ""}`.toLowerCase();
  const tokens = value.split(/[^a-z0-9]+/);
  // Short keywords (e.g. "lh", "t3", "ige") must match a whole word so "health" doesn't count as "lh".
  const has = (...words) => words.some((w) => (w.length <= 4 ? tokens.includes(w) : value.includes(w)));
  let Icon = FlaskConical;

  if (has("diabetes", "sugar", "glucose", "hba1c", "insulin")) Icon = Droplets;
  else if (has("liver", "bilirubin", "lft", "sgot", "sgpt", "alt", "ast", "alkaline phosphatase", "ggt")) Icon = Beaker;
  else if (has("heart", "cardiac", "lipid", "cholesterol", "triglyceride", "troponin", "hdl", "ldl")) Icon = Heart;
  else if (has("thyroid", "tsh", "t3", "t4")) Icon = Activity;
  else if (has("kidney", "renal", "kft", "rft", "creatinine", "urea", "bun", "uric", "albumin", "egfr")) Icon = Bean;
  else if (has("urine", "stool", "culture", "microscopy")) Icon = Microscope;
  else if (has("vitamin d", "vit d")) Icon = Sun;
  else if (has("vitamin", "b12", "folate", "folic")) Icon = Apple;
  else if (has("iron", "ferritin", "tibc", "transferrin")) Icon = Flame;
  else if (has("sodium", "potassium", "chloride", "electrolyte", "calcium", "magnesium", "phosphorus")) Icon = Zap;
  else if (has("hormone", "testosterone", "estrogen", "estradiol", "progesterone", "prolactin", "lh", "fsh", "cortisol", "amh")) Icon = Dna;
  else if (has("infection", "hiv", "hepatitis", "hbsag", "hcv", "dengue", "malaria", "typhoid", "widal", "covid", "crp", "esr", "antibod")) Icon = ShieldPlus;
  else if (has("allergy", "ige", "lung", "pulmonary", "asthma")) Icon = Wind;
  else if (has("blood", "cbc", "hemoglobin", "haemoglobin", "platelet", "hematology", "haematology", "wbc", "rbc")) Icon = TestTube;
  else if (has("bone", "ortho", "joint", "arthritis", "rheumat")) Icon = Bone;
  else if (has("paediatric", "pediatric", "child")) Icon = Baby;
  else if (has("brain", "neuro")) Icon = Brain;
  else if (has("vaccin", "injection")) Icon = Syringe;
  else if (has("full body", "preventive", "checkup", "check-up", "package")) Icon = Stethoscope;

  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
