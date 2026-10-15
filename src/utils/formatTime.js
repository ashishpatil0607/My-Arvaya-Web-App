/**
 * Display-only: converts 24-hr times inside a slot label (e.g. "13:00 - 13:30") to 12-hr ("1:00 PM - 1:30 PM").
 * Use only for rendering; keep the original slot value for booking/API calls.
 */
export function toDisplayTime(str) {
  if (!str || typeof str !== "string" || /\b(am|pm)\b/i.test(str)) return str;
  return str.replace(/\b(\d{1,2}):(\d{2})\b/g, (match, h, m) => {
    let hour = parseInt(h, 10);
    if (hour > 23) return match;
    const ampm = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${m} ${ampm}`;
  });
}
