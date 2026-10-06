import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Phone, Calendar, ArrowRight, Droplet, Building, ChevronDown, CheckCircle2, Search } from "lucide-react";
import { getLocations } from "../services/dataService";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("Mr.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [locations, setLocations] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  const { register, loading, error, setError, showToast } = useAuth();
  const go = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchLocations() {
      try {
        const res = await getLocations(1, 100);
        if (res && res.list) {
          setLocations(res.list);
        }
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim()) {
      const msg = "Please enter your First Name";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!lastName.trim()) {
      const msg = "Please enter your Last Name";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!gender) {
      const msg = "Please select your Gender";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!dob) {
      const msg = "Please select your Date of Birth";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!phone.trim()) {
      const msg = "Please enter your Phone Number";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (locations.length > 0 && (selectedBranch === "" || selectedBranch === null || selectedBranch === undefined)) {
      const msg = "Please select a Branch";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }

    const genderCode = gender === "Female" ? "F" : gender === "Male" ? "M" : "O";
    const tempTitle = title.includes(".") ? title.replace(".", "") : title;

    const ok = await register({
      title: tempTitle,
      name: `${firstName.trim()} ${lastName.trim()}`,
      gender: genderCode,
      date_of_birth: dob,
      mobile_number: phone.trim(),
      blood_group: bloodGroup,
      entitylocation: selectedBranch
    });
    if (ok) go(location.state?.from || "/");
  }

  const inputWrap = {
    display: "flex", alignItems: "center", gap: "8px",
    border: "1.5px solid #edf1f6", borderRadius: "12px", padding: "0 12px",
    background: "#fbfcfc", transition: "all 0.2s", minWidth: 0,
    width: "100%", boxSizing: "border-box"
  };
  const inputStyle = {
    flex: 1, border: "none", outline: "none", padding: "10px 0",
    fontSize: "14px", background: "transparent", color: "#2d3748",
    minWidth: 0, width: "100%"
  };

  const cleanText = (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '').trim();
  };

  const getBranchLabel = (loc) => {
    if (!loc) return "Select Branch";
    return [loc.alt_name, loc.street, loc.area, loc.landmark, loc.city]
      .map(cleanText)
      .filter(Boolean)
      .join(', ');
  };

  const selectedLoc = locations.find(l => l.entitylocation === selectedBranch);

  return (
    <div style={{
      minHeight: "calc(100vh - 130px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(150deg, var(--bg-app) 0%, #f0f7f7 100%)",
      padding: "20px 16px",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "530px",
        background: "#ffffff",
        borderRadius: "22px",
        boxShadow: "0 18px 45px rgba(46, 102, 110, 0.12), 0 4px 16px rgba(0,0,0,0.04)",
        border: "1px solid var(--border)",
        padding: "28px 32px",
        position: "relative",
        overflow: "visible", // Changed for dropdown
        boxSizing: "border-box"
      }}>
        {/* Decorative Top Accent Bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: "linear-gradient(90deg, var(--accent), var(--primary))",
          borderTopLeftRadius: "22px", borderTopRightRadius: "22px"
        }} />

        {/* Card Header */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div style={{ background: '#ffffff', padding: '6px 14px', borderRadius: '12px', display: 'inline-flex', marginBottom: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
            <img src="/logo.png" alt="Arvaya" style={{ height: "30px", objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: "22px", color: "var(--text-main)", margin: "0 0 4px", fontWeight: "800", letterSpacing: "-0.01em" }}>
            Complete Registration
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
            Enter your details to create your Arvaya account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Title, First Name & Last Name in Row */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
              Full Name *
            </label>
            <div className="signup-name-row" style={{ display: "grid", gridTemplateColumns: "84px 1fr 1fr", gap: "10px", width: "100%" }}>
              {/* Title */}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...inputWrap, padding: "0 8px" }}>
                  <select
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer", fontWeight: "700", color: "var(--primary-dark)" }}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Baby">Baby</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
              </div>

              {/* First Name */}
              <div style={{ minWidth: 0 }}>
                <div style={inputWrap}>
                  <User size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="First Name" style={inputStyle} />
                </div>
              </div>

              {/* Last Name */}
              <div style={{ minWidth: 0 }}>
                <div style={inputWrap}>
                  <User size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Last Name" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
              Gender *
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              {["Male", "Female", "Other"].map((g) => {
                const isSel = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "12px",
                      border: isSel ? "2px solid var(--primary)" : "1.5px solid #edf1f6",
                      background: isSel ? "var(--primary-light)" : "#fbfcfc",
                      color: isSel ? "var(--primary-dark)" : "var(--text-muted)",
                      fontWeight: isSel ? "700" : "500",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date of Birth & Blood Group */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                Date of Birth *
              </label>
              <div style={inputWrap}>
                <Calendar size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                <input
                  type="date"
                  value={dob}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 150)).toISOString().split("T")[0]}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setDob(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                Blood Group *
              </label>
              <div style={{ ...inputWrap, padding: "0 8px" }}>
                <Droplet size={15} color="var(--primary)" style={{ flexShrink: 0, marginLeft: "2px" }} />
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", fontWeight: "600", color: "var(--text-main)" }}
                >
                  {["B+", "A+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
              Phone Number *
            </label>
            <div style={inputWrap}>
              <Phone size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number" maxLength={10} style={inputStyle} />
            </div>
          </div>

          {/* Branch */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
              Branch *
            </label>
            <div
              onClick={() => { setBranchOpen(!branchOpen); if (branchOpen) setBranchSearch(""); }}
              style={{
                ...inputWrap,
                cursor: "pointer",
                padding: "10px 12px",
                border: branchOpen ? "1.5px solid var(--primary)" : "1.5px solid #edf1f6"
              }}
            >
              <Building size={15} color="var(--primary)" style={{ flexShrink: 0, marginLeft: "2px" }} />
              <div style={{ flex: 1, fontSize: "14px", color: selectedLoc ? "var(--text-main)" : "#9ca3af", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedLoc ? getBranchLabel(selectedLoc) : "Select Branch"}
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ transition: "transform 0.2s", transform: branchOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </div>

            {/* Custom Dropdown Menu */}
            {branchOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                background: "#fff", borderRadius: "14px", border: "1px solid #edf1f6",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                maxHeight: "240px", overflowY: "auto", zIndex: 50, padding: "8px"
              }}>
                {/* Search Box */}
                <div style={{ display: "flex", alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "8px 12px", marginBottom: "6px" }}>
                  <Search size={16} color="var(--primary)" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "13px", paddingLeft: "8px", color: "var(--text-main)" }}
                  />
                </div>

                {locations.length === 0 ? (
                  <div style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>Loading branches...</div>
                ) : (
                  locations
                    .filter(loc => {
                      if (!branchSearch.trim()) return true;
                      const q = branchSearch.toLowerCase();
                      return (
                        loc.alt_name?.toLowerCase().includes(q) ||
                        loc.name?.toLowerCase().includes(q) ||
                        loc.city?.toLowerCase().includes(q) ||
                        loc.area?.toLowerCase().includes(q) ||
                        loc.street?.toLowerCase().includes(q) ||
                        loc.landmark?.toLowerCase().includes(q) ||
                        loc.entitylocation?.toLowerCase().includes(q)
                      );
                    })
                    .map(loc => {
                      const isSelected = selectedBranch === loc.entitylocation;
                      return (
                        <button
                          key={loc.entitylocation}
                          type="button"
                          onClick={() => { setSelectedBranch(loc.entitylocation); setBranchOpen(false); setBranchSearch(""); }}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: "10px",
                            padding: "12px", borderRadius: "10px", border: "none",
                            background: isSelected ? "var(--primary-light)" : "transparent",
                            cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                            width: "100%"
                          }}
                          onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: isSelected ? "700" : "600", color: isSelected ? "var(--primary-dark)" : "var(--text-main)", lineHeight: "1.4" }}>
                              {getBranchLabel(loc)}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />}
                        </button>
                      );
                    })
                )}
                {locations.length > 0 && locations.filter(loc => {
                  if (!branchSearch.trim()) return true;
                  const q = branchSearch.toLowerCase();
                  return (
                    loc.alt_name?.toLowerCase().includes(q) ||
                    loc.name?.toLowerCase().includes(q) ||
                    loc.city?.toLowerCase().includes(q) ||
                    loc.area?.toLowerCase().includes(q) ||
                    loc.street?.toLowerCase().includes(q) ||
                    loc.landmark?.toLowerCase().includes(q) ||
                    loc.entitylocation?.toLowerCase().includes(q)
                  );
                }).length === 0 && (
                    <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>
                      No branches found matching your search.
                    </div>
                  )}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
              padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: "linear-gradient(135deg, #2e666e, #1f474d)",
            color: "#ffffff", border: "none", padding: "14px", borderRadius: "12px",
            fontSize: "15px", fontWeight: "700", cursor: loading ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            opacity: loading ? 0.7 : 1, transition: "all 0.25s", marginTop: "6px",
            boxShadow: "0 6px 18px rgba(46, 102, 110, 0.3)", width: "100%"
          }}>
            {loading ? "Creating Account..." : <span style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>Complete Registration <ArrowRight size={17} color="#ffffff" /></span>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "16px", marginBottom: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--primary)", fontWeight: "700", textDecoration: "none" }}>
            Sign In
          </Link>
        </p>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .signup-name-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
