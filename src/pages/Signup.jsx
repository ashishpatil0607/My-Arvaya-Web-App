import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Phone, ArrowRight, Droplet, Building, ChevronDown, Search, Loader2, Check, VenusAndMars } from "lucide-react";
import { getLocations } from "../services/dataService";

// Custom dropdown styled like ProfileSelect on the Profile page
function SignupSelect({ icon, value, options, onChange, wrapStyle }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };

  const choose = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={`signup-field signup-select-trigger${open ? " is-open" : ""}`}
        style={{ ...wrapStyle, cursor: "pointer", font: "inherit", textAlign: "left" }}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {icon}
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: value ? "var(--text-main)" : "#8AA0A4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "Select"}
        </span>
        <ChevronDown size={16} className="signup-select-chevron" />
      </button>
      {open && (
        <ul className="signup-select-menu" role="listbox">
          {options.map((opt, i) => {
            const isSelected = opt === value;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                className={`signup-select-option${isSelected ? " is-selected" : ""}${i === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
              >
                <span>{opt}</span>
                {isSelected && <Check size={15} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const BRANCH_MENU_MAX = 300;

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
  const pageRef = useRef(null);
  const [branchMenu, setBranchMenu] = useState({ up: false, maxHeight: BRANCH_MENU_MAX });

  const fetchedRef = useRef(false);
  // Synchronous guard so a fast double-click can't submit registration twice
  const submitLockRef = useRef(false);

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
    if (submitLockRef.current) return;
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

    submitLockRef.current = true;
    try {
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
    } finally {
      submitLockRef.current = false;
    }
  }

  // Field styles mirror .input-field in global.css so Signup matches Login
  const FIELD_HEIGHT = "46px";
  const inputWrap = {
    position: "relative",
    display: "flex", alignItems: "center", gap: "10px",
    height: FIELD_HEIGHT,
    border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0 14px",
    background: "var(--bg-surface)", transition: "all 0.2s var(--ease-out)", minWidth: 0,
    width: "100%", boxSizing: "border-box"
  };
  const inputStyle = {
    flex: 1, border: "none", outline: "none", padding: 0, height: "100%",
    fontSize: "14px", fontWeight: "500", background: "transparent", color: "var(--text-main)",
    minWidth: 0, width: "100%"
  };
  // Uppercase muted labels with a red asterisk, matching the Profile page
  const labelStyle = {
    fontSize: "12px", fontWeight: "700", color: "#55738d",
    textTransform: "uppercase", letterSpacing: "0.04em",
    display: "block", marginBottom: "6px"
  };
  const reqStyle = { fontStyle: "normal", color: "#e11d48" };
  const iconProps = { size: 16, color: "var(--primary)", style: { flexShrink: 0 } };

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

  const branchQuery = branchSearch.trim().toLowerCase();
  const filteredLocations = !branchQuery ? locations : locations.filter(loc =>
    [loc.alt_name, loc.name, loc.city, loc.area, loc.street, loc.landmark, loc.entitylocation]
      .some(v => v?.toLowerCase().includes(branchQuery))
  );

  // The page footer follows this container in normal flow, so the menu must fit within
  // the container (and the viewport) — open upward when there isn't room below
  const toggleBranch = () => {
    if (branchOpen) {
      setBranchOpen(false);
      setBranchSearch("");
      return;
    }
    const trigger = dropdownRef.current?.getBoundingClientRect();
    const page = pageRef.current?.getBoundingClientRect();
    if (trigger && page) {
      const GAP = 8;
      const spaceBelow = Math.min(window.innerHeight, page.bottom) - trigger.bottom - GAP * 2;
      const spaceAbove = trigger.top - Math.max(0, page.top) - GAP * 2;
      const up = spaceBelow < BRANCH_MENU_MAX && spaceAbove > spaceBelow;
      setBranchMenu({ up, maxHeight: Math.max(160, Math.min(BRANCH_MENU_MAX, up ? spaceAbove : spaceBelow)) });
    }
    setBranchOpen(true);
  };

  return (
    <div ref={pageRef} className="signup-page" style={{
      minHeight: "calc(100vh - 130px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-app)",
      padding: "20px 16px",
      boxSizing: "border-box"
    }}>
      <div className="signup-card" style={{
        width: "100%",
        maxWidth: "530px",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border)",
        padding: "32px",
        position: "relative",
        overflow: "visible", // Changed for dropdown
        boxSizing: "border-box"
      }}>
        {/* Card Header */}
        <div className="signup-header" style={{ textAlign: "center", marginBottom: "22px" }}>
          <h1 className="signup-title" style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--text-main)", margin: "0 0 6px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Complete Registration
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            Enter your details to create your Arvaya account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Title, First Name & Last Name in Row */}
          <div>
            <label style={labelStyle}>Full Name <em style={reqStyle}>*</em></label>
            <div className="signup-name-row" style={{ display: "grid", gridTemplateColumns: "92px 1fr 1fr", gap: "10px", width: "100%" }}>
              {/* Title */}
              <SignupSelect
                value={title}
                options={["Mr.", "Mrs.", "Ms.", "Baby", "Dr."]}
                onChange={setTitle}
                wrapStyle={inputWrap}
              />

              {/* First Name */}
              <div className="signup-field" style={inputWrap}>
                <User {...iconProps} />
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  autoComplete="given-name" autoCapitalize="words"
                  placeholder="First Name" style={inputStyle} />
              </div>

              {/* Last Name */}
              <div className="signup-field" style={inputWrap}>
                <User {...iconProps} />
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  autoComplete="family-name" autoCapitalize="words"
                  placeholder="Last Name" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Gender & Blood Group */}
          <div className="signup-pair" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Gender <em style={reqStyle}>*</em></label>
              <SignupSelect
                icon={<VenusAndMars {...iconProps} />}
                value={gender}
                options={["Male", "Female", "Other"]}
                onChange={setGender}
                wrapStyle={inputWrap}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Blood Group <em style={reqStyle}>*</em></label>
              <SignupSelect
                icon={<Droplet {...iconProps} />}
                value={bloodGroup}
                options={["B+", "A+", "O+", "AB+", "A-", "B-", "O-", "AB-"]}
                onChange={setBloodGroup}
                wrapStyle={inputWrap}
              />
            </div>
          </div>

          {/* Date of Birth & Phone Number */}
          <div className="signup-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Date of Birth <em style={reqStyle}>*</em></label>
              <div className="signup-field" style={inputWrap}>
                <input
                  type="date"
                  className="signup-date"
                  value={dob}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 150)).toISOString().split("T")[0]}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setDob(e.target.value)}
                  style={{ ...inputStyle, color: dob ? "var(--text-main)" : "#8AA0A4" }}
                />
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Phone Number <em style={reqStyle}>*</em></label>
              <div className="signup-field" style={inputWrap}>
                <Phone {...iconProps} />
                <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number" maxLength={10} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Branch */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Branch <em style={reqStyle}>*</em></label>
            <div
              className="signup-field"
              onClick={toggleBranch}
              style={{
                ...inputWrap,
                cursor: "pointer",
                ...(branchOpen && { borderColor: "var(--primary)", boxShadow: "0 0 0 4px rgba(46, 102, 110, 0.14)" })
              }}
            >
              <Building {...iconProps} />
              <div style={{ flex: 1, fontSize: "14px", color: selectedLoc ? "var(--text-main)" : "#8AA0A4", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedLoc ? getBranchLabel(selectedLoc) : "Select Branch"}
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, transition: "transform 0.2s", transform: branchOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </div>

            {/* Custom Dropdown Menu */}
            {branchOpen && (
              <div className="signup-branch-menu" style={{
                position: "absolute", left: 0, right: 0,
                ...(branchMenu.up ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
                maxHeight: `${branchMenu.maxHeight}px`
              }}>
                {/* Search Box — stays pinned while the list scrolls */}
                <div className="signup-branch-search">
                  <Search size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search branches..."
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                <div className="signup-branch-list">
                  {locations.length === 0 ? (
                    <div className="signup-branch-empty">Loading branches...</div>
                  ) : filteredLocations.length === 0 ? (
                    <div className="signup-branch-empty">No branches found matching your search.</div>
                  ) : (
                    filteredLocations.map(loc => {
                      const isSelected = selectedBranch === loc.entitylocation;
                      return (
                        <button
                          key={loc.entitylocation}
                          type="button"
                          className={`signup-branch-option${isSelected ? " is-selected" : ""}`}
                          onClick={() => { setSelectedBranch(loc.entitylocation); setBranchOpen(false); setBranchSearch(""); }}
                        >
                          <span style={{ flex: 1 }}>{getBranchLabel(loc)}</span>
                          {isSelected && <Check size={16} style={{ flexShrink: 0, marginTop: "2px" }} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: "var(--danger-bg)", border: "1px solid #fecaca", color: "var(--danger)",
              padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "500",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="signup-submit" style={{
            background: "var(--primary)",
            color: "var(--text-inverse)", border: "none", padding: "15px", borderRadius: "var(--radius-md)",
            fontSize: "15px", fontWeight: "600", cursor: loading ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            opacity: loading ? 0.6 : 1, transition: "all 0.2s var(--ease-out)", marginTop: "4px",
            boxShadow: loading ? "none" : "0 4px 12px rgba(46, 102, 110, 0.28)", width: "100%"
          }}>
            {loading
              ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Creating Account...</>
              : <>Complete Registration <ArrowRight size={17} /></>}
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
        .signup-field:focus-within {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 4px rgba(46, 102, 110, 0.14);
        }
        .signup-field input::placeholder { color: #8AA0A4; font-weight: 400; }
        .signup-field select option { color: var(--text-main); }
        /* Date field matches Profile: plain date text with the native calendar icon on the right */
        .signup-date,
        .signup-date::-webkit-datetime-edit {
          font-family: inherit;
          letter-spacing: normal;
        }
        .signup-date::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.75;
          transition: opacity 0.15s ease;
        }
        .signup-date::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        .signup-submit:not(:disabled):hover {
          background: var(--primary-dark) !important;
          box-shadow: 0 4px 14px rgba(46, 102, 110, 0.35) !important;
          transform: translateY(-1px);
        }
        .signup-select-chevron {
          color: var(--primary);
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .signup-select-trigger.is-open {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 4px rgba(46, 102, 110, 0.14);
        }
        .signup-select-trigger.is-open .signup-select-chevron {
          transform: rotate(180deg);
        }
        .signup-select-menu {
          position: absolute;
          left: 0;
          min-width: 100%;
          width: max-content;
          top: calc(100% + 6px);
          z-index: 50;
          margin: 0;
          padding: 6px;
          list-style: none;
          max-height: 260px;
          overflow-y: auto;
          background: var(--bg-surface);
          border: 1px solid var(--primary-soft);
          border-radius: 14px;
          box-shadow: 0 14px 32px rgba(18, 51, 58, 0.14), 0 2px 6px rgba(18, 51, 58, 0.06);
          animation: signupSelectIn 0.16s ease-out;
        }
        .signup-select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-main);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .signup-select-option.is-active {
          background: var(--bg-app);
          color: var(--primary);
        }
        .signup-select-option.is-selected {
          background: var(--primary-light);
          color: var(--primary-dark);
          font-weight: 700;
        }
        .signup-branch-menu {
          display: flex;
          flex-direction: column;
          z-index: 50;
          padding: 8px;
          background: var(--bg-surface);
          border: 1px solid var(--primary-soft);
          border-radius: 14px;
          box-shadow: 0 14px 32px rgba(18, 51, 58, 0.14), 0 2px 6px rgba(18, 51, 58, 0.06);
          overflow: hidden;
          animation: signupSelectIn 0.16s ease-out;
        }
        .signup-branch-search {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          height: 42px;
          margin-bottom: 6px;
          background: var(--bg-surface);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .signup-branch-search:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(46, 102, 110, 0.12);
        }
        .signup-branch-search input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: var(--text-main);
        }
        .signup-branch-search input::placeholder { color: #8AA0A4; }
        .signup-branch-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .signup-branch-option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 10px;
          background: transparent;
          text-align: left;
          font: inherit;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.45;
          color: var(--text-main);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .signup-branch-option:hover {
          background: var(--bg-app);
          color: var(--primary);
        }
        .signup-branch-option.is-selected {
          background: var(--primary-light);
          color: var(--primary-dark);
          font-weight: 700;
        }
        .signup-branch-empty {
          padding: 16px 12px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }
        @keyframes signupSelectIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 520px) {
          .signup-page {
            align-items: flex-start !important;
            padding: 12px 12px 24px !important;
            min-height: auto !important;
          }
          .signup-card {
            padding: 22px 16px !important;
            border-radius: var(--radius-lg) !important;
          }
          .signup-header { margin-bottom: 18px !important; }
          .signup-title { font-size: 20px !important; }
          /* Title + First Name share a row, Last Name gets its own */
          .signup-name-row {
            grid-template-columns: 88px 1fr !important;
          }
          .signup-name-row > :last-child {
            grid-column: 1 / -1;
          }
          .signup-two-col {
            grid-template-columns: 1fr !important;
          }
          /* 16px stops iOS Safari from zooming in when a field is focused */
          .signup-field input,
          .signup-field span,
          .signup-card input {
            font-size: 16px !important;
          }
          .signup-select-option {
            padding: 12px !important;
            font-size: 15px;
          }
        }
        @media (max-width: 340px) {
          .signup-pair {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
