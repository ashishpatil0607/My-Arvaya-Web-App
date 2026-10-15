import { useState, useEffect } from "react";

// ─── Map script loader ───────────────────────────────────────────────────────

export default function useGoogleMapsScript(apiKey, libraries = []) {
  const [loaded, setLoaded] = useState(() =>
    Boolean(typeof window !== "undefined" && window.google && window.google.maps)
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!apiKey) {
      setError(new Error("Google Maps API key is missing"));
      return;
    }

    if (window.google && window.google.maps) {
      setLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      const handleLoad = () => setLoaded(true);
      const handleError = () => setError(new Error("Failed to load Google Maps script"));
      existing.addEventListener("load", handleLoad);
      existing.addEventListener("error", handleError);
      return () => {
        existing.removeEventListener("load", handleLoad);
        existing.removeEventListener("error", handleError);
      };
    }

    const libs = libraries.join(",");
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libs}&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => setLoaded(true);
    script.onerror = () => setError(new Error("Failed to load Google Maps script"));

    document.head.appendChild(script);

    return () => {};
  }, [apiKey, libraries.join(",")]);

  return { loaded, error };
}
