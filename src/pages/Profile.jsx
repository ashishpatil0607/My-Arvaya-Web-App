import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Edit2, Check, Shield, Camera, Plus, Trash2, ChevronRight, User, HeartPulse, FileText, Users, Loader2, X, Upload, ChevronDown, Droplet, Ruler, Lock, MapPin, Calendar, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { getPatients, getFamilyDetails, upsertFamilyDetails, addFamilyMember, updateAppUser, getLocations } from "../services/dataService";
import { uploadImage, getImageUrl, fetchImageBlob } from "../services/uploadService";
import Toast from "../components/common/Toast";

function formatGender(g) {
  if (!g) return "Male";
  const code = String(g).trim().toUpperCase();
  if (code === "F" || code.startsWith("FEMALE")) return "Female";
  if (code === "M" || code.startsWith("MALE")) return "Male";
  if (code === "O" || code.startsWith("OTHER")) return "Other";
  return g;
}

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Baby", "Dr"];
const TITLE_PREFIX_RE = new RegExp(`^(${TITLES.join("|")})\\.?\\s+`, "i");

// Remove a leading title (e.g. "Mr Snehal" -> "Snehal") so it isn't shown or saved twice
function stripTitle(name) {
  return String(name || "").trim().replace(TITLE_PREFIX_RE, "");
}

// API sometimes sends title inside name ("Miss Shraddha") with title: "" — split it out
function splitTitle(name, title) {
  const raw = String(name || "").trim();
  const match = raw.match(TITLE_PREFIX_RE);
  const detected = match ? TITLES.find(t => t.toLowerCase() === match[1].toLowerCase()) : "";
  return { title: title || detected || "", name: raw.replace(TITLE_PREFIX_RE, "") };
}

function withTitle(title, name) {
  const bare = stripTitle(name);
  return title ? `${title} ${bare}` : bare;
}

function getLocationLabel(loc) {
  if (!loc) return "Select Location";
  return [loc.alt_name, loc.area, loc.street, loc.landmark, loc.zip, loc.city, loc.state]
    .filter(Boolean)
    .join(', ');
}

function ProfileSelect({ name, value, options, onChange, disabled, style, compact }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuMaxHeight, setMenuMaxHeight] = useState(260);
  const wrapRef = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const openMenu = () => {
    if (disabled) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    const boundary = wrapRef.current?.closest("[data-select-boundary]")?.getBoundingClientRect();
    const top = boundary ? boundary.top : 0;
    const bottom = boundary ? boundary.bottom : window.innerHeight;
    const menuHeight = Math.min(options.length * 40 + 12, 260);
    const spaceBelow = rect ? bottom - rect.bottom - 12 : menuHeight;
    const spaceAbove = rect ? rect.top - top - 12 : 0;
    const up = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    setDropUp(up);
    setMenuMaxHeight(Math.max(120, Math.min(260, up ? spaceAbove : spaceBelow)));
    setActiveIndex(Math.max(0, options.findIndex(o => o.value === value)));
    setOpen(true);
  };

  const choose = (opt) => {
    onChange({ target: { name, value: opt.value } });
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
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
    <div className={`profile-select${compact ? " profile-select--compact" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className={`input-field profile-select-trigger${open ? " is-open" : ""}`}
        style={style}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="profile-select-value">{selected ? selected.label : (value || "Select")}</span>
        {!disabled && <ChevronDown size={compact ? 15 : 16} className="profile-select-chevron" />}
      </button>
      {open && (
        <ul className={`profile-select-menu${dropUp ? " drop-up" : ""}`} role="listbox" style={{ maxHeight: menuMaxHeight }}>
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`profile-select-option${isSelected ? " is-selected" : ""}${i === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={15} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [loadingData, setLoadingData] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const userImageInputRef = useRef(null);
  const [uploadingUserImage, setUploadingUserImage] = useState(false);
  const [userDisplayImage, setUserDisplayImage] = useState("");

  const [toast, setToast] = useState({ isOpen: false, message: "", type: "error" });
  const showToast = (message, type = "error") => setToast({ isOpen: true, message, type });

  // Add Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: "",
    relation: "",
    dob: "",
    bloodGroup: "",
    gender: "",
    mobile: "",
    weight: "",
    height: "",
    profileImage: "",
    imageFile: null,
    abhaNumber: "",
    app_user_id: "",
    primary_account_id: "",
    entitylocation: "",
    title: ""
  });

  const [locations, setLocations] = useState([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef(null);

  const [profile, setProfile] = useState(() => ({
    ...splitTitle((user?.name || user?.full_name || user?.fullName || "").replace(/\.\./g, "."), user?.title),
    phone: user?.phone || user?.mobile_number || user?.mobile || "",
    email: (user?.email && user.email !== "john.doe@example.com") ? user.email : "",
    dob: user?.date_of_birth || user?.dob || "",
    gender: formatGender(user?.gender),
    patientId: user?.patientId || user?.user_id || user?.id || `ARV-${Math.floor(1000 + Math.random() * 9000)}`,
    uhid: user?.external_id || "",

    bloodGroup: user?.blood_group || user?.bloodGroup || "O+",
    height: (user?.height && String(user.height) !== "175") ? String(user.height) : "",
    weight: (user?.weight && String(user.weight) !== "72") ? String(user.weight) : "",
    allergies: user?.allergies || "",
    chronicDiseases: user?.chronicDiseases || "",
    medications: user?.medications || "",

    insuranceProvider: user?.insuranceProvider || "",
    policyNumber: user?.policyNumber || "",
    validity: user?.validity || "",

    emergencyName: user?.emergencyName || "",
    emergencyRelation: user?.emergencyRelation || "",
    emergencyPhone: user?.emergencyPhone || ""
  }));

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);

  const handleMemberFormChange = (e) => {
    const { name, value } = e.target;
    setMemberForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMemberForm(prev => ({
        ...prev,
        displayImage: reader.result,
        imageFile: file
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    setEditingMemberId(null);
    setMemberForm({
      name: "",
      relation: "",
      dob: "",
      bloodGroup: "A+",
      gender: "Male",
      mobile: "",
      weight: "",
      height: "",
      profileImage: "",
      displayImage: "",
      imageFile: null,
      abhaNumber: "",
      entitylocation: "",
      title: "Mr"
    });
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (member) => {
    // console.log(member)
    setEditingMemberId(member.family_detail_id || member.id);
    setMemberForm({
      name: member.name || "",
      relation: member.relation || "Spouse",
      dob: member.dob || "",
      bloodGroup: member.bloodGroup || "B+",
      gender: formatGender(member.gender),
      mobile: member.mobile || "",
      weight: member.weight || "",
      height: member.height || "",
      profileImage: member.profileImage || "",
      displayImage: member.displayImage || "",
      imageFile: null,
      abhaNumber: member.abhaNumber || "",
      app_user_id: member.app_user_id || "",
      primary_account_id: member.primary_account_id || "",
      entitylocation: member.entitylocation || member.entity_location || "",
      title: member.title || ""
    });
    setIsMemberModalOpen(true);
  };

  const fetchFamilyMembers = async () => {
    setLoadingFamily(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("arvaya_user") || "{}");
      const appUserId = user?.app_user_id || user?.user_id || user?.id || storedUser?.app_user_id || storedUser?.user_id || storedUser?.id || 107602;
      const clientId = user?.client_id || storedUser?.client_id || 1;

      const payload = {
        app_user_id: appUserId,
        client_id: clientId,
        filter: ` AND app_user_id = ${appUserId}`
      };

      const res = await getFamilyDetails(payload);

      let list = Array.isArray(res) ? res : res?.data || res?.list || res?.familyDetails || res?.result || [];
      if (Array.isArray(list)) {
        const mapped = list.map((item, idx) => {
          let age = item.age;
          if (!age && item.dob) {
            const birthYear = new Date(item.dob).getFullYear();
            const currentYear = new Date().getFullYear();
            age = Math.max(0, currentYear - birthYear);
          }
          const rawImg = item.profile_image || item.profileImage || item.image || item.family_profile_image || item.photo || "";
          let resolvedDisplayImg = "";
          if (rawImg) {
            resolvedDisplayImg = (rawImg.startsWith("data:") || rawImg.startsWith("blob:") || rawImg.startsWith("http"))
              ? rawImg
              : getImageUrl(rawImg, 'familyProfileImage');
          }
          const { title, name } = splitTitle(item.name, item.title);
          return {
            id: item.id || item.family_detail_id || idx + 1,
            family_detail_id: item.family_detail_id || item.id,
            name,
            relation: item.relation || "",
            dob: item.dob || "",
            bloodGroup: item.blood_group || item.bloodGroup || "",
            gender: item.gender || "",
            mobile: item.mobile_number || item.mobile || "",
            weight: item.weight || "",
            height: item.height || "",
            profileImage: rawImg,
            displayImage: resolvedDisplayImg,
            abhaNumber: item.abha_number || item.abhaNumber || "",
            age: age !== undefined && age !== "" ? age : 25,
            isPrimary: !!item.isPrimary,
            app_user_id: item.app_user_id,
            primary_account_id: item.primary_account_id ?? (item.isPrimary ? item.app_user_id : ""),
            entitylocation: item.entitylocation || item.entity_location || item.location_key || "",
            title
          };
        });
        setFamilyMembers(mapped);
      }
    } catch (err) {
      console.error("fetchFamilyMembers error:", err);
    } finally {
      setLoadingFamily(false);
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberForm.title) {
      showToast("Please select a title.", "error");
      return;
    }
    if (!memberForm.name.trim()) {
      showToast("Please enter the name.", "error");
      return;
    }
    if (!memberForm.relation) {
      showToast("Please select a relation.", "error");
      return;
    }
    if (!memberForm.dob) {
      showToast("Please select date of birth.", "error");
      return;
    }
    if (!memberForm.gender) {
      showToast("Please select gender.", "error");
      return;
    }
    if (!memberForm.bloodGroup) {
      showToast("Please select blood group.", "error");
      return;
    }
    if (!memberForm.entitylocation) {
      showToast("Please select an entity location.", "error");
      return;
    }

    setSavingMember(true);
    try {
      let finalImageUrl = memberForm.profileImage;

      if (memberForm.imageFile) {
        const folderName = 'familyProfileImage';
        const fileExt = memberForm.imageFile.name.split('.').pop();
        const generatedName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        try {
          const uploadRes = await uploadImage(memberForm.imageFile, folderName, generatedName);
          if (uploadRes) {
            finalImageUrl = generatedName;
          }
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
        }
      }

      let genderCode = memberForm.gender || "M";
      const lowerG = String(genderCode).trim().toLowerCase();
      if (lowerG.startsWith("f")) genderCode = "F";
      else if (lowerG.startsWith("m")) genderCode = "M";
      else if (lowerG.startsWith("o")) genderCode = "O";

      const appUserId = user?.user_id || user?.id || user?.app_user_id || user?.userKey || 1;
      const loggedInMobile = user?.phone || user?.mobile_number || user?.mobile || "";

      if (editingMemberId) {
        const payload = {
          app_user_id: memberForm.app_user_id ?? appUserId,
          primaryAccountId: Number(memberForm.primary_account_id || memberForm.app_user_id || appUserId),
          name: withTitle(memberForm.title, memberForm.name),
          relation: memberForm.relation,
          dob: memberForm.dob,
          blood_group: memberForm.bloodGroup,
          gender: genderCode,
          mobile_number: memberForm.mobile,
          is_active: 1,
          weight: memberForm.weight,
          height: memberForm.height,
          profile_image: finalImageUrl,
          abha_number: memberForm.abhaNumber,
          entitylocation: memberForm.entitylocation,
          entity_location: memberForm.entitylocation,
          client_id: user?.client_id || 1,
          title: memberForm.title,
          family_detail_id: editingMemberId,
          id: editingMemberId
        };
        await upsertFamilyDetails(payload);
      } else {
        const payload = {
          name: memberForm.name.trim(),
          mobile_number: loggedInMobile,
          gender: genderCode,
          date_of_birth: memberForm.dob,
          blood_group: memberForm.bloodGroup,
          title: memberForm.title,
          relation: memberForm.relation,
          profile_image: finalImageUrl,
          client_id: user?.client_id || 1,
          entitylocation: memberForm.entitylocation,
          entitykey: "secure-hospitals",
          primaryAccountId: appUserId
        };
        await addFamilyMember(payload);
      }

      // Refresh list from API (hitting /api/familyDetails/get after add or edit)
      await fetchFamilyMembers();

      showToast("Family member saved successfully", "success");

      setIsMemberModalOpen(false);
      setEditingMemberId(null);
      setMemberForm({
        name: "",
        relation: "",
        dob: "",
        bloodGroup: "",
        gender: "",
        mobile: "",
        weight: "",
        height: "",
        profileImage: "",
        imageFile: null,
        abhaNumber: "",
        entitylocation: "",
        title: ""
      });
    } catch (err) {
      console.error("Failed to save family member:", err);
      showToast("Failed to save family member. Please try again.", "error");
    } finally {
      setSavingMember(false);
    }
  };

  const loadPatientProfile = async () => {
    setLoadingData(true);
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
      } else if (res && typeof res === "object" && !Array.isArray(res) && (res.name || res.full_name || res.first_name || res.mobile_number || res.phone || res.id || res.user_id)) {
        patientData = res;
      }

      if (patientData) {
        let fullName = patientData.name || patientData.full_name || patientData.fullName || patientData.user_name;
        if (!fullName && (patientData.first_name || patientData.last_name)) {
          const title = patientData.title ? patientData.title.trim() + " " : "";
          fullName = `${title}${patientData.first_name || ""} ${patientData.last_name || ""}`.trim();
        }

        const parsedHeight = patientData.height ?? patientData.height_cm ?? patientData.heightCm ?? patientData.user_height;
        const parsedWeight = patientData.weight ?? patientData.weight_kg ?? patientData.weightKg ?? patientData.user_weight;
        const userImgRaw = patientData.profile_image || patientData.profileImage || patientData.photo || patientData.image || "";

        if (userImgRaw) {
          const resolvedBlob = await fetchImageBlob(userImgRaw, "patientProfileImage") || getImageUrl(userImgRaw, "patientProfileImage");
          if (resolvedBlob) setUserDisplayImage(resolvedBlob);
        }

        const rawEmail = patientData.email || user?.email || "";
        const cleanEmail = (rawEmail && rawEmail !== "john.doe@example.com") ? rawEmail : (prev.email !== "john.doe@example.com" ? prev.email : "");
        const rawHeight = parsedHeight ?? user?.height;
        const cleanHeight = (rawHeight !== null && rawHeight !== undefined && String(rawHeight).trim() !== "" && String(rawHeight) !== "175") ? String(rawHeight) : (prev.height !== "175" ? prev.height : "");
        const rawWeight = parsedWeight ?? user?.weight;
        const cleanWeight = (rawWeight !== null && rawWeight !== undefined && String(rawWeight).trim() !== "" && String(rawWeight) !== "72") ? String(rawWeight) : (prev.weight !== "72" ? prev.weight : "");

        setProfile(prev => ({
          ...prev,
          ...patientData,
          ...splitTitle((fullName || "").replace(/\.\./g, "."), patientData.title || prev.title),
          phone: patientData.mobile_number || patientData.phone || patientData.mobile || patientData.mobile_no || prev.phone,
          email: cleanEmail,
          dob: patientData.date_of_birth || patientData.dob || prev.dob,
          gender: formatGender(patientData.gender || prev.gender),
          patientId: patientData.patientId || patientData.user_id || patientData.id || prev.patientId,
          uhid: patientData.external_id || prev.uhid,
          bloodGroup: patientData.blood_group || patientData.bloodGroup || prev.bloodGroup,
          height: cleanHeight,
          weight: cleanWeight,
          profile_image: userImgRaw || prev.profile_image || ""
        }));
      }
    } catch (err) {
      console.error("Error loading patient profile data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    document.title = "Patient Profile | Arvaya Patient Portal";
    loadPatientProfile();
  }, [user]);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const saved = localStorage.getItem("arvaya_location");
        let defaultLoc = "";
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            defaultLoc = parsed?.entitylocation || parsed?.location_key || "";
          } catch { }
        }
        const res = await getLocations(1, 100);
        const allLocs = res?.list || [];
        setLocations(allLocs);
        if (!defaultLoc && allLocs.length > 0) {
          defaultLoc = allLocs[0].entitylocation || "";
        }
        if (defaultLoc) {
          setMemberForm(prev => ({ ...prev, entitylocation: defaultLoc }));
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) {
        setLocationDropdownOpen(false);
      }
    }
    if (locationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [locationDropdownOpen]);

  useEffect(() => {
    if (isMemberModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMemberModalOpen]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleStartEdit = () => {
    setActiveTab("personal");
    setIsEditing(true);
  };

  const handleUserProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUserDisplayImage(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingUserImage(true);
    try {
      const folderName = 'patientProfileImage';
      const fileExt = file.name.split('.').pop();
      const generatedName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

      // 1. Instantly trigger upload API
      const uploadRes = await uploadImage(file, folderName, generatedName);
      const filenameToSend = uploadRes?.filename || uploadRes?.fileName || generatedName;

      setProfile(prev => ({
        ...prev,
        profile_image: filenameToSend
      }));

      // 2. Instantly send uploaded image in payload of api/appUser/upsert
      const storedUser = localStorage.getItem("arvaya_user");
      let appUserId = user?.id || user?.user_id || user?.app_user_id;
      if (!appUserId && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          appUserId = parsed?.id || parsed?.user_id || parsed?.app_user_id;
        } catch (err) { }
      }

      let genderCode = profile.gender || "M";
      const lowerG = String(genderCode).trim().toLowerCase();
      if (lowerG.startsWith("f")) genderCode = "F";
      else if (lowerG.startsWith("m")) genderCode = "M";
      else if (lowerG.startsWith("o")) genderCode = "O";

      const payload = {
        id: appUserId,
        app_user_id: appUserId,
        title: profile.title || "",
        name: withTitle(profile.title, profile.name),
        email: profile.email,
        mobile_number: profile.phone,
        date_of_birth: profile.dob,
        gender: genderCode,
        blood_group: profile.bloodGroup,
        height: String(profile.height || ""),
        weight: String(profile.weight || ""),
        profile_image: filenameToSend,
        client_id: user?.client_id || 1,
        is_active: 1
      };

      await updateAppUser(payload);

      // 3. Retrieve image from backend folder patientProfileImage
      const blobUrl = await fetchImageBlob(filenameToSend, folderName);
      if (blobUrl) {
        setUserDisplayImage(blobUrl);
      }

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const updatedUser = {
            ...parsed,
            profile_image: filenameToSend
          };
          localStorage.setItem("arvaya_user", JSON.stringify(updatedUser));
        } catch (err) { }
      }

      window.dispatchEvent(new Event("arvaya_profile_updated"));
    } catch (uploadErr) {
      console.error("User profile image upload error:", uploadErr);
    } finally {
      setUploadingUserImage(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const storedUser = localStorage.getItem("arvaya_user");
      let appUserId = user?.id || user?.user_id || user?.app_user_id;
      if (!appUserId && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          appUserId = parsed?.id || parsed?.user_id || parsed?.app_user_id;
        } catch (e) { }
      }

      let genderCode = profile.gender || "M";
      const lowerG = String(genderCode).trim().toLowerCase();
      if (lowerG.startsWith("f")) genderCode = "F";
      else if (lowerG.startsWith("m")) genderCode = "M";
      else if (lowerG.startsWith("o")) genderCode = "O";

      const payload = {
        id: appUserId,
        app_user_id: appUserId,
        title: profile.title || "",
        name: withTitle(profile.title, profile.name),
        email: profile.email,
        mobile_number: profile.phone,
        date_of_birth: profile.dob,
        gender: genderCode,
        blood_group: profile.bloodGroup,
        height: String(profile.height || ""),
        weight: String(profile.weight || ""),
        profile_image: profile.profile_image || "",
        client_id: user?.client_id || 1,
        is_active: 1
      };

      // Trigger /api/appUser/upsert
      await updateAppUser(payload);

      // Immediately trigger /api/appUser/get to refresh profile from backend
      await loadPatientProfile();

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const updatedUser = {
            ...parsed,
            title: profile.title || "",
            name: withTitle(profile.title, profile.name),
            email: profile.email,
            phone: profile.phone,
            mobile_number: profile.phone,
            gender: profile.gender,
            blood_group: profile.bloodGroup,
            height: profile.height,
            weight: profile.weight,
            profile_image: profile.profile_image || ""
          };
          localStorage.setItem("arvaya_user", JSON.stringify(updatedUser));
        } catch (e) { }
      }

      window.dispatchEvent(new Event("arvaya_profile_updated"));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile via appUser/upsert:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const inputStyle = !isEditing ? { background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' } : { padding: '12px 16px' };

  return (
    <main id="profile-page-main" className="page animate-fade-in-up" style={{ padding: 0, background: 'var(--bg-app)' }}>

      {/* ── Internal Hero ── */}
      <div className="profile-hero-banner">
        <svg className="profile-hero-wave" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C150,90 320,10 500,45 L500,0 L0,0 Z" fill="rgba(255, 255, 255, 0.42)" />
        </svg>

        <div className="container">
          <div className="profile-hero-inner">
            <div className="profile-hero-content">
              <nav aria-label="Breadcrumb" className="profile-hero-breadcrumb">
                <Link to="/" className="profile-breadcrumb-link">Home</Link>
                <ChevronRight size={13} className="profile-breadcrumb-sep" />
                <span>Patient Profile</span>
              </nav>
              <h1 id="profile-heading" className="profile-hero-title">Patient Profile</h1>
              <p className="profile-hero-desc">Manage your personal, medical, and insurance records.</p>
            </div>

            <div className="profile-hero-actions">

              <div className="profile-hero-graphic" aria-hidden="true">
                <svg className="profile-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Sparkles */}
                  <path d="M107 19C107 23.2 109.8 26 114 26C109.8 26 107 28.8 107 33C107 28.8 104.2 26 100 26C104.2 26 107 23.2 107 19Z" fill="#14b8a6" />
                  <path d="M13 46C13 49.5 15.5 52 19 52C15.5 52 13 54.5 13 58C13 54.5 10.5 52 7 52C10.5 52 13 49.5 13 46Z" fill="#14b8a6" />
                  <circle cx="16" cy="74" r="2" fill="#2dd4bf" />
                  <circle cx="112" cy="45" r="1.5" fill="#2dd4bf" />

                  {/* ID card */}
                  <rect x="22" y="30" width="72" height="56" rx="11" fill="#ffffff" stroke="#0d9488" strokeWidth="3.2" />
                  <circle cx="43" cy="52" r="8" fill="#ccfbf1" stroke="#0d9488" strokeWidth="3" />
                  <path d="M31 74C31 67.5 36.4 63 43 63C49.6 63 55 67.5 55 74" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                  <path d="M62 50H82" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                  <path d="M62 61H80" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
                  <path d="M62 72H74" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />

                  {/* Medical cross badge */}
                  <circle cx="88" cy="84" r="13" fill="#2dd4bf" stroke="#0d9488" strokeWidth="3" />
                  <path d="M88 78V90M82 84H94" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '32px', alignItems: 'start' }}>

          {/* Left Sticky Profile Card */}
          <aside className="profile-sidebar" style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card-elevated profile-header-card" style={{ padding: '32px 24px', textAlign: 'center', borderRadius: '16px' }}>
              <div className="profile-card-cover" aria-hidden="true">
                <svg viewBox="0 0 300 90" preserveAspectRatio="none">
                  <path d="M0,60 C80,95 200,30 300,62 L300,0 L0,0 Z" fill="rgba(255, 255, 255, 0.35)" />
                </svg>
              </div>
              <div className="profile-avatar-wrap" style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                <div
                  className="animate-scale-in profile-avatar-circle"
                  style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '700', boxShadow: '0 8px 24px rgba(46,102,110,0.2)', margin: '0 auto', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                  onClick={() => userImageInputRef.current?.click()}
                  title="Click to upload profile photo"
                >
                  {userDisplayImage || profile.profile_image ? (
                    <img
                      src={userDisplayImage || getImageUrl(profile.profile_image, 'patientProfileImage')}
                      alt={profile.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => userImageInputRef.current?.click()}
                  className="hover-glow profile-camera-btn"
                  style={{ position: 'absolute', bottom: '0', right: '0', width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2 }}
                  title="Upload Profile Image"
                >
                  {uploadingUserImage ? <Loader2 size={16} className="animate-spin text-primary" /> : <Camera size={16} />}
                </button>
                <input
                  type="file"
                  ref={userImageInputRef}
                  accept="image/*"
                  onChange={handleUserProfileImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <h2 className="profile-patient-name" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>{profile.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className="badge badge-success profile-kyc-badge" style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(22, 163, 74, 0.18)' }}>
                  <Shield size={13} /> KYC Verified
                </span>
                <span className="profile-patient-id-badge" style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--primary-dark, #0F4D58)',
                  background: 'var(--primary-light, #E4EEEF)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(15, 77, 88, 0.15)'
                }}>
                  UHID: {profile.uhid || 'NA'}
                </span>
              </div>

              {/* Quick Stats Grid */}
              <div className="profile-quick-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <div className="profile-stat-tile profile-stat-tile--blood">
                  <span className="profile-stat-icon"><Droplet size={14} /></span>
                  <div className="profile-stat-label">Blood Group</div>
                  <div className="profile-stat-value" style={{ fontSize: '16px' }}>{profile.bloodGroup || 'A+'}</div>
                </div>
                <div className="profile-stat-tile profile-stat-tile--body">
                  <span className="profile-stat-icon"><Ruler size={14} /></span>
                  <div className="profile-stat-label">Height / Weight</div>
                  <div className="profile-stat-value" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {profile.height && profile.weight
                      ? `${parseFloat(profile.height)}cm / ${parseFloat(profile.weight)}kg`
                      : profile.height
                        ? `${parseFloat(profile.height)}cm`
                        : profile.weight
                          ? `${parseFloat(profile.weight)}kg`
                          : 'NA'}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Horizontal Tabs */}
            <div className="card-elevated styled-scrollbar profile-tabs-bar" style={{ padding: '8px', borderRadius: '16px', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {[
                { id: 'personal', label: 'Personal Details', icon: User },
                { id: 'family', label: 'Family Members', icon: Users }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`profile-tab-btn${isActive ? ' profile-tab-btn--active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'family') {
                        fetchFamilyMembers();
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 20px', borderRadius: '12px',
                      fontSize: '14px', fontWeight: isActive ? '700' : '600',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      background: isActive ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : 'transparent',
                      boxShadow: isActive ? '0 6px 16px rgba(13, 148, 136, 0.25)' : 'none',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      flex: '1', justifyContent: 'center'
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-app)'; }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={16} className={isActive ? '' : 'text-muted'} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Form Content */}
            <div className="card-elevated profile-form-card" style={{ padding: '22px 28px 28px', borderRadius: '16px', background: 'var(--bg-surface)' }}>
              {activeTab === 'personal' && (
                <div className="animate-fade-in-up">
                  <div className="profile-section-head" style={{ flexWrap: 'wrap' }}>
                    <span className="profile-section-icon"><User size={20} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="profile-section-title">Personal Information</h3>
                      <p className="profile-section-sub">{isEditing ? 'Update your details and click Save Changes.' : 'Your basic details used for bookings and records.'}</p>
                    </div>
                    <button
                      id="profile-edit-btn"
                      className={`profile-edit-btn${isEditing ? ' profile-edit-btn--save' : ''}`}
                      onClick={isEditing ? handleSaveProfile : handleStartEdit}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                      ) : isEditing ? (
                        <><Check size={16} /> Save Changes</>
                      ) : (
                        <><Edit2 size={16} /> Edit Profile</>
                      )}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Row 1: Title + Full Name & Email Address */}
                    <div className="profile-form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
                        <div className="flex flex-col gap-2">
                          <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Title</label>
                          <ProfileSelect
                            name="title"
                            value={profile.title || ""}
                            onChange={handleChange}
                            disabled={!isEditing}
                            style={inputStyle}
                            options={[{ value: "", label: "None" }, ...TITLES.map(v => ({ value: v, label: v }))]}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Full Name</label>
                          <input name="name" value={profile.name} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Email Address</label>
                        <input name="email" value={profile.email || ""} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} placeholder="Enter email address" />
                      </div>
                    </div>

                    {/* Row 2: Phone Number & Date of Birth */}
                    <div className="profile-form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Phone Number</label>
                        <div style={{ position: 'relative' }}>
                          <input name="phone" value={profile.phone} readOnly className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 40px 12px 16px', cursor: isEditing ? 'not-allowed' : undefined, width: '100%' }} />
                          <Lock size={15} className="profile-input-lock" aria-label="Phone number cannot be changed" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Date of Birth</label>
                        <input
                          type="date"
                          name="dob"
                          value={profile.dob}
                          min={new Date(new Date().setFullYear(new Date().getFullYear() - 150)).toISOString().split("T")[0]}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={handleChange}
                          readOnly={!isEditing}
                          className="input-field"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Row 3: Gender, Blood Group, Height (cm), Weight (kg) in 1 Row */}
                    <div className="profile-form-row-4col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Gender</label>
                        <ProfileSelect
                          name="gender"
                          value={profile.gender}
                          onChange={handleChange}
                          disabled={!isEditing}
                          style={inputStyle}
                          options={["Male", "Female", "Other"].map(v => ({ value: v, label: v }))}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Blood Group</label>
                        <ProfileSelect
                          name="bloodGroup"
                          value={profile.bloodGroup}
                          onChange={handleChange}
                          disabled={!isEditing}
                          style={inputStyle}
                          options={["B+", "A+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map(v => ({ value: v, label: v }))}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Height (cm)</label>
                        <input name="height" type="number" value={profile.height} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} placeholder="E.g., 175" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Weight (kg)</label>
                        <input name="weight" type="number" value={profile.weight} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} placeholder="E.g., 70" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'medical' && (
                <div className="animate-fade-in-up">
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HeartPulse size={20} className="text-primary" /> Medical History
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Blood Group</label>
                      <select name="bloodGroup" value={profile.bloodGroup} onChange={handleChange} disabled={true} className="input-field" style={{ ...inputStyle, appearance: 'none' }}>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Height (cm)</label>
                      <input name="height" type="number" value={profile.height} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Weight (kg)</label>
                      <input name="weight" type="number" value={profile.weight} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Allergies</label>
                      <input name="allergies" value={profile.allergies} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} placeholder="E.g., Peanuts, Dust" />
                    </div>
                    <div className="flex flex-col gap-2" style={{ gridColumn: '1 / -1' }}>
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Chronic Diseases</label>
                      <input name="chronicDiseases" value={profile.chronicDiseases} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} placeholder="E.g., Asthma, Diabetes" />
                    </div>
                    <div className="flex flex-col gap-2" style={{ gridColumn: '1 / -1' }}>
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Current Medications</label>
                      <input name="medications" value={profile.medications} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insurance' && (
                <div className="animate-fade-in-up">
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} className="text-primary" /> Primary Insurance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Provider Name</label>
                      <input name="insuranceProvider" value={profile.insuranceProvider} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Policy Number</label>
                      <input name="policyNumber" value={profile.policyNumber} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Validity</label>
                      <input type="date" name="validity" value={profile.validity} onChange={handleChange} readOnly={true} className="input-field" style={{ background: 'var(--bg-app)', borderColor: 'transparent', color: 'var(--text-main)', padding: '12px 16px' }} />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px 0' }} />

                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
                    Emergency Contact
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Contact Name</label>
                      <input name="emergencyName" value={profile.emergencyName} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Relationship</label>
                      <input name="emergencyRelation" value={profile.emergencyRelation} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Phone Number</label>
                      <input name="emergencyPhone" value={profile.emergencyPhone} onChange={handleChange} readOnly={!isEditing} className="input-field" style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'family' && (
                <div className="animate-fade-in-up">
                  <div className="profile-section-head family-section-head">
                    <span className="profile-section-icon"><Users size={20} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="profile-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        Family Members
                        {!loadingFamily && familyMembers.length > 0 && (
                          <span className="family-count-chip">{familyMembers.length}</span>
                        )}
                      </h3>
                      <p className="profile-section-sub">Manage profiles for your dependents and family members.</p>
                    </div>
                    <button className="family-add-btn" onClick={handleOpenAddModal}>
                      <Plus size={16} /> Add Member
                    </button>
                  </div>

                  {loadingFamily ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '60px 20px', gap: '12px', background: 'var(--bg-app)', borderRadius: '16px',
                      border: '1px solid var(--border)', minHeight: '220px'
                    }}>
                      <Loader2 size={36} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
                        Loading family members...
                      </span>
                    </div>
                  ) : (
                    <div className="family-list">
                      {familyMembers.map(member => (
                        <div key={member.id} className={`family-card${member.isPrimary ? ' family-card--primary' : ''}`}>
                          <div className="family-card-main">
                            <div className="family-card-avatar">
                              {member.displayImage ? (
                                <img
                                  src={member.displayImage}
                                  alt={member.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {(member.name || "M").charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="family-card-name-row">
                                <h4 className="family-card-name">{withTitle(member.title, member.name)}</h4>
                                {member.relation && <span className="family-relation-chip">{member.relation}</span>}
                              </div>
                              <div className="family-card-meta">
                                <span className="family-meta-pill"><Calendar size={12} /> {member.age} yrs</span>
                                {member.bloodGroup && <span className="family-meta-pill family-meta-pill--blood"><Droplet size={12} /> {member.bloodGroup}</span>}
                                {member.mobile && <span className="family-meta-pill"><Phone size={12} /> {member.mobile}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="family-card-actions">
                            {member.isPrimary ? (
                              <span className="family-primary-badge"><Shield size={13} /> Primary Account</span>
                            ) : (
                              <button className="family-edit-btn" onClick={() => handleEditMember(member)} title="Edit Member">
                                <Edit2 size={14} /> <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {familyMembers.length === 0 && (
                        <div className="family-empty">
                          <span className="family-empty-icon"><Users size={26} /></span>
                          <div className="family-empty-title">No family members yet</div>
                          <div className="family-empty-sub">Click "Add Member" or click tab to refresh.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Add/Edit Family Member Modal ── */}
      {isMemberModalOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="animate-scale-in family-modal" style={{
            background: 'var(--bg-surface, #ffffff)', borderRadius: '24px', width: '100%', maxWidth: '580px',
            boxShadow: '0 30px 80px -16px rgba(11, 37, 69, 0.45), 0 0 0 1px rgba(20, 184, 166, 0.12)', overflow: 'hidden',
            maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column', margin: 'auto 0'
          }}>
            {/* Modal Header — hero with live member preview */}
            <div className="family-modal-header">
              <span className="family-modal-blob family-modal-blob--a" aria-hidden="true" />
              <span className="family-modal-blob family-modal-blob--b" aria-hidden="true" />
              <svg className="family-modal-wave" viewBox="0 0 500 60" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,40 C140,0 320,70 500,20 L500,60 L0,60 Z" fill="currentColor" />
              </svg>

              <div className="family-modal-topbar">
                <span className="family-modal-badge">
                  {editingMemberId ? <Edit2 size={12} /> : <Plus size={12} />}
                  {editingMemberId ? "Edit Family Member" : "Add Family Member"}
                </span>
                <button
                  type="button"
                  className="family-modal-close"
                  aria-label="Close"
                  onClick={() => { setIsMemberModalOpen(false); setEditingMemberId(null); }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="family-modal-hero">
                <label className="family-modal-avatar" title="Upload photo">
                  {memberForm.displayImage ? (
                    <img src={memberForm.displayImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{(memberForm.name.trim().charAt(0) || "F").toUpperCase()}</span>
                  )}
                  <span className="family-modal-avatar-cam"><Camera size={13} /></span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
                <div className="family-modal-hero-body">
                  <h3 className="family-modal-title">
                    {[memberForm.title, memberForm.name.trim()].filter(Boolean).join(" ") || "New Member"}
                  </h3>
                  <div className="family-modal-chips">
                    {memberForm.relation && <span className="family-modal-chip"><Users size={11} /> {memberForm.relation}</span>}
                    {memberForm.bloodGroup && <span className="family-modal-chip family-modal-chip--blood"><Droplet size={11} /> {memberForm.bloodGroup}</span>}
                    {memberForm.gender && <span className="family-modal-chip"><User size={11} /> {memberForm.gender}</span>}
                    {!memberForm.relation && !memberForm.bloodGroup && !memberForm.gender && (
                      <span className="family-modal-sub">Tap the avatar to upload a photo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMember} data-select-boundary className="family-modal-form">
              <div className="family-modal-scroll">

                {/* Section: Personal Details */}
                <div className="family-modal-section">
                  <div className="family-modal-section-head">
                    <span className="family-modal-section-icon"><User size={14} /></span>
                    Personal Details
                  </div>

                  <div className="modal-form-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.6fr', gap: '12px' }}>
                    <div className="flex flex-col family-modal-field">
                      <label className="family-modal-label">Title <em>*</em></label>
                      <ProfileSelect
                        compact
                        name="title"
                        value={memberForm.title}
                        onChange={handleMemberFormChange}
                        options={[{ value: "", label: "None" }, ...TITLES.map(v => ({ value: v, label: v }))]}
                      />
                    </div>

                    <div className="flex flex-col family-modal-field">
                      <label className="family-modal-label">Name <em>*</em></label>
                      <input name="name" value={memberForm.name} onChange={handleMemberFormChange} placeholder="Full Name" className="input-field" />
                    </div>

                    <div className="flex flex-col family-modal-field">
                      <label className="family-modal-label">Relation <em>*</em></label>
                      <ProfileSelect
                        compact
                        name="relation"
                        value={memberForm.relation}
                        onChange={handleMemberFormChange}
                        options={[{ value: "", label: "None" }, ...["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"].map(v => ({ value: v, label: v }))]}
                      />
                    </div>
                  </div>

                  <div className="modal-form-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px' }}>
                    <div className="flex flex-col family-modal-field">
                      <label className="family-modal-label">Date of Birth <em>*</em></label>
                      <input type="date" name="dob" value={memberForm.dob} max={new Date().toISOString().split('T')[0]} onChange={handleMemberFormChange} className="input-field" />
                    </div>

                    <div className="flex flex-col family-modal-field">
                      <label className="family-modal-label">Gender <em>*</em></label>
                      <div className="family-modal-segment" role="radiogroup" aria-label="Gender">
                        {["Male", "Female", "Other"].map(g => (
                          <button
                            key={g}
                            type="button"
                            role="radio"
                            aria-checked={memberForm.gender === g}
                            className={`family-modal-segment-btn${memberForm.gender === g ? ' is-active' : ''}`}
                            onClick={() => handleMemberFormChange({ target: { name: "gender", value: g } })}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Health & Location */}
                <div className="family-modal-section">
                  <div className="family-modal-section-head">
                    <span className="family-modal-section-icon family-modal-section-icon--rose"><HeartPulse size={14} /></span>
                    Health &amp; Location
                  </div>

                  <div className="flex flex-col family-modal-field">
                    <label className="family-modal-label">Blood Group <em>*</em></label>
                    <div className="family-modal-blood" role="radiogroup" aria-label="Blood Group">
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                        <button
                          key={bg}
                          type="button"
                          role="radio"
                          aria-checked={memberForm.bloodGroup === bg}
                          className={`family-modal-blood-btn${memberForm.bloodGroup === bg ? ' is-active' : ''}`}
                          onClick={() => handleMemberFormChange({ target: { name: "bloodGroup", value: bg } })}
                        >
                          <Droplet size={12} /> {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col family-modal-field">
                    <label className="family-modal-label">Entity Location <em>*</em></label>
                    <div ref={locationDropdownRef} style={{ position: 'relative' }}>
                      <div
                        onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                        className={`family-modal-location${locationDropdownOpen ? ' is-open' : ''}`}
                      >
                        <span className="family-modal-location-pin"><MapPin size={14} /></span>
                        <div style={{
                          flex: 1, fontSize: '13px', fontWeight: '600',
                          color: memberForm.entitylocation ? 'var(--text-main)' : '#9ca3af',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {memberForm.entitylocation
                            ? (getLocationLabel(locations.find(l => l.entitylocation === memberForm.entitylocation || String(l.id) === String(memberForm.entitylocation) || String(l.location_key) === String(memberForm.entitylocation))) || memberForm.entitylocation)
                            : "Select Location"}
                        </div>
                        <ChevronDown size={15} color="#0d9488" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: locationDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </div>

                      {locationDropdownOpen && (
                        <div className="family-modal-location-menu">
                          {locations.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Loading locations...</div>
                          ) : (
                            locations.map(loc => {
                              const isSelected = memberForm.entitylocation === loc.entitylocation;
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => {
                                    setMemberForm(prev => ({ ...prev, entitylocation: loc.entitylocation || "" }));
                                    setLocationDropdownOpen(false);
                                  }}
                                  className={`family-modal-location-option${isSelected ? ' is-selected' : ''}`}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: '13px', fontWeight: isSelected ? '700' : '600',
                                      color: isSelected ? '#0f766e' : 'inherit',
                                      lineHeight: '1.4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                      {getLocationLabel(loc) || loc.entitylocation || "Location"}
                                    </div>
                                  </div>
                                  {isSelected && <Check size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Footer Actions */}
              <div className="family-modal-footer">
                <span className="family-modal-footer-note"><Shield size={13} /> Details are kept private</span>
                <div className="family-modal-footer-actions">
                  <button type="button" className="btn btn-secondary family-modal-cancel" onClick={() => setIsMemberModalOpen(false)} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={savingMember} className="btn btn-primary flex items-center gap-2 family-modal-save" style={{ padding: '10px 22px', fontSize: '13.5px' }}>
                    {savingMember ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={15} /> {editingMemberId ? "Save Changes" : "Add Member"}</>}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .profile-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 13.5px;
          font-weight: 700;
          color: #0d9488;
          background: #ffffff;
          border: 1.5px solid rgba(13, 148, 136, 0.35);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .profile-edit-btn:hover:not(:disabled) {
          color: #ffffff;
          background: #0d9488;
          border-color: #0d9488;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.28);
        }
        .profile-edit-btn--save {
          color: #ffffff;
          border-color: transparent;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.28);
        }
        .profile-edit-btn--save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(13, 148, 136, 0.36);
        }
        .profile-edit-btn:disabled {
          opacity: 0.75;
          cursor: default;
        }
        @media (max-width: 560px) {
          .profile-edit-btn {
            width: 100%;
            justify-content: center;
          }
        }
        .family-section-head {
          flex-wrap: wrap;
        }
        .family-count-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          color: #0d9488;
          background: #ccf4eb;
        }
        .family-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border: none;
          border-radius: 999px;
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.28);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .family-add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(13, 148, 136, 0.36);
        }
        .family-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .family-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px 16px 22px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(20, 184, 166, 0.16);
          box-shadow: 0 2px 8px rgba(11, 37, 69, 0.04);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .family-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #5ccfbf 0%, #0d9488 100%);
        }
        .family-card:hover {
          transform: translateY(-2px);
          border-color: rgba(20, 184, 166, 0.35);
          box-shadow: 0 10px 24px rgba(13, 148, 136, 0.12);
        }
        .family-card--primary {
          background: linear-gradient(120deg, #f6fdfb 0%, #e9f8f3 100%);
        }
        .family-card--primary::before {
          background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
        }
        .family-card-main {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .family-card-avatar {
          position: relative;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 800;
          color: #ffffff;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.22), 0 6px 14px rgba(13, 148, 136, 0.2);
        }
        .family-card-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .family-card-name {
          margin: 0;
          font-size: 15.5px;
          font-weight: 700;
          color: #0b2545;
        }
        .family-relation-chip {
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          color: #0f766e;
          background: #e3f7f2;
          border: 1px solid rgba(13, 148, 136, 0.18);
        }
        .family-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 7px;
        }
        .family-meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #55738d;
          background: #f3f7f9;
          border: 1px solid #e5edf1;
        }
        .family-meta-pill svg {
          color: #0d9488;
        }
        .family-meta-pill--blood {
          color: #be123c;
          background: #fff1f2;
          border-color: rgba(225, 29, 72, 0.14);
        }
        .family-meta-pill--blood svg {
          color: #e11d48;
        }
        .family-card-actions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .family-primary-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          color: #15803d;
          background: #dcfce7;
          border: 1px solid rgba(22, 163, 74, 0.2);
        }
        .family-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0d9488;
          background: #ffffff;
          border: 1px solid rgba(13, 148, 136, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .family-edit-btn:hover {
          color: #ffffff;
          background: #0d9488;
          border-color: #0d9488;
          box-shadow: 0 6px 14px rgba(13, 148, 136, 0.25);
        }
        .family-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 36px 20px;
          text-align: center;
          border-radius: 16px;
          border: 1.5px dashed rgba(13, 148, 136, 0.3);
          background: linear-gradient(135deg, #f6fdfb 0%, #effaf7 100%);
        }
        .family-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
          background: #ffffff;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.15);
          margin-bottom: 6px;
        }
        .family-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: #0b2545;
        }
        .family-empty-sub {
          font-size: 13px;
          color: #55738d;
        }
        @media (max-width: 560px) {
          .family-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 14px 14px 14px 18px;
          }
          .family-card-actions {
            align-self: flex-end;
          }
          .family-card-avatar {
            width: 44px;
            height: 44px;
            font-size: 16px;
          }
          .family-add-btn {
            width: 100%;
            justify-content: center;
          }
        }
        .profile-select--compact .profile-select-trigger {
          padding: 9px 12px !important;
          font-size: 13.5px;
          min-height: 42px;
        }
        .profile-select--compact .profile-select-option {
          font-size: 13px;
          padding: 8px 10px;
        }
        .family-modal-header {
          position: relative;
          overflow: hidden;
          padding: 16px 20px 30px;
          color: #ffffff;
          background: linear-gradient(135deg, #0b3b4a 0%, #0f766e 55%, #14b8a6 100%);
          flex-shrink: 0;
        }
        .family-modal-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .family-modal-blob--a {
          width: 180px;
          height: 180px;
          top: -80px;
          right: -40px;
          background: radial-gradient(circle, rgba(94, 234, 212, 0.45) 0%, rgba(94, 234, 212, 0) 70%);
        }
        .family-modal-blob--b {
          width: 120px;
          height: 120px;
          bottom: -50px;
          left: 35%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
        }
        .family-modal-wave {
          position: absolute;
          left: 0;
          bottom: -1px;
          width: 100%;
          height: 22px;
          color: var(--bg-surface, #ffffff);
          pointer-events: none;
        }
        .family-modal-topbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .family-modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(6px);
        }
        .family-modal-close {
          position: relative;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .family-modal-close:hover {
          background: #ffffff;
          color: #e11d48;
          transform: rotate(90deg);
        }
        .family-modal-hero {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .family-modal-avatar {
          position: relative;
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          background: linear-gradient(135deg, #5eead4 0%, #0d9488 100%);
          border: 3px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 24px rgba(3, 30, 40, 0.35);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .family-modal-avatar > img,
        .family-modal-avatar > span:first-child {
          border-radius: 50%;
          overflow: hidden;
        }
        .family-modal-avatar:hover {
          transform: scale(1.04);
        }
        .family-modal-avatar-cam {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
          background: #ffffff;
          box-shadow: 0 4px 10px rgba(3, 30, 40, 0.3);
        }
        .family-modal-hero-body {
          min-width: 0;
          flex: 1;
        }
        .family-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .family-modal-sub {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.78);
        }
        .family-modal-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .family-modal-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .family-modal-chip--blood {
          background: rgba(244, 63, 94, 0.28);
          border-color: rgba(254, 205, 211, 0.45);
        }
        .family-modal-form {
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
        }
        .family-modal-scroll {
          padding: 8px 20px 4px;
          overflow-y: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .family-modal-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(180deg, #f8fdfc 0%, #ffffff 100%);
          border: 1px solid rgba(13, 148, 136, 0.12);
        }
        .family-modal-section-head {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13.5px;
          font-weight: 800;
          color: #0b2545;
        }
        .family-modal-section-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
          background: #ccf4eb;
        }
        .family-modal-section-icon--rose {
          color: #e11d48;
          background: #ffe4e6;
        }
        .family-modal-field {
          gap: 6px;
          min-width: 0;
        }
        .family-modal-label {
          font-size: 11px;
          font-weight: 700;
          color: #55738d;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .family-modal-label em {
          font-style: normal;
          color: #e11d48;
        }
        .family-modal .input-field {
          border-radius: 12px;
          background: #ffffff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .family-modal input.input-field {
          padding: 9px 12px;
          font-size: 13.5px;
          min-height: 42px;
        }
        .family-modal .input-field:hover {
          border-color: rgba(20, 184, 166, 0.45);
        }
        .family-modal .input-field:focus {
          outline: none;
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
        }
        .family-modal-segment {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          padding: 4px;
          min-height: 42px;
          box-sizing: border-box;
          border-radius: 12px;
          background: #eef6f5;
          border: 1px solid var(--border);
        }
        .family-modal-segment-btn {
          border: none;
          border-radius: 9px;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #55738d;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .family-modal-segment-btn:hover {
          color: #0d9488;
        }
        .family-modal-segment-btn.is-active {
          color: #ffffff;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          box-shadow: 0 4px 10px rgba(13, 148, 136, 0.28);
        }
        .family-modal-blood {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
        }
        .family-modal-blood-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #ffffff;
          font-size: 12.5px;
          font-weight: 700;
          color: #334e68;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .family-modal-blood-btn svg {
          color: #fb7185;
        }
        .family-modal-blood-btn:hover {
          border-color: rgba(225, 29, 72, 0.4);
          background: #fff5f6;
        }
        .family-modal-blood-btn.is-active {
          color: #ffffff;
          border-color: transparent;
          background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%);
          box-shadow: 0 6px 14px rgba(225, 29, 72, 0.28);
        }
        .family-modal-blood-btn.is-active svg {
          color: #ffffff;
        }
        .family-modal-location {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
          min-height: 46px;
          padding: 7px 12px 7px 7px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #ffffff;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .family-modal-location:hover {
          border-color: rgba(20, 184, 166, 0.45);
        }
        .family-modal-location.is-open {
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
        }
        .family-modal-location-pin {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
          background: #ccf4eb;
          flex-shrink: 0;
        }
        .family-modal-location-menu {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 99;
          max-height: 220px;
          overflow-y: auto;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #ffffff;
          border: 1px solid rgba(20, 184, 166, 0.2);
          border-radius: 14px;
          box-shadow: 0 -14px 32px rgba(11, 37, 69, 0.14), 0 -2px 6px rgba(11, 37, 69, 0.06);
          animation: profileSelectIn 0.16s ease-out;
        }
        .family-modal-location-option {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #0b2545;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .family-modal-location-option:hover {
          background: #effaf7;
          color: #0d9488;
        }
        .family-modal-location-option.is-selected {
          background: linear-gradient(135deg, #ccf4eb 0%, #b4ede1 100%);
        }
        .family-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px 20px;
          margin-top: 12px;
          background: #f8fbfc;
          border-top: 1px solid rgba(13, 148, 136, 0.12);
          flex-shrink: 0;
        }
        .family-modal-footer-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #7a94a9;
        }
        .family-modal-footer-note svg {
          color: #0d9488;
        }
        .family-modal-footer-actions {
          display: flex;
          gap: 10px;
          margin-left: auto;
        }
        .family-modal-cancel {
          border-radius: 999px !important;
        }
        .family-modal-save {
          border-radius: 999px !important;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%) !important;
          border: none !important;
          box-shadow: 0 8px 18px rgba(13, 148, 136, 0.3);
        }
        .family-modal-save:hover:not(:disabled) {
          box-shadow: 0 10px 22px rgba(13, 148, 136, 0.38);
          transform: translateY(-1px);
        }
        @media (max-width: 520px) {
          .family-modal-blood {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 480px) {
          .family-modal-header {
            padding: 14px 16px 26px;
          }
          .family-modal-avatar {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
          .family-modal-title {
            font-size: 17px;
          }
          .family-modal-scroll {
            padding: 8px 14px 4px;
          }
          .family-modal-section {
            padding: 14px 12px;
          }
          .family-modal-footer {
            padding: 12px 14px;
          }
          .family-modal-footer-note {
            display: none;
          }
        }
        .profile-select {
          position: relative;
        }
        .profile-select-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          text-align: left;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          line-height: normal;
        }
        .profile-select-trigger:disabled {
          cursor: default;
          opacity: 1;
        }
        .profile-select-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .profile-select-chevron {
          color: #0d9488;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .profile-select-trigger.is-open {
          border-color: #14b8a6 !important;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
        }
        .profile-select-trigger.is-open .profile-select-chevron {
          transform: rotate(180deg);
        }
        .profile-select-menu {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          z-index: 50;
          margin: 0;
          padding: 6px;
          list-style: none;
          max-height: 260px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid rgba(20, 184, 166, 0.2);
          border-radius: 14px;
          box-shadow: 0 14px 32px rgba(11, 37, 69, 0.14), 0 2px 6px rgba(11, 37, 69, 0.06);
          animation: profileSelectIn 0.16s ease-out;
        }
        .profile-select-menu.drop-up {
          top: auto;
          bottom: calc(100% + 6px);
        }
        .profile-select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #0b2545;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .profile-select-option.is-active {
          background: #effaf7;
          color: #0d9488;
        }
        .profile-select-option.is-selected {
          background: linear-gradient(135deg, #ccf4eb 0%, #b4ede1 100%);
          color: #0f766e;
          font-weight: 700;
        }
        @keyframes profileSelectIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-form-card select.input-field {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding-right: 40px !important;
          cursor: pointer;
        }
        .profile-form-card select.input-field:not(:disabled) {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d9488' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 14px center !important;
          background-size: 16px 16px !important;
        }
        .profile-form-card select.input-field:disabled {
          cursor: default;
        }
        .profile-form-card select.input-field::-ms-expand {
          display: none;
        }
        .profile-tabs-bar {
          border: 1px solid rgba(20, 184, 166, 0.16);
        }
        .profile-tab-btn:not(.profile-tab-btn--active):hover {
          color: #0d9488 !important;
        }
        .profile-form-card {
          position: relative;
          border: 1px solid rgba(20, 184, 166, 0.16);
        }
        .profile-form-card::before {
          content: "";
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          height: 20px;
          border-radius: inherit;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          background: linear-gradient(90deg, #5ccfbf 0%, #14b8a6 50%, #0d9488 100%);
          -webkit-mask: linear-gradient(#000 0 4px, transparent 4px);
          mask: linear-gradient(#000 0 4px, transparent 4px);
          pointer-events: none;
        }
        .profile-section-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 14px;
          margin-bottom: 18px;
          border-bottom: 1px dashed rgba(13, 148, 136, 0.2);
        }
        .profile-section-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
          background: linear-gradient(135deg, #effaf7 0%, #ccf4eb 100%);
          border: 1px solid rgba(13, 148, 136, 0.16);
        }
        .profile-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .profile-section-sub {
          font-size: 13px;
          color: #55738d;
          margin: 2px 0 0 0;
        }
        .profile-form-card label {
          color: #55738d !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .profile-form-card .input-field {
          border-radius: 12px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          font-family: inherit;
        }
        .profile-form-card input[type="date"].input-field,
        .profile-form-card input[type="date"].input-field::-webkit-datetime-edit {
          font-family: inherit;
          font-size: 14px;
          letter-spacing: normal;
          color: var(--text-main);
        }
        .profile-form-card .input-field:not([readonly]):not(:disabled):hover {
          border-color: rgba(20, 184, 166, 0.45);
        }
        .profile-form-card .input-field:not([readonly]):not(:disabled):focus {
          outline: none;
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
        }
        .profile-input-lock {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #7a94a9;
          pointer-events: none;
        }
        .profile-header-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(20, 184, 166, 0.16);
        }
        .profile-header-card > * {
          position: relative;
          z-index: 1;
        }
        .profile-header-card > .profile-card-cover {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 86px;
          z-index: 0;
          background: linear-gradient(120deg, #ccf4eb 0%, #99e6d8 55%, #5ccfbf 100%);
        }
        .profile-card-cover svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .profile-avatar-circle {
          border: 4px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25), 0 10px 28px rgba(13, 148, 136, 0.28) !important;
          transition: transform 0.25s ease;
        }
        .profile-avatar-circle:hover {
          transform: scale(1.03);
        }
        .profile-camera-btn {
          color: #0d9488 !important;
          border: 2px solid #ffffff !important;
          background: #ecfdf9 !important;
        }
        .profile-patient-id-badge {
          background: #ffffff !important;
          border-style: dashed !important;
        }
        .profile-stat-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px 10px;
          border-radius: 14px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .profile-stat-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(13, 148, 136, 0.12);
        }
        .profile-stat-tile--blood {
          background: linear-gradient(160deg, #fff1f2 0%, #ffe4e6 100%);
          border: 1px solid rgba(225, 29, 72, 0.14);
          color: #be123c;
        }
        .profile-stat-tile--body {
          background: linear-gradient(160deg, #effaf7 0%, #d9f5ee 100%);
          border: 1px solid rgba(13, 148, 136, 0.16);
          color: #0f766e;
        }
        .profile-stat-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          margin-bottom: 6px;
        }
        .profile-stat-label {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
        }
        .profile-stat-value {
          font-weight: 800;
          margin-top: 2px;
          color: #0b2545;
        }
        .profile-hero-banner {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #effaf7 0%, #e3f7f2 50%, #ccf4eb 100%);
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
          padding: 16px 0;
        }
        .profile-hero-wave {
          position: absolute;
          right: 0;
          top: 0;
          width: 55%;
          height: 100%;
          pointer-events: none;
        }
        .profile-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
        }
        .profile-hero-content {
          max-width: 680px;
          min-width: 0;
        }
        .profile-hero-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #55738d;
          margin-bottom: 4px;
        }
        .profile-breadcrumb-link {
          color: #55738d;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .profile-breadcrumb-link:hover {
          color: #0b2545;
        }
        .profile-breadcrumb-sep {
          color: #7a94a9;
          flex-shrink: 0;
        }
        .profile-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #0b2545;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .profile-hero-desc {
          font-size: 13.5px;
          color: #55738d;
          margin: 2px 0 0 0;
          line-height: 1.5;
        }
        .profile-hero-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }
        .profile-hero-graphic {
          flex-shrink: 0;
          display: flex;
        }
        .profile-hero-svg {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 6px 14px rgba(13, 148, 136, 0.12));
        }
        @media (max-width: 640px) {
          .profile-hero-banner {
            padding: 12px 0;
          }
          .profile-hero-title {
            font-size: 19px;
          }
          .profile-hero-desc {
            font-size: 12.5px;
          }
          .profile-hero-svg {
            width: 52px;
            height: 52px;
          }
          .profile-hero-inner {
            flex-wrap: wrap;
            gap: 12px;
          }
          .profile-hero-graphic {
            display: none;
          }
        }
        @media (max-width: 1024px) {
          .profile-form-row-4col {
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 900px) {
          .profile-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .profile-sidebar { position: relative !important; top: 0 !important; }
        }
        @media (max-width: 640px) {
          .profile-form-card {
            padding: 20px 16px !important;
            border-radius: 12px !important;
          }
          .profile-form-row-2col {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .profile-form-row-4col {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 480px) {
          .profile-form-card {
            padding: 16px 12px !important;
          }
          .profile-form-row-4col {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .modal-form-2col, .modal-form-3col {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .profile-tabs-bar {
            padding: 4px !important;
            gap: 4px !important;
          }
          .profile-tab-btn {
            padding: 8px 6px !important;
            font-size: 13px !important;
            gap: 6px !important;
          }
          .profile-header-card {
            padding: 20px 16px !important;
            border-radius: 14px !important;
          }
          .profile-avatar-circle {
            width: 76px !important;
            height: 76px !important;
            font-size: 26px !important;
          }
          .profile-camera-btn {
            width: 28px !important;
            height: 28px !important;
          }
          .profile-camera-btn svg {
            width: 13px !important;
            height: 13px !important;
          }
          .profile-patient-name {
            font-size: 18px !important;
            margin-bottom: 6px !important;
          }
          .profile-kyc-badge {
            padding: 4px 10px !important;
            font-size: 11.5px !important;
          }
          .profile-patient-id-box {
            padding: 8px 10px !important;
            border-radius: 10px !important;
          }
          .profile-quick-stats-grid {
            gap: 8px !important;
            margin-top: 14px !important;
          }
        }
        @media (max-width: 375px) {
          .profile-tabs-bar {
            padding: 3px !important;
            gap: 3px !important;
            border-radius: 12px !important;
          }
          .profile-tab-btn {
            padding: 7px 4px !important;
            font-size: 11px !important;
            gap: 3px !important;
            border-radius: 9px !important;
          }
          .profile-tab-btn svg {
            width: 13px !important;
            height: 13px !important;
            flex-shrink: 0 !important;
          }
        }
        @media (max-width: 360px) {
          .profile-header-card {
            padding: 14px 10px !important;
            border-radius: 12px !important;
          }
          .profile-avatar-circle {
            width: 60px !important;
            height: 60px !important;
            font-size: 22px !important;
          }
          .profile-camera-btn {
            width: 24px !important;
            height: 24px !important;
          }
          .profile-camera-btn svg {
            width: 11px !important;
            height: 11px !important;
          }
          .profile-patient-name {
            font-size: 16px !important;
            margin-bottom: 4px !important;
          }
          .profile-kyc-badge {
            padding: 3px 8px !important;
            font-size: 10.5px !important;
          }
          .profile-patient-id-box {
            padding: 6px 8px !important;
          }
          .profile-patient-id-box > div:first-child {
            font-size: 9.5px !important;
          }
          .profile-patient-id-box > div:last-child {
            font-size: 13px !important;
          }
          .profile-quick-stats-grid {
            gap: 6px !important;
            margin-top: 10px !important;
          }
          .profile-quick-stats-grid > div {
            padding: 8px 6px !important;
          }
          .profile-quick-stats-grid > div > div:first-child {
            font-size: 10px !important;
          }
          .profile-quick-stats-grid > div > div:last-child {
            font-size: 12.5px !important;
          }
        }
        @media (max-width: 320px) {
          .profile-header-card {
            padding: 12px 8px !important;
            border-radius: 12px !important;
          }
          .profile-avatar-circle {
            width: 52px !important;
            height: 52px !important;
            font-size: 18px !important;
          }
          .profile-camera-btn {
            width: 22px !important;
            height: 22px !important;
          }
          .profile-camera-btn svg {
            width: 10px !important;
            height: 10px !important;
          }
          .profile-patient-name {
            font-size: 14.5px !important;
            margin-bottom: 3px !important;
          }
          .profile-kyc-badge {
            padding: 2px 6px !important;
            font-size: 10px !important;
          }
          .profile-patient-id-box {
            padding: 5px 6px !important;
          }
          .profile-patient-id-box > div:first-child {
            font-size: 9px !important;
          }
          .profile-patient-id-box > div:last-child {
            font-size: 12px !important;
          }
          .profile-quick-stats-grid {
            gap: 5px !important;
            margin-top: 8px !important;
          }
          .profile-quick-stats-grid > div {
            padding: 6px 4px !important;
          }
          .profile-quick-stats-grid > div > div:first-child {
            font-size: 9px !important;
          }
          .profile-quick-stats-grid > div > div:last-child {
            font-size: 11px !important;
          }
        }
      `}} />
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </main>
  );
}
