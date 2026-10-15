const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Baby", "Dr"];
// Title must be followed by a dot or space, so names like "Mrinal" are left alone
const TITLE_PREFIX_RE = new RegExp(`^(${TITLES.join("|")})(\\.\\s*|\\s+)`, "i");

// Remove a leading salutation: "Miss Snehal Pawar" / "Mr.Omkar Bhosale" -> "Snehal Pawar" / "Omkar Bhosale"
export function stripTitle(name) {
  return String(name || "").trim().replace(TITLE_PREFIX_RE, "").trim();
}

// First + last name initials, ignoring any salutation: "Mr Ashish Patil" -> "AP"
export function getNameInitials(name, fallback = "") {
  const parts = stripTitle(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
