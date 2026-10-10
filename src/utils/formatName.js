const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Baby", "Dr"];
// Title must be followed by a dot or space, so names like "Mrinal" are left alone
const TITLE_PREFIX_RE = new RegExp(`^(${TITLES.join("|")})(\\.\\s*|\\s+)`, "i");

// Remove a leading salutation: "Miss Snehal Pawar" / "Mr.Omkar Bhosale" -> "Snehal Pawar" / "Omkar Bhosale"
export function stripTitle(name) {
  return String(name || "").trim().replace(TITLE_PREFIX_RE, "").trim();
}
