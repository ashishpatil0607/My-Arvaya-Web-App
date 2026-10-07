import {
  Activity, FlaskConical, Heart, Droplets, Bone, Baby, Apple, Beaker, TestTube, Stethoscope
} from "lucide-react";

export default function LabItemIcon({ item, size = 38 }) {
  const value = `${item?.title || ""} ${item?.category || ""} ${item?.department || ""}`.toLowerCase();
  let Icon = FlaskConical;

  if (value.includes("diabetes") || value.includes("sugar") || value.includes("hba1c")) Icon = Droplets;
  else if (value.includes("liver") || value.includes("bilirubin")) Icon = Beaker;
  else if (value.includes("heart") || value.includes("cardiac") || value.includes("lipid")) Icon = Heart;
  else if (value.includes("thyroid") || value.includes("tsh")) Icon = Activity;
  else if (value.includes("blood") || value.includes("cbc") || value.includes("hematology")) Icon = TestTube;
  else if (value.includes("vitamin")) Icon = Apple;
  else if (value.includes("bone") || value.includes("ortho") || value.includes("joint")) Icon = Bone;
  else if (value.includes("paediatric") || value.includes("pediatric") || value.includes("child")) Icon = Baby;
  else if (value.includes("full body") || value.includes("preventive")) Icon = Stethoscope;

  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
