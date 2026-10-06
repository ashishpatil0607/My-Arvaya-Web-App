import { Search, MapPin, ChevronDown, ChevronRight, ChevronLeft, Users, User, LogOut, Smartphone, HelpCircle, Menu, X, ArrowRight, Check, Stethoscope, FlaskConical, Building2, Settings, Bell, Gift, Send, Mail, Copy, Share2, Shield, Home, Wallet, Truck, Phone, Siren } from "lucide-react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useRef, useEffect, useMemo } from "react";
import { getLocations, getDoctors, getLabPackages } from "../../services/dataService";
import { useBooking } from "../../context/BookingContext";
import { fetchImageBlob, getImageUrl } from "../../services/uploadService";
import { getPatients } from "../../services/dataService";
import AmbulanceRequestModal from "../ambulance/AmbulanceRequestModal";

function getUserDisplayName(user) {
  if (!user) return "User";
  if (typeof user === "string") return user.replace(/\.\./g, ".");

  const rawName = user.name || user.full_name || user.fullName || user.user_name || user.userName;
  if (rawName && typeof rawName === "string" && !rawName.startsWith("User (") && rawName !== "User") {
    return rawName.replace(/\.\./g, ".");
  }

  const title = user.title ? user.title.trim() + " " : "";
  const firstName = user.first_name || user.firstName || "";
  const lastName = user.last_name || user.lastName || "";
  if (firstName || lastName) {
    return `${title}${firstName} ${lastName}`.trim().replace(/\.\./g, ".");
  }

  if (user.email) return user.email.split("@")[0];

  try {
    const storedUser = localStorage.getItem("arvaya_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const storedName = parsed?.name || parsed?.full_name || parsed?.fullName;
      if (storedName && !storedName.startsWith("User (") && storedName !== "User") {
        return storedName.replace(/\.\./g, ".");
      }
      const pFirst = parsed?.first_name || parsed?.firstName || "";
      const pLast = parsed?.last_name || parsed?.lastName || "";
      if (pFirst || pLast) {
        return `${pFirst} ${pLast}`.trim().replace(/\.\./g, ".");
      }
    }
  } catch (e) { }

  return ((rawName && rawName !== "User") ? rawName : "User").replace(/\.\./g, ".");
}

function getUserPhone(user) {
  if (!user) return "";
  const rawPhone = user.phone || user.mobile_number || user.mobile || user.mobile_no || user.phone_number || user.phoneNumber;
  if (!rawPhone) return "";
  const cleanPhone = String(rawPhone).trim();
  if (cleanPhone.startsWith("+91")) return cleanPhone;
  if (cleanPhone.startsWith("91") && cleanPhone.length === 12) return `+${cleanPhone}`;
  return `+91 ${cleanPhone}`;
}
export default function Header() {
  const { user, openLoginModal, logout, linkedProfiles, switchProfile } = useAuth();
  const { globalLocation, setGlobalLocation, setDoctor } = useBooking();
  const go = useNavigate();
  const location = useLocation();

  const headerRef = useRef(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const isCollapsibleRoute = location.pathname === "/pharmacy";

  // Publish the header's live rendered height as a CSS var so pages (e.g. Pharmacy's
  // sticky filter sidebar) can position themselves directly below it, including
  // smoothly while it collapses/expands.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      document.documentElement.style.setProperty("--app-header-height", `${el.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // On the Pharmacy page only: collapse the top header row once the user scrolls
  // past a small threshold, leaving just the secondary nav sticky at the top.
  useEffect(() => {
    if (!isCollapsibleRoute) {
      setIsHeaderCollapsed(false);
      return;
    }
    // Hysteresis: collapse and expand at different thresholds so scroll
    // jitter right at the boundary can't flip the state back and forth.
    const handleScroll = () => {
      setIsHeaderCollapsed((prev) => {
        if (prev) return window.scrollY > 8;
        return window.scrollY > 32;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isCollapsibleRoute]);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuTab, setProfileMenuTab] = useState("main");
  const [mobileDrawerTab, setMobileDrawerTab] = useState("main");
  const selectedCity = globalLocation ? (globalLocation.city || globalLocation.alt_name || globalLocation.name || "Unknown") : "Loading...";
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [q, setQ] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPillHovered, setIsPillHovered] = useState(false);
  const [headerAvatar, setHeaderAvatar] = useState("");
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCustomShareOpen, setIsCustomShareOpen] = useState(false);
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);

  const appDownloadUrl = "https://drive.google.com/file/d/136Lb50jdaadDi9_Uigmq-Qsu2zm9jx51/view?usp=sharing";

  const referralCode = useMemo(() => {
    return user?.referral_code || user?.referralCode || user?.id || user?.user_id || "0";
  }, [user]);

  const defaultShareMessage = useMemo(() => {
    return `🏥 Hi!\n\nI'm using Arvaya, a healthcare app that helps you manage your healthcare needs conveniently.\n\n🎁 Use my referral code: ${referralCode}\n\n💰 Sign up with this code and we both earn cashback rewards.\n\n📲 Download the app:\n${appDownloadUrl}\n\nSee you on Arvaya! 😊`;
  }, [referralCode, appDownloadUrl]);

  const customShareOptions = useMemo(() => [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      color: '#25D366',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      )
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: '#0088cc',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.74-.79 3.8-1.12 5.59-.14.76-.42 1.01-.69 1.04-.59.05-1.04-.39-1.61-.76-.89-.58-1.39-.94-2.26-1.51-1.01-.66-.35-1.02.22-1.61 1.5-1.53 2.75-2.77 2.78-2.82.04-.06.07-.2-.01-.27-.08-.07-.23-.05-.33-.03-.14.03-2.45 1.56-4.94 3.23-.36.25-.69.37-.99.36-.33 0-.96-.18-1.44-.34-.58-.19-1.05-.29-1.01-.62.02-.17.25-.35.69-.53 2.69-1.17 4.5-1.95 5.41-2.33 2.58-1.07 3.11-1.25 3.47-1.26.08 0 .25.02.36.11.09.08.12.18.13.27 0 .05-.01.15-.02.2z" />
        </svg>
      )
    },
    {
      id: 'teams',
      name: 'Teams',
      color: '#464EB8',
      icon: (
        <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
          <path d="M9.186 4.797a2.42 2.42 0 1 0-2.86-2.448h1.178c.929 0 1.682.753 1.682 1.682zm-4.295 7.738h2.613c.929 0 1.682-.753 1.682-1.682V5.58h2.783a.7.7 0 0 1 .682.716v4.294a4.197 4.197 0 0 1-4.093 4.293c-1.618-.04-3-.99-3.667-2.35Zm10.737-9.372a1.674 1.674 0 1 1-3.349 0 1.674 1.674 0 0 1 3.349 0m-2.238 9.488-.12-.002a5.2 5.2 0 0 0 .381-2.07V6.306a1.7 1.7 0 0 0-.15-.725h1.792c.39 0 .707.317.707.707v3.765a2.6 2.6 0 0 1-2.598 2.598z" />
          <path d="M.682 3.349h6.822c.377 0 .682.305.682.682v6.822a.68.68 0 0 1-.682.682H.682A.68.68 0 0 1 0 10.853V4.03c0-.377.305-.682.682-.682Zm5.206 2.596v-.72h-3.59v.72h1.357V9.66h.87V5.945z" />
        </svg>
      )
    },
    {
      id: 'twitter',
      name: 'Twitter (X)',
      color: '#000000',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      color: '#0A66C2',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    },
    {
      id: 'email',
      name: 'Gmail',
      color: '#EA4335',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      )
    },
    {
      id: 'sms',
      name: 'SMS',
      color: '#10B981',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      )
    },
    {
      id: 'copy',
      name: 'Copy Link',
      color: '#FB913F',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )
    }
  ], [referralCode, appDownloadUrl]);

  const handleShare = async (platform) => {
    // Copy formatted message to clipboard first so user can Ctrl+V in any desktop chat app (e.g. Teams, Slack)
    try {
      await navigator.clipboard.writeText(defaultShareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { }

    if (platform === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(defaultShareMessage)}`, '_self');
      return;
    }
    if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent("Join me on Arvaya")}&body=${encodeURIComponent(defaultShareMessage)}`, '_blank');
      return;
    }
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareMessage)}`, '_blank');
      return;
    }
    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(appDownloadUrl)}&text=${encodeURIComponent(defaultShareMessage)}`, '_blank');
      return;
    }
    if (platform === 'teams') {
      window.open(`https://teams.microsoft.com/share?href=${encodeURIComponent(appDownloadUrl)}&msgText=${encodeURIComponent(defaultShareMessage)}`, '_blank');
      return;
    }
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(defaultShareMessage)}`, '_blank');
      return;
    }
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appDownloadUrl)}`, '_blank');
      return;
    }
    if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appDownloadUrl)}`, '_blank');
      return;
    }

    if (platform === 'message' || platform === 'system' || !platform || typeof platform !== 'string') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Arvaya Health App',
            text: defaultShareMessage,
          });
          return;
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error("Share API error", e);
          }
        }
      }
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareMessage)}`, '_blank');
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(defaultShareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const searchContainerRef = useRef(null);
  const locationPickerRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);


  useEffect(() => {
    let isMounted = true;

    async function updateHeaderAvatar() {
      if (!user) {
        if (isMounted) setHeaderAvatar("");
        return;
      }
      try {
        const storedUser = localStorage.getItem("arvaya_user");
        let storedUserId = user?.id || user?.user_id || user?.app_user_id;
        if (!storedUserId && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            storedUserId = parsed?.id || parsed?.user_id || parsed?.app_user_id;
          } catch (e) { }
        }

        const mobile = user?.phone || user?.mobile_number || user?.mobile;
        const filters = [
          ...(storedUserId ? [{ column: "id", operator: "=", value: storedUserId }] : []),
          ...(mobile ? [{ column: "mobile_number", operator: "=", value: mobile }] : [])
        ];

        const res = await getPatients(filters);
        let patientData = null;
        if (Array.isArray(res) && res.length > 0) {
          patientData = res.find(p => String(p.id || p.user_id || p.app_user_id) === String(storedUserId))
            || res.find(p => (p.mobile_number || p.phone || p.mobile) === mobile)
            || res[0];
        } else if (res && typeof res === "object" && !Array.isArray(res)) {
          patientData = res;
        }

        let imgPath = patientData?.profile_image || patientData?.profileImage || patientData?.photo || user?.profile_image || user?.profileImage || "";
        if (!imgPath && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            imgPath = parsed?.profile_image || parsed?.profileImage || parsed?.photo || "";
          } catch (e) { }
        }

        if (imgPath) {
          const resolved = await fetchImageBlob(imgPath, "patientProfileImage");
          if (isMounted && resolved) {
            setHeaderAvatar(resolved);
            return;
          }
        }
        if (isMounted) setHeaderAvatar("");
      } catch (err) {
        console.error("updateHeaderAvatar error:", err);
        if (isMounted) setHeaderAvatar("");
      }
    }

    updateHeaderAvatar();

    const handleProfileUpdate = () => {
      updateHeaderAvatar();
    };
    window.addEventListener("arvaya_profile_updated", handleProfileUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("arvaya_profile_updated", handleProfileUpdate);
    };
  }, [user]);


  useEffect(() => {
    async function initLocations() {
      setLoadingLocs(true);
      try {
        const res = await getLocations(1, 100);
        const allLocs = res.list || [];
        setLocations(allLocs);

        if (!globalLocation && allLocs.length > 0) {
          setGlobalLocation(allLocs[0]);
        }
      } catch (err) {
        console.error(err);
      }
      setLoadingLocs(false);
    }
    initLocations();
  }, []);

  const displayName = getUserDisplayName(user);
  const displayInitial = (displayName || "U").replace(/^(mr\.|ms\.|mrs\.|dr\.)\s*/i, "").charAt(0).toUpperCase();
  const userPhone = getUserPhone(user);
  const currentUserId = user?.id || user?.user_id || user?.app_user_id;
  const otherProfiles = (linkedProfiles || []).filter(
    (p) => String(p.id) !== String(currentUserId)
  );



  // Click outside listener for search & location popovers
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
      if (locationPickerRef.current && !locationPickerRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
        setProfileMenuTab("main");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);

  useEffect(() => {
    if (!q.trim()) {
      setFilteredDoctors([]);
      setFilteredPackages([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = q.toLowerCase();

        const docRes = await getDoctors({
          pageSize: 100,
          filter: q,
          location_key: globalLocation?.entitylocation || ""
        });

        const allDocs = docRes.list || [];
        const localFilteredDocs = allDocs.filter(d =>
          d.name?.toLowerCase().includes(query) || d.specialty?.toLowerCase().includes(query)
        );
        setFilteredDoctors(localFilteredDocs.slice(0, 5));

        const pkgRes = await getLabPackages({ pageSize: 100, filter: q });
        const allPkgs = pkgRes || [];
        const localFilteredPkgs = allPkgs.filter(p =>
          p.title?.toLowerCase().includes(query) || p.tests?.toLowerCase().includes(query)
        );
        setFilteredPackages(localFilteredPkgs.slice(0, 5));
      } catch (err) {
        console.error("Search error", err);
      }
    }, 300); // debounce search

    return () => clearTimeout(timer);
  }, [q]);

  const handleSelectDoctor = (doc) => {
    setDoctor(doc);
    setIsSearchFocused(false);
    setQ("");
    go("/doctors/visit-type");
  };

  const handleSelectLab = (pkg) => {
    setIsSearchFocused(false);
    setQ("");
    go(`/labs`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsSearchFocused(false);
    go(`/doctors?q=${encodeURIComponent(q)}&loc=${encodeURIComponent(selectedCity)}`);
  };

  const navLinks = [
    ["Home", "/", Home],
    ["Consult Doctors", "/doctors", User],
    // ["Pharmacy", "/pharmacy"],
    ["Lab Tests", "/labs", FlaskConical],
    // ["ABHA Hub", "/abha"],
    // ["Patient Portal", "/records"],
    ["Wallet", "/wallet", Wallet],
    ["Rewards", "/rewards", Gift],
    // ["Refer & Earn", "/referrals"],
    ["Ambulance", "/ambulance", Truck],
    // ["Support", "/support"]
  ];

  return (
    <>
      {/* ── Main Header ── */}
      <header ref={headerRef} className={`glass${isHeaderCollapsed ? ' header-row-collapsed' : ''}`} style={{ position: 'sticky', top: '0px', zIndex: 100 }}>

        <div className="container flex justify-between items-center header-main-row" style={{ height: '62px', padding: '0 14px', gap: '14px', position: 'relative' }}>

          {/* Logo & Location Group */}
          <div className="flex items-center gap-4 header-brand-location" style={{ flexShrink: 0 }}>
            <Link to="/" className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo.png" alt="Arvaya Logo" className="header-logo-img" style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block' }} />
            </Link>

            {/* Location Picker */}
            <div ref={locationPickerRef} className="header-location-wrapper" style={{ position: 'relative', height: '40px', zIndex: 10 }}>
              <div
                className="header-location-picker flex items-center gap-1.5"
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                style={{
                  padding: '0 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '30px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: 'var(--bg-surface)',
                  height: '100%',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--bg-app)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg-surface)';
                }}
              >
                <MapPin size={15} style={{ color: 'var(--primary)' }} />
                <span>{selectedCity}</span>
                <ChevronDown size={14} className="text-muted" style={{ transform: isLocationOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* Location Dropdown Menu */}
              {isLocationOpen && (
                <div className="styled-scrollbar header-location-dropdown" style={{ position: 'absolute', top: '46px', left: 0, width: '240px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(18,51,58,0.18)', zIndex: 120, padding: '10px', animation: 'fadeIn 0.2s ease', maxHeight: '350px', overflowY: 'auto' }}>

                  {/* Location Search Box */}
                  <div style={{ marginBottom: '8px', padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px' }}>
                      <Search size={14} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Search locations..."
                        value={locSearch}
                        onChange={e => setLocSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', marginLeft: '6px', color: 'var(--text-main)' }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ padding: '6px 4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Available Locations</div>

                  {loadingLocs ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
                  ) : (
                    locations.filter(loc => {
                      const name = (loc.city || loc.alt_name || "").toLowerCase();
                      return name.includes(locSearch.toLowerCase());
                    }).map((loc, idx) => {
                      const locName = loc.city || loc.alt_name || "Unknown";
                      return (
                        <div
                          key={loc.entitylocation || idx}
                          onClick={() => {
                            setGlobalLocation(loc);
                            setIsLocationOpen(false);
                            setLocSearch(""); // clear search on select
                          }}
                          style={{ padding: '10px 10px', borderRadius: '8px', fontSize: '13px', color: selectedCity === locName ? 'var(--primary)' : 'var(--text-main)', fontWeight: selectedCity === locName ? '700' : '500', background: selectedCity === locName ? 'var(--primary-light)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                          onMouseOver={e => { if (selectedCity !== locName) e.currentTarget.style.background = 'var(--bg-app)'; }}
                          onMouseOut={e => { if (selectedCity !== locName) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{locName}</span>
                            {loc.alt_name && loc.city && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{loc.alt_name}</span>}
                          </span>
                          {selectedCity === locName && <Check size={14} color="var(--primary)" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Promo Banner Pill (auto-width, hugs its own content at every breakpoint) */}
          <div
            className="header-promo-banner"
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              overflow: 'visible',
              flexShrink: 1,
              minWidth: 0
            }}
          >
            {/* Pill background */}
            <div
              style={{
                position: 'absolute',
                inset: '5px 0',
                borderRadius: '32px',
                background: 'linear-gradient(90deg, rgba(46,102,110,0.12) 0%, rgba(46,102,110,0.05) 55%, rgba(251,145,63,0.06) 100%)',
                border: '1px solid rgba(46,102,110,0.08)',
                zIndex: 0
              }}
            />

            {/* Doctor illustration */}
            <img
              src="/images/header-doctor-banner.png"
              alt=""
              aria-hidden="true"
              className="header-promo-image"
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 'auto',
                zIndex: 2,
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />

            {/* Text */}
            <div
              className="header-promo-text"
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                minWidth: 0
              }}
            >
              <span className="header-promo-heading" style={{ whiteSpace: 'nowrap' }}>
                Your Health, <span className="header-promo-highlight">Our Priority</span>
              </span>
              {/* <span className="header-promo-subtext" style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Book appointments, order medicines, and more — all in one place.
              </span> */}
              <span className="header-promo-subtext" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span className="header-promo-tag">Appointments</span>
                <span className="header-promo-dot" aria-hidden="true" />
                <span className="header-promo-tag">Lab Tests</span>
                <span className="header-promo-dot" aria-hidden="true" />
                <span className="header-promo-tag">&amp; More</span>
                <span className="header-promo-tail">— all in one place</span>
              </span>
            </div>
          </div>

          {/* Flexible spacer — absorbs remaining space so location/gift/login stay pinned right */}
          <div className="flex-1 header-flex-spacer" />

          {/* Right Auth CTA (Desktop & Mobile Icon) */}
          <div className="header-desktop-auth flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            {/* Refer & Earn Icon Button (Icon only, left of profile tab) */}
            <button
              onClick={() => setIsReferralModalOpen(true)}
              title="Refer & Earn Cashback"
              aria-label="Refer & Earn"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--primary-light, #E4EEEF)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--primary, #2E666E)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                outline: 'none'
              }}
              className="hover:scale-105 header-gift-btn"
            >
              <Gift size={18} color="var(--primary)" />
            </button> &nbsp;
            {user ? (
              <div className="flex items-center gap-2.5" ref={profileMenuRef} style={{ position: 'relative' }}>
                <div
                  className="flex items-center gap-3 cursor-pointer header-profile-pill"
                  onClick={() => {
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                    setIsPillHovered(false);
                  }}
                  onMouseEnter={() => setIsPillHovered(true)}
                  onMouseLeave={() => setIsPillHovered(false)}
                  style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '30px', background: 'var(--bg-surface)', transition: 'background 0.2s', position: 'relative' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  title={displayName}
                >
                  <div className="flex flex-col items-end header-user-text">
                    <span className="text-muted" style={{ fontSize: '11px', lineHeight: '1' }}>Welcome,</span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      maxWidth: '120px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'inline-block',
                      textAlign: 'right'
                    }}>
                      {displayName}
                    </span>
                  </div>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', overflow: 'hidden', position: 'relative' }}>
                    {headerAvatar ? (
                      <img
                        src={headerAvatar}
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {displayInitial}
                  </div>
                  <ChevronDown size={16} className="text-muted header-user-chevron" style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {/* Name Hover Tooltip */}
                {isPillHovered && !isProfileMenuOpen && displayName && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: '4px',
                      maxWidth: 'calc(100vw - 32px)',
                      background: 'rgba(18, 51, 58, 0.96)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                      pointerEvents: 'none',
                      zIndex: 150,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '26px',
                        width: '8px',
                        height: '8px',
                        background: 'rgba(18, 51, 58, 0.96)',
                        transform: 'rotate(45deg)',
                      }}
                    />
                    <User size={12} style={{ opacity: 0.85, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                  </div>
                )}

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="header-profile-dropdown" style={{ position: 'absolute', top: '56px', right: 0, width: '260px', maxWidth: 'calc(100vw - 20px)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 12px 32px rgba(18,51,58,0.18)', zIndex: 120, padding: '8px 0', animation: 'fadeIn 0.2s ease', overflow: 'hidden' }}>
                    {profileMenuTab === "switch" ? (
                      <div style={{ animation: 'fadeIn 0.2s ease' }}>
                        {/* Header bar with Back button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => setProfileMenuTab("main")}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: '#1b6b72',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '6px',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(27, 107, 114, 0.08)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <ChevronLeft size={16} /> Back
                          </button>
                          {/* <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                            Switch Account
                          </span> */}
                          <span style={{ width: '48px' }} />
                        </div>

                        {/* Switch Account section header matching user reference image */}
                        <div style={{
                          padding: '10px 16px 6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>SWITCH ACCOUNT</span>
                          <span style={{ fontSize: '10px', background: 'rgba(27, 107, 114, 0.1)', color: '#1b6b72', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                            {otherProfiles.length} AVAILABLE
                          </span>
                        </div>

                        {/* Profiles List */}
                        <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="no-scrollbar">
                          {otherProfiles.map((p) => {
                            const isPPrimary = p.isPrimary || (!p.relation && (!p.parent_account_id || p.parent_account_id === p.id));
                            const pClean = (p.name || "U").replace(/^(mr\.|ms\.|mrs\.|dr\.)\s*/i, "").trim().split(/\s+/).filter(Boolean);
                            const pInitials = pClean.length >= 2 ? (pClean[0][0] + pClean[pClean.length - 1][0]).toUpperCase() : (pClean[0] ? pClean[0][0] : "U").toUpperCase();
                            return (
                              <div
                                key={p.id}
                                onClick={async () => {
                                  setIsProfileMenuOpen(false);
                                  setProfileMenuTab("main");
                                  await switchProfile(p);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '8px 16px',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: isPPrimary ? '#1b6b72' : '#ea580c',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  flexShrink: 0
                                }}>
                                  {pInitials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    color: 'var(--text-main)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }} title={p.name}>
                                    {p.name}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <b
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: '700',
                                  color: 'var(--text-main)',
                                  display: 'block',
                                  lineHeight: '1.35',
                                  wordBreak: 'break-word'
                                }}
                                title={displayName}
                              >
                                {displayName}
                              </b>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                {userPhone || '+91 XXXXX XXXXX'}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', flexShrink: 0, marginTop: '1px' }}>
                              Active
                            </span>
                          </div>
                        </div>

                        {/* Switch Account (Single Button that switches view inside this menu) */}
                        {otherProfiles.length > 0 && (
                          <div
                            onClick={() => setProfileMenuTab("switch")}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              background: 'rgba(27, 107, 114, 0.04)',
                              transition: 'background 0.2s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(27, 107, 114, 0.08)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(27, 107, 114, 0.04)')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: '#1b6b72',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Users size={14} />
                              </div>
                              <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                                Switch Account
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  background: '#1b6b72',
                                  color: '#ffffff',
                                  padding: '1px 7px',
                                  borderRadius: '10px',
                                }}
                              >
                                {otherProfiles.length}
                              </span>
                              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          </div>
                        )}

                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => { setIsProfileMenuOpen(false); go("/profile"); }}
                          style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} className="text-muted" /> Patient Profile
                        </div>

                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => { setIsProfileMenuOpen(false); go("/notifications"); }}
                          style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Bell size={16} className="text-muted" /> Notifications
                        </div>

                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => { setIsProfileMenuOpen(false); go("/my-appointments"); }}
                          style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} className="text-muted" /> My Appointments
                        </div>

                        {/* <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => { setIsProfileMenuOpen(false); go("/prescriptions"); }}
                      style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={16} className="text-muted" /> My Prescriptions
                    </div> */}

                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => { setIsProfileMenuOpen(false); go("/orders"); }}
                          style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} className="text-muted" /> My Orders
                        </div>

                        {/* <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => { setIsProfileMenuOpen(false); go("/payments"); }}
                      style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={16} className="text-muted" /> Payments & Invoices
                    </div> */}

                        {/* <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => { setIsProfileMenuOpen(false); go("/settings"); }}
                      style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={16} className="text-muted" /> App Settings
                    </div> */}

                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            logout();
                            go("/");
                          }}
                          style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--error, #e53e3e)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-app)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <LogOut size={16} /> Logout
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button className="btn btn-primary flex items-center gap-2 header-login-btn" onClick={() => openLoginModal()} style={{ fontSize: '14px' }}>
                  <User size={16} />
                  <span className="header-login-btn-text">Login / Sign Up</span>
                </button>
              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-label="Toggle Navigation Menu"
            style={{ display: 'none', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            {mobileDrawerOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

        </div>

        {/* ── Secondary Navigation ── */}
        <div className="header-secondary-nav" style={{ borderTop: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.3)' }}>
          <div className="container flex items-center justify-between no-scrollbar" style={{ overflowX: 'auto', gap: '8px' }}>
            {navLinks.map(([label, path, Icon]) => (
              <NavLink key={label} to={path} end={path === "/"} className="header-nav-link">
                {Icon && (
                  <span className="header-nav-icon">
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                )}
                <span>{label}</span>
              </NavLink>
            ))}

            {/* Quick-call actions, pinned to the right end of the bar */}
            <div className="header-nav-calls">
              <a href="tel:+9118001234567" className="header-nav-call">
                <Phone size={15} strokeWidth={2.2} />
                <span>Call Us</span>
              </a>
              <button
                type="button"
                onClick={() => setShowAmbulanceModal(true)}
                className="header-nav-call header-nav-call-emergency"
              >
                <Siren size={15} strokeWidth={2.2} />
                <span>Call Ambulance</span>
              </button>
            </div>
          </div>
        </div>

      </header>

      {showAmbulanceModal && (
        <AmbulanceRequestModal onClose={() => setShowAmbulanceModal(false)} />
      )}

      {/* ── Mobile Navigation Drawer ── */}
      {mobileDrawerOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => { setMobileDrawerOpen(false); setMobileDrawerTab("main"); }} />
          <aside className="mobile-nav-drawer">
            {mobileDrawerTab === "switch" ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.2s ease' }}>
                {/* Drawer Header with Back Button */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerTab("main")}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--primary)',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronLeft size={15} /> Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setMobileDrawerTab("main");
                    }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
                  {/* Current Active Account */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      Current Active Account
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      background: 'rgba(27, 107, 114, 0.05)',
                      border: '1.5px solid #1b6b72',
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#1b6b72',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        {displayInitial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.3', wordBreak: 'break-word' }} title={displayName}>
                          {displayName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                          <span style={{ fontSize: '9.5px', background: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '1px 5px', borderRadius: '6px' }}>Active</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{userPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switch Account section */}
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Switch Account</span>
                      <span style={{ fontSize: '9.5px', background: 'rgba(27, 107, 114, 0.1)', color: '#1b6b72', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>
                        {otherProfiles.length} available
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {otherProfiles.map(p => {
                        const isPPrimary = p.isPrimary || (!p.relation && (!p.parent_account_id || p.parent_account_id === p.id));
                        const pClean = (p.name || "U").replace(/^(mr\.|ms\.|mrs\.|dr\.)\s*/i, "").trim().split(/\s+/).filter(Boolean);
                        const pInitials = pClean.length >= 2 ? (pClean[0][0] + pClean[pClean.length - 1][0]).toUpperCase() : (pClean[0] ? pClean[0][0] : "U").toUpperCase();
                        return (
                          <div
                            key={p.id}
                            onClick={async () => {
                              setMobileDrawerOpen(false);
                              setMobileDrawerTab("main");
                              await switchProfile(p);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isPPrimary ? '#1b6b72' : '#ea580c',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              flexShrink: 0
                            }}>
                              {pInitials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Drawer Header */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', flexShrink: 0 }}>
                  <img src="/logo.png" alt="Arvaya" style={{ height: '26px' }} />
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setMobileDrawerTab("main");
                    }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Entire Scrollable Drawer Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="no-scrollbar">
                  {/* User Profile / Auth CTA */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(46, 102, 110, 0.04) 0%, rgba(46, 102, 110, 0.08) 100%)' }}>
                    {user ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(18,51,58,0.04)' }}>

                        {/* Top row: Avatar + Name + Shield badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '15px', boxShadow: '0 2px 6px rgba(46,102,110,0.2)',
                            overflow: 'hidden', position: 'relative', border: '1.5px solid white', flexShrink: 0
                          }}>
                            {headerAvatar ? (
                              <img
                                src={headerAvatar}
                                alt={displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            {displayInitial}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Logged in as</span>
                            <b style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.3', wordBreak: 'break-word' }} title={displayName}>{displayName}</b>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', fontSize: '9.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '8px', marginTop: '2px' }}>
                              <Shield size={9} /> Verified Patient
                            </div>
                          </div>
                        </div>

                        {/* Single Switch Account Button in Mobile Drawer */}
                        {otherProfiles.length > 0 && (
                          <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => setMobileDrawerTab("switch")}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: 'rgba(27, 107, 114, 0.05)',
                                border: '1px solid rgba(27, 107, 114, 0.14)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(27, 107, 114, 0.1)')}
                              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(27, 107, 114, 0.05)')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#1b6b72',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Users size={12} />
                                </div>
                                <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                                    Switch Account
                                  </span>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    ({otherProfiles.length} available)
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        )}

                        {/* Action buttons: Profile, Settings, Logout in a single compact row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '6px 8px', fontSize: '12px', fontWeight: '700', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              boxShadow: 'none'
                            }}
                            onClick={() => {
                              setMobileDrawerOpen(false);
                              go("/profile");
                            }}
                          >
                            <User size={13} /> Profile
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 8px', fontSize: '12px', fontWeight: '600', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-main)'
                            }}
                            onClick={() => {
                              setMobileDrawerOpen(false);
                              go("/settings");
                            }}
                          >
                            <Settings size={13} /> Settings
                          </button>
                          <button
                            onClick={() => {
                              logout();
                              setMobileDrawerOpen(false);
                              go("/");
                            }}
                            style={{
                              padding: '6px 10px', fontSize: '12px', fontWeight: '700',
                              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: '4px', color: '#dc2626', background: 'rgba(220, 38, 38, 0.06)',
                              border: '1px solid rgba(220, 38, 38, 0.18)', cursor: 'pointer'
                            }}
                            title="Logout"
                          >
                            <LogOut size={13} /> Logout
                          </button>
                        </div>

                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <b style={{ display: 'block', fontSize: '13.5px', color: 'var(--primary-dark)', marginBottom: '6px' }}>Welcome to Arvaya</b>
                        <button
                          className="btn btn-primary w-full flex items-center justify-center gap-2"
                          onClick={() => {
                            setMobileDrawerOpen(false);
                            openLoginModal();
                          }}
                          style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '10px' }}
                        >
                          <User size={14} /> Login / Sign Up
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '3px', paddingLeft: '4px' }}>Navigation</span>
                    {navLinks.map(([label, path, Icon]) => (
                      <NavLink
                        key={label}
                        to={path}
                        onClick={() => {
                          setMobileDrawerOpen(false);
                        }}
                        style={({ isActive }) => ({
                          padding: '7px 10px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? 'var(--primary)' : 'var(--text-main)',
                          background: isActive ? 'var(--primary-light)' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {Icon && <Icon size={16} style={{ opacity: 0.8 }} />}
                          <span>{label}</span>
                        </div>
                        <ArrowRight size={13} style={{ opacity: 0.35 }} />
                      </NavLink>
                    ))}

                    {user && (
                      <>
                        <div style={{ margin: '8px 0 4px', borderTop: '1px solid var(--border)' }} />

                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '3px', paddingLeft: '4px' }}>My Account</span>
                        {[
                          ["Notifications", "/notifications", Bell],
                          ["My Appointments", "/my-appointments", User],
                          ["My Prescriptions", "/prescriptions", User],
                          ["My Orders", "/orders", User],
                          ["Payments & Invoices", "/payments", User],
                        ].map(([label, path, Icon]) => (
                          <NavLink
                            key={label}
                            to={path}
                            onClick={() => {
                              setMobileDrawerOpen(false);
                            }}
                            style={({ isActive }) => ({
                              padding: '7px 10px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: isActive ? '700' : '500',
                              color: isActive ? 'var(--primary)' : 'var(--text-main)',
                              background: isActive ? 'var(--primary-light)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            })}
                          >
                            <Icon size={13} className="text-muted" />
                            <span>{label}</span>
                          </NavLink>
                        ))}
                      </>
                    )}

                    <div style={{ margin: '8px 0 4px', borderTop: '1px solid var(--border)' }} />

                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '3px', paddingLeft: '4px' }}>More Services</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '6px', paddingBottom: '16px' }}>
                      <span className="flex items-center gap-2 cursor-pointer"><Smartphone size={13} /> Download Mobile App</span>
                      <span className="flex items-center gap-2 cursor-pointer"><HelpCircle size={13} /> Help & Support</span>
                      <span>For Healthcare Providers</span>
                      <span>Corporate Wellness</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      {/* ── Professional Website Referral Modal ── */}
      {isReferralModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(18, 51, 58, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setIsReferralModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 24px 20px 24px',
              color: 'var(--text-main, #263538)',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(18, 51, 58, 0.2), 0 0 0 1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            {/* Header Title Bar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border, #DCE6E7)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--primary-light, #E4EEEF)',
                  color: 'var(--primary, #0F4D58)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Gift size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main, #263538)', margin: 0 }}>
                    Refer & Earn Cashback
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted, #5E7377)', margin: '2px 0 0 0' }}>
                    Share your referral link with friends and family.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReferralModalOpen(false)}
                aria-label="Close modal"
                style={{
                  background: 'var(--bg-app, #F4F8F8)',
                  border: '1px solid var(--border, #DCE6E7)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #5E7377)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Share Action Buttons */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #5E7377)', letterSpacing: '0.8px', display: 'block', marginBottom: '10px' }}>
                Quick Share Options
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => handleShare('sms')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-app, #F4F8F8)',
                    border: '1px solid var(--border, #DCE6E7)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-main, #263538)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-primary"
                >
                  <Smartphone size={16} color="var(--primary)" />
                  <span>SMS</span>
                </button>

                <button
                  onClick={() => setIsCustomShareOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-app, #F4F8F8)',
                    border: '1px solid var(--border, #DCE6E7)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-main, #263538)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-primary"
                >
                  <Send size={15} color="var(--accent)" />
                  <span>Message</span>
                </button>

                <button
                  onClick={() => handleShare('email')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-app, #F4F8F8)',
                    border: '1px solid var(--border, #DCE6E7)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-main, #263538)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-primary"
                >
                  <Mail size={16} color="var(--primary)" />
                  <span>Email</span>
                </button>
              </div>
            </div>

            {/* Referral Link Container */}
            <div style={{
              background: 'var(--bg-app, #F4F8F8)',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid var(--border, #DCE6E7)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #5E7377)', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>
                App Download & Referral Link
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={appDownloadUrl}
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    border: '1px solid var(--border, #DCE6E7)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-main, #263538)',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />

                <button
                  onClick={handleCopyLink}
                  style={{
                    background: copied ? '#16A34A' : 'var(--accent, #FB913F)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Main Share Button */}
            <button
              onClick={() => setIsCustomShareOpen(true)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0F4D58 0%, #0A343C 100%)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(15, 77, 88, 0.2)'
              }}
            >
              <Share2 size={16} />
              <span>Share via Social Apps</span>
            </button>

          </div>
        </div>
      )}

      {/* ── Custom Window Share Sheet Modal ── */}
      {isCustomShareOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setIsCustomShareOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#202020',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid #333333',
              fontFamily: 'Segoe UI, -apple-system, sans-serif'
            }}
          >
            {/* Title Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={14} color="#CCCCCC" />
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#CCCCCC' }}>Share</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#333333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  <User size={13} color="#CCCCCC" />
                </div>
                <button
                  onClick={() => setIsCustomShareOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#CCCCCC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* App Preview Card */}
            <div style={{
              background: '#2D2D2D',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #0F4D58 0%, #0A343C 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Gift size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF' }}>Arvaya Health App</span>
                <span style={{ fontSize: '10px', color: '#AAAAAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appDownloadUrl}
                </span>
              </div>
            </div>

            {/* Share Using Title */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#CCCCCC', display: 'block', marginBottom: '12px' }}>
                Share using
              </span>

              {/* Apps List Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px 6px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {customShareOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (option.id === 'copy') {
                        handleCopyLink();
                      } else {
                        handleShare(option.id);
                      }
                      setIsCustomShareOpen(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: '6px 2px',
                      borderRadius: '6px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2A2A2A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: option.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                      {option.icon}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      color: '#E0E0E0',
                      textAlign: 'center',
                      maxWidth: '64px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {option.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Embedded Responsive CSS Rules for Header */}
      <style>{`
        .mobile-hamburger-btn {
          display: none;
        }
        /* Pill hugs its content; auto margins center it so the free space is
           split evenly on both sides instead of piling up on one side. */
        .header-promo-banner {
          order: 1;
          flex: 0 1 auto;
          min-width: 0;
          margin: 0 auto;
        }
        @media (min-width: 741px) {
          .header-flex-spacer {
            display: none;
          }
        }
        .header-promo-image {
          left: 20px;
          height: 74px;
        }
        .header-promo-text {
          padding-left: 158px;
          padding-right: 30px;
        }
        .header-promo-heading {
          font-size: 16px;
        }
        @media (max-width: 1180px) {
          .header-promo-subtext {
            display: none !important;
          }
        }
        @media (max-width: 1024px) {
          .header-promo-banner {
            margin: 0 10px 0 28px !important;
          }
          .header-promo-image {
            height: 54px !important;
            left: 10px !important;
          }
          .header-promo-text {
            padding-left: 96px !important;
            padding-right: 12px !important;
          }
          .header-promo-heading {
            font-size: 14px !important;
          }
          .header-location-dropdown {
            left: auto !important;
            right: 0 !important;
          }
        }
        @media (max-width: 900px) {
          .header-promo-banner {
            margin: 0 8px 0 14px !important;
          }
          .header-promo-image {
            height: 44px !important;
            left: 8px !important;
          }
          .header-promo-text {
            padding-left: 74px !important;
            padding-right: 10px !important;
          }
          .header-promo-heading {
            font-size: 12.5px !important;
          }
        }
        @media (max-width: 768px) {
          .header-promo-banner {
            margin: 0 6px 0 8px !important;
          }
          .header-promo-image {
            height: 36px !important;
            left: 6px !important;
          }
          .header-promo-text {
            padding-left: 58px !important;
            padding-right: 8px !important;
          }
          .header-promo-heading {
            font-size: 11.5px !important;
          }
        }
        @media (max-width: 740px) {
          .header-promo-banner {
            margin: 0 4px !important;
            flex: 0 0 56px !important;
            width: 56px !important;
            min-width: 56px !important;
          }
          .header-promo-image {
            height: 32px !important;
            left: 4px !important;
          }
          .header-promo-text {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .header-promo-banner {
            display: none !important;
          }
        }
        .header-brand-location {
          display: contents;
        }
        .header-brand-location > a {
          order: 0;
          flex-shrink: 0;
        }
        .header-main-row > .flex-1 {
          order: 1;
          flex: 1 1 auto;
          min-width: 0;
        }
        .header-location-wrapper {
          order: 2;
          flex-shrink: 0;
        }
        .header-desktop-auth {
          order: 3;
        }
        @media (min-width: 427px) {
          .header-main-row {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
        @media (max-width: 768px) {
          .header-desktop-auth {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            order: 90 !important;
            flex-shrink: 0 !important;
          }
          .header-location-picker {
            padding: 0 10px !important;
            font-size: 12px !important;
          }
          .header-search-bar {
            max-width: 100% !important;
          }
          .header-user-chevron {
            display: block !important;
          }
        }
        @media (max-width: 520px) {
          .header-location-wrapper {
            display: flex !important;
            position: relative !important;
            left: auto !important;
            transform: none !important;
            height: 34px !important;
            z-index: 10 !important;
            order: 80 !important;
          }
          .header-location-picker {
            display: flex !important;
            align-items: center !important;
            padding: 0 8px !important;
            font-size: 12px !important;
            height: 100% !important;
            gap: 4px !important;
            max-width: 120px !important;
          }
          .header-location-picker span {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 70px !important;
          }
          .header-location-dropdown {
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(250px, 88vw) !important;
            top: 40px !important;
          }
          .header-desktop-auth {
            margin-left: auto !important;
          }
          .header-login-btn-text {
            display: none !important;
          }
          .header-login-btn {
            width: 36px !important;
            height: 34px !important;
            padding: 0 !important;
            justify-content: center !important;
          }
        }
        @media (max-width: 768px) {
          .header-secondary-nav {
            display: none !important;
          }
          .header-main-row {
            height: 60px !important;
            padding: 0 8px !important;
            gap: 4px !important;
          }
          .header-main-row img {
            height: 34px !important;
          }
          .header-location-wrapper {
            display: flex !important;
            position: relative !important;
            left: auto !important;
            transform: none !important;
            height: 32px !important;
            z-index: 10 !important;
          }
          .header-location-picker {
            display: flex !important;
            align-items: center !important;
            padding: 0 8px !important;
            font-size: 11.5px !important;
            height: 100% !important;
            gap: 3px !important;
            border-radius: 20px !important;
            max-width: 110px !important;
          }
          .header-location-picker span {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 60px !important;
          }
          .header-desktop-auth {
            gap: 4px !important;
            margin-left: auto !important;
          }
          .header-user-text {
            display: none !important;
          }
          .header-user-chevron {
            display: block !important;
            width: 13px !important;
            height: 13px !important;
            margin-left: 1px !important;
            flex-shrink: 0 !important;
          }
          .header-profile-pill {
            display: none !important;
          }
          .header-gift-btn {
            width: 30px !important;
            height: 30px !important;
          }
          .header-gift-btn svg {
            width: 15px !important;
            height: 15px !important;
          }
          .mobile-hamburger-btn {
            display: flex !important;
            order: 99 !important;
            flex-shrink: 0 !important;
            padding: 5px !important;
            border-radius: 8px !important;
            margin-left: 0 !important;
          }
          .mobile-hamburger-btn svg {
            width: 20px !important;
            height: 20px !important;
          }
          .header-login-btn-text {
            display: none !important;
          }
          .header-login-btn {
            padding: 4px 8px !important;
            border-radius: 30px !important;
            height: 32px !important;
            gap: 4px !important;
            justify-content: center !important;
          }
          .header-profile-dropdown {
            right: -38px !important;
            top: 50px !important;
            max-width: calc(100vw - 16px) !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22) !important;
          }
        }
      `}</style>
    </>
  );
}

