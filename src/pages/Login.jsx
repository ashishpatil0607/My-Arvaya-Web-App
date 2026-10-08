import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Phone,
  X,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  User,
  UserPlus,
  Calendar as CalendarIcon,
  ChevronLeft,
  FileText,
  KeyRound,
  Sparkles,
  MapPin,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Ticket,
  AlertCircle,
} from "lucide-react";
import {
  sendOtp,
  verifyOtp,
  getCloudId,
  getDeviceId,
  selectProfile,
} from "../services/authService";
import {
  abhaSendOtp,
  abhaVerifyOtp,
  abhaConfirmAddress,
  abhaVerifyUser,
  abhaSendCreationOtp,
  abhaCreateByAadhaar,
  abhaGetSuggestions,
} from "../services/abhaService";
import { fetchImageBlob, getImageUrl } from "../services/uploadService";
import { getPatients } from "../services/dataService";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

export default function Login({ forceOpen = false, modalHost = false }) {
  const {
    isLoginModalOpen,
    closeLoginModal,
    pendingRedirect,
    saveSession,
    loginModalScreen,
    loginModalExtraState,
    showToast,
    setLinkedProfiles,
  } = useAuth();
  const location = useLocation();
  const [screen, setScreen] = useState(
    location.state?.screen || loginModalScreen || "landing",
  );
  const [phone, setPhone] = useState("");
  const [isAbhaFlow, setIsAbhaFlow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Multiple Profiles state
  const [profilesData, setProfilesData] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [uhidInputs, setUhidInputs] = useState({});
  const [verifyOtpRawRes, setVerifyOtpRawRes] = useState(null);

  useEffect(() => {
    if (location.state?.screen) {
      setScreen(location.state.screen);
    } else if (loginModalScreen) {
      setScreen(loginModalScreen);
    }
  }, [location.state, loginModalScreen]);

  // ABHA-specific state
  const [abhaMobile, setAbhaMobile] = useState("");
  const [abhaAddresses, setAbhaAddresses] = useState([]);
  const [selectedAbhaAddress, setSelectedAbhaAddress] = useState("");
  const [abhaTransactionId, setAbhaTransactionId] = useState("");
  const [abhaVerifyData, setAbhaVerifyData] = useState(null);

  const go = useNavigate();
  const isModalPresentation =
    (isLoginModalOpen || forceOpen) && location.pathname !== "/login";

  useEffect(() => {
    if (!isModalPresentation || typeof document === "undefined")
      return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalPresentation]);

  const handleClose = () => {
    setScreen("landing");
    setPhone("");
    setErr("");
    setAbhaMobile("");
    setAbhaAddresses([]);
    setSelectedAbhaAddress("");
    setAbhaTransactionId("");
    setAbhaVerifyData(null);
    setProfilesData([]);
    setSelectedProfileId(null);
    setUhidInputs({});
    setVerifyOtpRawRes(null);
    closeLoginModal();
    const target =
      location.state?.from || location.state?.redirectPath || pendingRedirect;
    if (target && target !== "/login") {
      go(target, { replace: true });
    } else if (!isModalPresentation) {
      go("/", { replace: true });
    }
  };

  const handleAbhaMobileBack = () => {
    const fromAbhaHub =
      loginModalExtraState?.fromAbhaHub === true ||
      location.state?.fromAbhaHub === true ||
      (location.state?.redirectPath === "/abha" &&
        location.state?.screen === "abha_mobile");
    const redirectPath =
      location.state?.redirectPath || location.state?.from || pendingRedirect;

    if (fromAbhaHub) {
      closeLoginModal();
      go("/abha", { replace: true });
    } else if (
      redirectPath &&
      redirectPath !== "/login" &&
      (loginModalScreen === "abha_mobile" ||
        location.state?.screen === "abha_mobile")
    ) {
      closeLoginModal();
      go(redirectPath, { replace: true });
    } else {
      setScreen("landing");
    }
  };

  /* ── Regular Mobile OTP Flow ── */
  const doSendOtp = async (mobile) => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      const msg = "Mobile number must start with a digit between 6 and 9";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setPhone(cleanMobile);
    setErr("");
    setBusy(true);
    try {
      const res = await sendOtp(mobile);
      if (
        res &&
        (res.is_registered === false ||
          res.registered === false ||
          res.userExists === false ||
          res.isNewUser === true)
      ) {
        handleClose();
        go(`/signup?phone=${mobile}`, {
          state: {
            from:
              location.state?.from ||
              location.state?.redirectPath ||
              pendingRedirect,
          },
        });
        return;
      }
      if (showToast) showToast("OTP sent successfully", "success");
      setScreen("otp");
    } catch (e) {
      const msg = (e.message || "").toLowerCase();
      if (
        msg.includes("not found") ||
        msg.includes("not registered") ||
        msg.includes("no user") ||
        msg.includes("invalid number") ||
        msg.includes("doesn't exist")
      ) {
        handleClose();
        go(`/signup?phone=${mobile}`, {
          state: {
            from:
              location.state?.from ||
              location.state?.redirectPath ||
              pendingRedirect,
          },
        });
      } else {
        const errMsg = e.message || "Failed to send OTP";
        setErr(errMsg);
        if (showToast) showToast(errMsg, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (otp) => {
    setErr("");
    setBusy(true);
    try {
      const res = await verifyOtp(otp, phone);
      const userData =
        res?.UserData || res?.userData || res?.data || res?.result || {};
      const rawNewUser =
        userData?.is_new_user !== undefined
          ? userData.is_new_user
          : userData?.Is_new_user !== undefined
            ? userData.Is_new_user
            : res?.is_new_user !== undefined
              ? res.is_new_user
              : res?.Is_new_user;

      const isNewUserOne =
        rawNewUser === 1 || rawNewUser === "1" || rawNewUser === true;

      // If is_new_user is 1, open registration form (same as previous flow)
      if (isNewUserOne) {
        setScreen("landing");
        setPhone("");
        setErr("");
        closeLoginModal();
        go(`/signup?phone=${phone}`, {
          state: {
            from:
              location.state?.from ||
              location.state?.redirectPath ||
              pendingRedirect,
          },
        });
        return;
      }

      // Check if multiple_profiles === 1
      const rawMultProfiles =
        userData?.multiple_profiles !== undefined
          ? userData.multiple_profiles
          : res?.multiple_profiles;
      const isMultipleProfiles =
        rawMultProfiles === 1 ||
        rawMultProfiles === "1" ||
        rawMultProfiles === true;

      // Helper function to extract a clean, actual person's name (never "User (mobile)")
      const extractRealProfileName = (item, parent = {}) => {
        if (!item) return "";
        // 1. Check title + first_name + last_name
        const fn = (item.first_name || item.firstName || item.FirstName || parent.first_name || parent.firstName || "").trim();
        const ln = (item.last_name || item.lastName || item.LastName || parent.last_name || parent.lastName || "").trim();
        const mn = (item.middle_name || item.middleName || parent.middle_name || "").trim();
        const rawTitle = (item.title || item.Title || parent.title || "").trim();
        const title = rawTitle ? (rawTitle.endsWith(".") ? rawTitle : `${rawTitle}.`) : "";

        const parts = [fn, mn, ln].filter(Boolean).join(" ");
        if (parts) {
          return title ? `${title} ${parts}` : parts;
        }

        // 2. Check full name properties
        const candidates = [
          item.name,
          item.Name,
          item.full_name,
          item.fullName,
          item.FullName,
          item.patient_name,
          item.patientName,
          item.customer_name,
          parent.name,
          parent.full_name,
          parent.fullName,
          parent.patient_name,
        ];
        for (const c of candidates) {
          if (c && typeof c === "string") {
            const trimmed = c.trim();
            if (trimmed && !/^User(\s*\(\+?\d+\))?$/i.test(trimmed)) {
              return trimmed;
            }
          }
        }
        return "";
      };

      let rawProfiles = Array.isArray(userData?.profiles)
        ? [...userData.profiles]
        : Array.isArray(res?.profiles)
          ? [...res.profiles]
          : [];

      // Ensure at least one profile exists for single user, new user, or any user
      if (rawProfiles.length === 0) {
        const u =
          userData && typeof userData === "object" && Object.keys(userData).length > 0
            ? userData
            : res?.data || res?.user || { id: res?.id || res?.user_id || 1, name: "Patient Profile", mobile_number: phone, external_id: res?.external_id || "" };
        rawProfiles = [u];
      }

      // Format each profile to guarantee a real name (never "User (mobile)")
      const profilesList = rawProfiles.map((p, idx) => {
        const realName =
          extractRealProfileName(p, userData) ||
          extractRealProfileName(p, res?.user) ||
          (isNewUserOne ? "New Patient" : "Patient Profile");

        return {
          ...p,
          id: p.id || p.user_id || idx + 1,
          name: realName,
          first_name: p.first_name || p.firstName || "",
          last_name: p.last_name || p.lastName || "",
          title: p.title || "",
          external_id: p.external_id || p.uhid || p.externalId || res?.external_id || "",
          mobile_number: p.mobile_number || res?.mobile_number || phone,
          relation: p.relation || null,
          parent_account_id: p.parent_account_id || null,
          profile_image:
            p.profile_image ||
            p.profileImage ||
            p.photo ||
            p.image ||
            userData?.profile_image ||
            userData?.profileImage ||
            res?.user?.profile_image ||
            "",
        };
      });

      const tempToken =
        res?.token ||
        res?.accessToken ||
        res?.data?.token ||
        res?.result?.token ||
        res?.UserData?.token ||
        res?.UserData?.accessToken;
      if (tempToken && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("token", tempToken);
        } catch (e) {}
      }

      // Verify UHID is COMPULSORY for all types of users (single user, new user, multiple profiles)
      setVerifyOtpRawRes(res);
      setProfilesData(profilesList);
      setSelectedProfileId(profilesList.length === 1 ? profilesList[0].id : null);

      const initialUhids = {};
      profilesList.forEach((p) => {
        initialUhids[p.id] = "";
      });
      setUhidInputs(initialUhids);
      setScreen("choose_profile");
      return;

      // If user does not have external_id or single profile, login directly
      const token =
        res?.token ||
        res?.accessToken ||
        res?.data?.token ||
        res?.result?.token ||
        res?.UserData?.token ||
        res?.UserData?.accessToken ||
        "token_" + Date.now();
      let rawUser =
        res?.UserData ||
        res?.userData ||
        res?.user ||
        res?.data?.user ||
        res?.result?.user ||
        res?.data ||
        res?.result;
      if (!rawUser || typeof rawUser !== "object") {
        rawUser = {};
      }

      let derivedName =
        rawUser?.name ||
        rawUser?.full_name ||
        rawUser?.fullName ||
        rawUser?.user_name ||
        rawUser?.userName;
      if (
        !derivedName ||
        derivedName === "User" ||
        derivedName.startsWith("User (")
      ) {
        const firstName = rawUser?.first_name || rawUser?.firstName || "";
        const lastName = rawUser?.last_name || rawUser?.lastName || "";
        if (firstName || lastName) {
          const title = rawUser?.title ? rawUser.title.trim() + " " : "";
          derivedName = `${title}${firstName} ${lastName}`.trim();
        }
      }
      if (!derivedName || derivedName.startsWith("User (")) {
        derivedName = "User";
      }

      const singleProfile = profilesList[0] || {};
      const user = {
        ...rawUser,
        ...singleProfile,
        id: singleProfile.id || rawUser.id || 1,
        user_id: singleProfile.id || rawUser.id || 1,
        name: singleProfile.name || derivedName || "User",
        phone:
          singleProfile.mobile_number ||
          rawUser?.mobile_number ||
          rawUser?.phone ||
          rawUser?.mobile ||
          phone,
        mobile_number:
          singleProfile.mobile_number ||
          rawUser?.mobile_number ||
          rawUser?.phone ||
          rawUser?.mobile ||
          phone,
        external_id: singleProfile.external_id || null,
      };

      saveSession({ token, user, loginMethod: "user_verify_otp" });
      setScreen("landing");
      setPhone("");
      setErr("");
      closeLoginModal();
      go(
        location.state?.from ||
          location.state?.redirectPath ||
          pendingRedirect ||
          "/",
      );
    } catch (e) {
      const errMsg = e.message || "Invalid OTP";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ── Select Profile Continue Handler ── */
  const handleSelectProfileContinue = async (profile, allSelectedProfiles = []) => {
    setErr("");
    setBusy(true);
    try {
      const enteredUhid =
        uhidInputs[profile.id] !== undefined && uhidInputs[profile.id] !== ""
          ? uhidInputs[profile.id]
          : profile.external_id || "";
      const rawUserMobile = verifyOtpRawRes?.UserData?.mobile_number || phone;
      const selectPayload = {
        user_id: profile.id,
        mobile_number: rawUserMobile,
        is_notification_on: 1,
        cloud_id: getCloudId(),
        device_id: getDeviceId(),
        external_id: enteredUhid,
        referred_by_code: null,
      };

      const selectRes = await selectProfile(selectPayload);

      const token =
        selectRes?.token ||
        selectRes?.accessToken ||
        verifyOtpRawRes?.token ||
        verifyOtpRawRes?.accessToken ||
        verifyOtpRawRes?.UserData?.token ||
        "token_" + Date.now();
      const rawUser =
        verifyOtpRawRes?.UserData ||
        verifyOtpRawRes?.userData ||
        verifyOtpRawRes?.user ||
        {};

      let derivedName =
        profile?.name || selectRes?.UserData?.name || rawUser?.name || "User";
      derivedName = derivedName.replace(/\.\./g, ".");

      const user = {
        ...rawUser,
        ...selectRes?.UserData,
        ...profile,
        id: profile.id,
        user_id: profile.id,
        app_user_id: profile.id,
        name: derivedName,
        external_id:
          enteredUhid ||
          profile.external_id ||
          selectRes?.UserData?.external_id ||
          null,
        phone: rawUserMobile || phone,
        mobile_number: rawUserMobile || phone,
        profile_image:
          profile.profile_image ||
          profile.profileImage ||
          profile.photo ||
          selectRes?.UserData?.profile_image ||
          selectRes?.UserData?.profileImage ||
          rawUser?.profile_image ||
          rawUser?.profileImage ||
          "",
      };

      // Save all selected profiles for Google Mail style account switching
      const profilesToSave = (allSelectedProfiles && allSelectedProfiles.length > 0
        ? allSelectedProfiles
        : [profile]
      ).map((p) => ({
        ...p,
        external_id: uhidInputs[p.id] || p.external_id || "",
        mobile_number: rawUserMobile || phone,
        phone: rawUserMobile || phone,
        isPrimary: !p.relation && (!p.parent_account_id || p.parent_account_id === p.id),
        profile_image:
          p.profile_image ||
          p.profileImage ||
          p.photo ||
          "",
      }));

      localStorage.setItem("arvaya_linked_profiles", JSON.stringify(profilesToSave));
      if (setLinkedProfiles) {
        setLinkedProfiles(profilesToSave);
      }

      saveSession({ token, user, loginMethod: "user_verify_otp" });
      try {
        window.dispatchEvent(new Event("arvaya_profile_updated"));
      } catch (e) {}
      setScreen("landing");
      setPhone("");
      setErr("");
      closeLoginModal();
      go(
        location.state?.from ||
          location.state?.redirectPath ||
          pendingRedirect ||
          "/",
      );
    } catch (e) {
      const errMsg = e.message || "Failed to select profile";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ── ABHA 3-Step Flow ── */
  const doAbhaSendOtp = async (mobile) => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      const msg = "Mobile number must start with a digit between 6 and 9";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setAbhaMobile(cleanMobile);
    setErr("");
    setBusy(true);
    try {
      const res = await abhaSendOtp(mobile);
      const txnId =
        res?.transactionId ||
        res?.txnId ||
        res?.txn_id ||
        res?.data?.transactionId ||
        res?.data?.txnId ||
        res?.data?.txn_id ||
        res?.result?.txnId ||
        res?.result?.transactionId ||
        "mock_txn_" + Date.now();
      setAbhaTransactionId(txnId);
      if (showToast) showToast("OTP sent to your ABHA mobile", "success");
      setScreen("abha_otp");
    } catch (e) {
      const errMsg = e.message || "Failed to send OTP to ABHA mobile";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  const doAbhaVerifyOtp = async (otp) => {
    setErr("");
    setBusy(true);
    try {
      const res = await abhaVerifyOtp(otp, abhaTransactionId);
      setAbhaVerifyData(res);
      const newTxnId =
        res?.txnId ||
        res?.transactionId ||
        res?.txn_id ||
        res?.data?.txnId ||
        abhaTransactionId;
      setAbhaTransactionId(newTxnId);

      const userObj =
        res?.users?.[0] || res?.data?.users?.[0] || res?.user || {};
      const verifyAddress =
        userObj?.abhaAddress ||
        userObj?.address ||
        userObj?.abha_address ||
        res?.abhaAddress ||
        res?.data?.abhaAddress ||
        res?.abha_address ||
        "";

      let addresses =
        res?.users ||
        res?.abhaAddressList ||
        res?.addresses ||
        res?.data?.users ||
        res?.data?.abhaAddressList ||
        [];
      if (addresses.length === 0 && verifyAddress) {
        addresses = [{ address: verifyAddress, isPrimary: true }];
      } else if (addresses.length === 0) {
        const addrRes = await abhaGetSuggestions(newTxnId, {
          firstName: userObj.name || "",
        }).catch(() => null);
        addresses =
          addrRes?.abhaAddressList ||
          addrRes?.addresses ||
          (verifyAddress ? [{ address: verifyAddress }] : []);
      }

      const primaryAddress =
        verifyAddress ||
        addresses[0]?.abhaAddress ||
        addresses[0]?.address ||
        addresses[0]?.id ||
        "";

      setAbhaAddresses(addresses);
      setSelectedAbhaAddress(primaryAddress);
      if (showToast) showToast("OTP verified successfully", "success");
      setScreen("abha_address");
    } catch (e) {
      const errMsg = e.message || "Invalid OTP. Please try again.";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  const doAbhaConfirm = async (address, dob) => {
    setErr("");
    setBusy(true);
    try {
      let storedUser = null;
      try {
        const local = localStorage.getItem("arvaya_user");
        if (local) storedUser = JSON.parse(local);
      } catch (e) {}

      const userObj =
        abhaVerifyData?.users?.[0] ||
        abhaVerifyData?.data?.users?.[0] ||
        abhaVerifyData?.user ||
        {};
      const tokenVal =
        abhaVerifyData?.tokens?.token ||
        abhaVerifyData?.token ||
        abhaVerifyData?.accessToken ||
        abhaVerifyData?.data?.token ||
        "";
      const externalIdVal =
        userObj?.external_id ||
        userObj?.externalId ||
        abhaVerifyData?.external_id ||
        abhaVerifyData?.UserData?.external_id ||
        abhaVerifyData?.data?.external_id ||
        storedUser?.external_id ||
        storedUser?.externalId ||
        "";

      const payload = {
        txnId:
          abhaVerifyData?.txnId ||
          abhaVerifyData?.transactionId ||
          abhaVerifyData?.data?.txnId ||
          abhaTransactionId,
        abhaAddress: address,
        token: tokenVal,
        supportKey:
          abhaVerifyData?.supportKey ||
          abhaVerifyData?.data?.supportKey ||
          abhaVerifyData?.support_key ||
          "",
        name:
          userObj?.fullName ||
          userObj?.name ||
          userObj?.first_name ||
          abhaVerifyData?.name ||
          abhaVerifyData?.data?.name ||
          "",
        mobile_number: abhaMobile,
        cloud_id: getCloudId(),
        device_id: getDeviceId(),
        abha_number:
          userObj?.abhaNumber ||
          userObj?.abha_number ||
          abhaVerifyData?.abha_number ||
          abhaVerifyData?.abhaNumber ||
          "",
        abha_type: "sbx",
        abha_status: "active",
        gender: userObj?.gender || abhaVerifyData?.gender || "",
        date_of_birth: dob,
        external_id: externalIdVal,
      };

      const res = await abhaVerifyUser(payload);
      const abhaResponseToken = res?.UserData?.response?.refreshToken;
      const newtoken = res?.token;
      const userId =
        res?.UserData?.user_id ||
        res?.user_id ||
        res?.user?.id ||
        res?.user?.user_id;
      if (abhaResponseToken) {
        localStorage.setItem("abha_user_token", abhaResponseToken);
        localStorage.setItem("abha_token", abhaResponseToken);
      }
      if (userId) {
        localStorage.setItem("user_id", userId);
      }
      let user = res?.UserData ||
        res?.userData ||
        res?.user ||
        res?.data?.user ||
        res?.result?.user ||
        res?.data ||
        res?.result || {
          name: payload.name || "ABHA User",
          abhaAddress: address,
        };

      saveSession({
        token: newtoken,
        user: {
          ...user,
          external_id:
            user?.external_id || externalIdVal || user?.externalId || null,
          abha_token: abhaResponseToken,
          abhaAddress: address,
          abhaNumber:
            payload.abha_number ||
            user?.abhaNumber ||
            user?.abha_number ||
            "91-6780-5608-2723",
          abha_number:
            payload.abha_number ||
            user?.abha_number ||
            user?.abhaNumber ||
            "91-6780-5608-2723",
        },
        loginMethod: "abha",
      });
      handleClose();
      go(
        location.state?.from ||
          location.state?.redirectPath ||
          pendingRedirect ||
          "/",
      );
    } catch (e) {
      const errMsg = e.message || "Could not link ABHA. Please try again.";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  const p = { busy, err };

  let card;
  const isAbhaCreate = screen.startsWith("abha_create");
  switch (screen) {
    case "landing":
      card = (
        <Landing
          onAbha={() => {
            setErr("");
            setScreen("abha_mobile");
          }}
          onMobile={() => {
            setErr("");
            setScreen("mobile");
          }}
          showToast={showToast}
        />
      );
      break;
    case "mobile":
      card = (
        <Mobile onBack={() => setScreen("landing")} onSend={doSendOtp} {...p} />
      );
      break;
    case "otp":
      card = (
        <Otp
          phone={phone}
          onBack={() => setScreen("mobile")}
          onVerify={doVerify}
          onResend={() => doSendOtp(phone)}
          {...p}
        />
      );
      break;
    case "choose_profile":
      card = (
        <ChooseProfile
          profiles={profilesData}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          uhidInputs={uhidInputs}
          onUhidChange={(id, val) =>
            setUhidInputs((prev) => ({ ...prev, [id]: val }))
          }
          onContinue={handleSelectProfileContinue}
          onBack={() => setScreen("otp")}
          {...p}
        />
      );
      break;
    // ── ABHA Login 3-step ──
    case "abha_mobile":
      card = (
        <AbhaMobile
          onBack={handleAbhaMobileBack}
          onSend={doAbhaSendOtp}
          onCreateNow={() => {
            setErr("");
            setScreen("abha_create_1");
          }}
          {...p}
        />
      );
      break;
    case "abha_otp":
      card = (
        <AbhaOtp
          mobile={abhaMobile}
          onBack={() => setScreen("abha_mobile")}
          onVerify={doAbhaVerifyOtp}
          onResend={() => doAbhaSendOtp(abhaMobile)}
          {...p}
        />
      );
      break;
    case "abha_address":
      card = (
        <AbhaSelectAddress
          addresses={abhaAddresses}
          selected={selectedAbhaAddress}
          onSelect={setSelectedAbhaAddress}
          onBack={() => setScreen("abha_otp")}
          onConfirm={doAbhaConfirm}
          {...p}
        />
      );
      break;
    case "abha_create_1":
    case "abha_create_2":
    case "abha_create_3":
    case "abha_create_done":
      card = (
        <AbhaCreate
          step={screen}
          initialMobile={abhaMobile}
          abhaTransactionId={abhaTransactionId}
          setAbhaTransactionId={setAbhaTransactionId}
          saveSession={saveSession}
          onBack={() =>
            setScreen(
              screen === "abha_create_1"
                ? "abha_mobile"
                : screen === "abha_create_2"
                  ? "abha_create_1"
                  : "abha_create_2",
            )
          }
          onNext={(s) => setScreen(s)}
          onFinish={() => {
            handleClose();
            go("/abha");
          }}
        />
      );
      break;
    default:
      card = null;
  }

  // Determine which "pane" content to show
  const isAbhaLogin = ["abha_mobile", "abha_otp", "abha_address"].includes(
    screen,
  );
  const isAbhaScreen = isAbhaLogin || isAbhaCreate;
  const abhaStep =
    screen === "abha_mobile"
      ? 1
      : screen === "abha_otp"
        ? 2
        : screen === "abha_address"
          ? 3
          : 0;
  const abhaCreateStep =
    screen === "abha_create_1"
      ? 1
      : screen === "abha_create_2"
        ? 2
        : screen === "abha_create_3"
          ? 3
          : screen === "abha_create_done"
            ? 4
            : 0;

  const loginCard = (
    <div
      className={isModalPresentation ? "login-modal-stage" : "login-page-stage"}
      style={{
        minHeight: isModalPresentation ? "100%" : "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isModalPresentation ? "0" : "32px 16px",
        background: isModalPresentation ? "transparent" : "var(--bg-app)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className={`login-modal-container ${screen === "choose_profile" ? "choose-profile-modal-container" : screen === "otp" ? "otp-modal-container" : ""}`}
        style={{
          background: "#fff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: screen === "choose_profile" ? "780px" : screen === "otp" ? "720px" : "840px",
          boxSizing: "border-box",
          height: "auto",
          maxHeight:
            screen === "choose_profile"
              ? "min(580px, calc(100dvh - 32px))"
              : "min(640px, calc(100dvh - 36px))",
          display: "flex",
          position: "relative",
          boxShadow:
            "0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* ── Close Button ── */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            color: "var(--text-muted)",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            transition: "all 0.2s",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--primary-light)";
            e.currentTarget.style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.9)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <X size={18} />
        </button>

        {/* ── Left Pane ── */}
        {isAbhaCreate ? (
          <AbhaLeftPane step={abhaCreateStep} isCreate={true} />
        ) : isAbhaLogin ? (
          <AbhaLeftPane step={abhaStep} isCreate={false} />
        ) : (
          <div
            className="login-modal-left"
            style={{
              flex: "1",
              background:
                "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(/images/loginBG.png) no-repeat center center / cover",
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--border)",
              borderTopLeftRadius: "24px",
              borderBottomLeftRadius: "24px",
            }}
          >
            <img
              src="/logo.png"
              alt="Arvaya"
              style={{
                height: "36px",
                filter: "brightness(0) invert(1)",
                marginBottom: "24px",
                width: "fit-content",
              }}
            />
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#ffffff",
                lineHeight: "1.2",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              Your Health,<span style={{ color: "#ffffff" }}>Simplified.</span>
            </h2>
            <p
              style={{
                fontSize: "13.5px",
                color: "rgba(255, 255, 255, 0.85)",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              Join India's most trusted healthcare platform. Experience
              hassle-free medical care.
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {[
                "Consult 10,000+ Top Doctors",
                "Book Lab Tests with Home Collection",
                "Manage Health Records Securely",
                "Connect with ABHA instantly",
              ].map((text, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <CheckCircle2
                    size={16}
                    style={{ color: "#ffffff", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "600",
                      color: "#ffffff",
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Right Pane ── */}
        <div
          className={`login-modal-right ${screen === "choose_profile" ? "choose-profile-modal-right" : "no-scrollbar"}`}
          style={{
            flex: "1.1",
            padding:
              screen === "choose_profile" ? "20px 22px 16px" : "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent:
              screen === "choose_profile" ? "flex-start" : "center",
            background: "#fff",
            minWidth: 0,
            width: "100%",
            boxSizing: "border-box",
            borderTopRightRadius: "24px",
            borderBottomRightRadius: "24px",
            overflowY: screen === "choose_profile" ? "hidden" : "auto",
            scrollbarWidth: screen === "choose_profile" ? "auto" : "none",
            msOverflowStyle: screen === "choose_profile" ? "auto" : "none",
          }}
        >
          {card}
        </div>
      </div>
    </div>
  );

  if (isModalPresentation) {
    return createPortal(
      <div
        className="login-modal-overlay"
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sign in"
        >
          {loginCard}
        </div>
      </div>,
      document.body,
    );
  }

  // This instance is mounted by App as a dialog host. The route instance is
  // the only one that should render a standalone login page.
  if (modalHost || location.pathname !== "/login") return null;
  return loginCard;
}

/* ═══════════════════════════════════════
   ABHA LEFT PANE — Shows ABHA branding + step progress
   ═══════════════════════════════════════ */
function AbhaLeftPane({ step, isCreate = false }) {
  const loginSteps = ["Mobile Number", "Verify OTP", "Select Address"];
  const createSteps = [
    "Aadhaar Number",
    "Verify OTP",
    "Personal Details",
    "ABHA Created!",
  ];
  const steps = isCreate ? createSteps : loginSteps;
  const title = isCreate ? "Create ABHA" : "Link ABHA Profile";
  return (
    <div
      className="login-modal-left"
      style={{
        flex: "0.9",
        background:
          "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(/images/AbhaloginBg.png) no-repeat center center / cover",
        padding: "24px 24px",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
        borderTopLeftRadius: "24px",
        borderBottomLeftRadius: "24px",
      }}
    >
      {/* ABHA Logo area */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.18)",
              borderRadius: "10px",
              padding: "8px 10px",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src="/abha.svg"
              alt="ABHA"
              style={{ height: "28px", filter: "brightness(0) invert(1)" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "10.5px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {isCreate ? "Creating" : "Linking"}
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: "17px",
                fontWeight: "800",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </div>

      {/* Step Tracker — vertical */}
      <div style={{ position: "relative", zIndex: 2, flex: 1 }}>
        <h3
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "18px",
          }}
        >
          Progress
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isComplete = step > stepNum;
            const isActive = step === stepNum;
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: isComplete
                        ? "#22c55e"
                        : isActive
                          ? "#fff"
                          : "rgba(255,255,255,0.15)",
                      border: isActive
                        ? "2px solid rgba(255,255,255,0.5)"
                        : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                      boxShadow: isActive
                        ? "0 0 0 4px rgba(255,255,255,0.15)"
                        : "none",
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={16} color="white" />
                    ) : (
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: "700",
                          color: isActive ? "#0f766e" : "rgba(255,255,255,0.6)",
                        }}
                      >
                        {stepNum}
                      </span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      style={{
                        width: "2px",
                        height: "26px",
                        background: isComplete
                          ? "rgba(34,197,94,0.6)"
                          : "rgba(255,255,255,0.15)",
                        margin: "2px 0",
                        transition: "all 0.3s",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    paddingTop: "5px",
                    paddingBottom: idx < steps.length - 1 ? "16px" : "4px",
                  }}
                >
                  <div
                    style={{
                      color: isActive
                        ? "#fff"
                        : isComplete
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.45)",
                      fontSize: "13px",
                      fontWeight: isActive ? "700" : "500",
                      transition: "all 0.3s",
                    }}
                  >
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom note */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: "auto",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "10px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={16} color="rgba(255,255,255,0.9)" />
          <span
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "11px",
              lineHeight: "1.4",
            }}
          >
            Secured by <strong style={{ color: "#fff" }}>NHA</strong> — ABDM
            Guidelines
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   LANDING
   ═══════════════════════════════════════ */
function Landing({ onAbha, onMobile, showToast }) {
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [isReferralApplied, setIsReferralApplied] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        animation: "fadeIn 0.3s ease-in-out",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h3
          className="welcome-title"
          style={{
            fontSize: "24px",
            fontWeight: "800",
            color: "var(--text-main)",
            marginBottom: "4px",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome Back
        </h3>
        <p className="welcome-desc" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Login or sign up to access your account
        </p>
      </div>

      <button
        onClick={onMobile}
        className="hover-glow mobile-login-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          padding: "14px 18px",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(46,102,110,0.28)",
          transition: "all 0.25s",
          boxSizing: "border-box",
        }}
      >
        <Phone size={19} color="#fff" style={{ flexShrink: 0 }} />
        <span>Continue with Mobile Number</span>
      </button>

      {/* Referral Code Option */}
      {!isReferralApplied ? (
        !showReferralInput ? (
          <button 
          onClick={() => setShowReferralInput(true)}
          style={{
            marginTop: '16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'transparent',
            border: '1.5px dashed var(--primary)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.25s',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--primary-light)', width: '36px', height: '36px', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>
                Have a referral code?
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                Tap to apply and unlock offers
              </span>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-muted)" />
        </button>
      ) : (
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Enter referral code"
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: '#f8f9fa',
              fontSize: '15px',
              outline: 'none',
              color: 'var(--text-main)',
            }}
            autoFocus
          />
          <button
            onClick={async () => {
              if (referralCode.trim()) {
                setIsCheckingReferral(true);
                try {
                  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://p8rhkmb7-8867.inc1.devtunnels.ms/";
                  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
                  const response = await fetch(`${cleanBase}check-referral-code`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': 'JP76Ol1r5lMvzljKmeaTdP9EthTYzKFH',
                      'applicationkey': 'Xkit6MeT1Et4ZA2N'
                    },
                    body: JSON.stringify({
                      referral_code: referralCode.trim(),
                    }),
                  });
                  const data = await response.json();
                  if (response.ok && data?.status !== false && data?.status !== 'error' && !data?.error) {
                    localStorage.setItem("referral_code", referralCode.trim());
                    if (showToast) showToast(data?.message || "Referral code applied successfully", "success");
                    setShowReferralInput(false);
                    setIsReferralApplied(true);
                  } else {
                    if (showToast) showToast(data?.message || data?.error || "Invalid referral code", "error");
                  }
                } catch (e) {
                  console.error("Referral check failed:", e);
                  if (showToast) showToast("Failed to verify referral code", "error");
                } finally {
                  setIsCheckingReferral(false);
                }
              } else {
                setShowReferralInput(false);
              }
            }}
            disabled={isCheckingReferral}
            style={{
              padding: '0 24px',
              background: isCheckingReferral ? 'var(--primary-light)' : 'var(--primary)',
              color: isCheckingReferral ? 'var(--primary)' : '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isCheckingReferral ? 'not-allowed' : 'pointer'
            }}
          >
            {isCheckingReferral ? 'Applying...' : 'Apply'}
          </button>
        </div>
      )
      ) : null}

      {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div> */}

      {/* ABHA Button */}
      {/* <button onClick={onAbha} className="hover-glow" style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', color: 'var(--text-main)', border: '1.5px solid var(--border)', padding: '14px',
        borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.25s'
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
      >
        <div style={{ position: 'absolute', left: '20px', display: 'flex', alignItems: 'center' }}>
          <img src="/abha.svg" alt="ABHA" style={{ height: '24px' }}
            onError={e => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: '🏥', style: 'font-size:20px' })); }} />
        </div>
        Continue with ABHA
        <div style={{ position: 'absolute', right: '20px' }}>
          <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NEW</span>
        </div>
      </button> */}

      <p
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--text-muted)",
          marginTop: "12px",
          lineHeight: "1.6",
        }}
      >
        By continuing, you agree to our{" "}
        <a href="#" style={{ color: "var(--primary)", fontWeight: "600" }}>
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" style={{ color: "var(--primary)", fontWeight: "600" }}>
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   MOBILE (Regular OTP Login)
   ═══════════════════════════════════════ */
function Mobile({ onBack, onSend, busy, err }) {
  const { showToast } = useAuth();
  const [m, setM] = useState("");
  const [localErr, setLocalErr] = useState("");

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setLocalErr("");
    setM(val);
  };

  const handleSend = () => {
    if (!m || m.length < 10) {
      const msg = "Please enter a valid 10-digit mobile number";
      setLocalErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(m)) {
      const msg = "Mobile number must start with a digit between 6 and 9";
      setLocalErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setLocalErr("");
    onSend(m);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--bg-app)",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h3
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "var(--text-main)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Enter Mobile Number
        </h3>
      </div>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          marginBottom: "32px",
          paddingLeft: "44px",
        }}
      >
        We'll send a 6-digit OTP to verify.
      </p>

      {(localErr || err) && <ErrorBox msg={localErr || err} />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          marginBottom: "32px",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "16px",
            color: "var(--text-muted)",
            fontWeight: "600",
            fontSize: "16px",
          }}
        >
          +91
        </span>
        <div
          style={{
            position: "absolute",
            left: "56px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1px",
            height: "22px",
            background: "var(--border)",
          }}
        />
        <input
          className="input-field"
          autoFocus
          type="tel"
          placeholder="Enter your 10-digit number"
          value={m}
          onChange={handleInputChange}
          maxLength={10}
          style={{
            paddingLeft: "72px",
            padding: "16px 16px 16px 72px",
            fontSize: "16px",
            borderRadius: "12px",
            background: "var(--bg-app)",
            border: localErr
              ? "1.5px solid var(--danger)"
              : "1.5px solid var(--border)",
          }}
        />
      </div>

      <button
        disabled={busy || m.length < 10}
        onClick={handleSend}
        style={{
          width: "100%",
          background:
            busy || m.length < 10 ? "var(--border)" : "var(--primary)",
          color: busy || m.length < 10 ? "var(--text-muted)" : "#fff",
          border: "none",
          padding: "16px",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "600",
          cursor: busy || m.length < 10 ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow:
            busy || m.length < 10 ? "none" : "0 4px 12px rgba(46,102,110,0.28)",
        }}
      >
        {busy ? "Sending OTP..." : "Get OTP"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   OTP (Regular)
   ═══════════════════════════════════════ */
function Otp({ phone, onBack, onVerify, onResend, busy, err }) {
  const [o, setO] = useState("");
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = () => {
    setO("");
    setCountdown(600);
    setCanResend(false);
    onResend();
  };

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div className="otp-container" style={{ animation: "fadeIn 0.3s ease-in-out", width: "100%" }}>
      <div
        className="otp-header-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
        <button
          onClick={onBack}
          className="otp-back-btn"
          style={{
            background: "var(--bg-app)",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <h3
          className="otp-header-title"
          style={{
            fontSize: "20px",
            fontWeight: "800",
            color: "var(--text-main)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Verify OTP
        </h3>
      </div>
      <p
        className="otp-header-subtitle"
        style={{
          fontSize: "13.5px",
          color: "var(--text-muted)",
          marginBottom: "18px",
          paddingLeft: "40px",
        }}
      >
        Code sent to <b style={{ color: "var(--text-main)" }}>+91 {phone}</b>
      </p>

      {err && <div style={{ marginBottom: "12px" }}><ErrorBox msg={err} /></div>}
      <div className="otp-input-container" style={{ marginBottom: "16px" }}>
        <OtpInputGrid value={o} onChange={setO} />
      </div>

      {/* Resend timer */}
      <div className="otp-resend-row" style={{ textAlign: "right", marginBottom: "18px" }}>
        {canResend ? (
          <button
            onClick={handleResend}
            style={{
              color: "var(--primary)",
              fontWeight: "700",
              fontSize: "13px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Resend OTP
          </button>
        ) : (
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            Resend OTP in{" "}
            <strong
              style={{
                color: "var(--text-main)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mins}:{secs}
            </strong>
          </span>
        )}
      </div>

      <button
        className="otp-submit-btn"
        disabled={busy || o.length < 6}
        onClick={() => onVerify(o)}
        style={{
          width: "100%",
          background: busy || o.length < 6 ? "var(--border)" : "var(--primary)",
          color: busy || o.length < 6 ? "var(--text-muted)" : "#fff",
          border: "none",
          padding: "13px 16px",
          borderRadius: "12px",
          fontSize: "14.5px",
          fontWeight: "700",
          cursor: busy || o.length < 6 ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow:
            busy || o.length < 6 ? "none" : "0 4px 12px rgba(46,102,110,0.28)",
        }}
      >
        {busy ? "Verifying..." : "Verify & Login"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   ABHA STEP 1 — Mobile Number
   ═══════════════════════════════════════ */
function AbhaMobile({ onBack, onSend, onCreateNow, busy, err }) {
  const { showToast } = useAuth();
  const [m, setM] = useState("");
  const [localErr, setLocalErr] = useState("");

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setLocalErr("");
    setM(val);
  };

  const handleSend = () => {
    if (!m || m.length < 10) {
      const msg = "Please enter a valid 10-digit mobile number";
      setLocalErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(m)) {
      const msg = "Mobile number must start with a digit between 6 and 9";
      setLocalErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setLocalErr("");
    onSend(m);
  };

  return (
    <div style={{ animation: "fadeIn 0.35s ease-in-out" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--bg-app)",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--text-main)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Enter ABHA Mobile Number
          </h3>
        </div>
      </div>
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginBottom: "16px",
          paddingLeft: "44px",
          lineHeight: "1.6",
        }}
      >
        Enter the 10-digit mobile number linked with your Aadhaar / ABHA
        account.
      </p>

      {(localErr || err) && <ErrorBox msg={localErr || err} />}

      {/* Mobile Input */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-main)",
            marginBottom: "8px",
          }}
        >
          Mobile Number
        </label>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              bottom: "0",
              display: "flex",
              alignItems: "center",
              padding: "0 14px 0 16px",
              borderRight: "1.5px solid var(--border)",
              color: "var(--text-main)",
              fontWeight: "700",
              fontSize: "15px",
              gap: "4px",
            }}
          >
            🇮🇳 <span>+91</span>
          </div>
          <input
            className="input-field"
            autoFocus
            type="tel"
            placeholder="10-digit mobile number"
            value={m}
            onChange={handleInputChange}
            maxLength={10}
            style={{
              paddingLeft: "88px",
              padding: "12px 14px 12px 88px",
              fontSize: "15px",
              borderRadius: "12px",
              background: "var(--bg-app)",
              letterSpacing: m ? "0.06em" : "0",
              border: localErr
                ? "1.5px solid var(--danger)"
                : "1.5px solid var(--border)",
            }}
          />
        </div>
      </div>

      {/* Don't have ABHA — create in-modal */}
      <div style={{ textAlign: "right", marginBottom: "16px" }}>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Don't have ABHA?{" "}
        </span>
        <button
          onClick={onCreateNow}
          style={{
            color: "var(--primary)",
            fontWeight: "700",
            fontSize: "13px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Create Now →
        </button>
      </div>

      <button
        disabled={busy || m.length < 10}
        onClick={handleSend}
        style={{
          width: "100%",
          background: busy || m.length < 10 ? "var(--border)" : "var(--accent)",
          color: busy || m.length < 10 ? "var(--text-muted)" : "#fff",
          border: "none",
          padding: "12px",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "700",
          cursor: busy || m.length < 10 ? "not-allowed" : "pointer",
          transition: "all 0.25s",
          boxShadow:
            busy || m.length < 10 ? "none" : "0 4px 16px rgba(251,145,63,0.38)",
          letterSpacing: "0.01em",
        }}
      >
        {busy ? "Sending OTP..." : "Send OTP"}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "20px",
          padding: "12px 14px",
          background: "var(--primary-light)",
          borderRadius: "10px",
          border: "1px solid var(--primary-soft)",
        }}
      >
        <ShieldCheck
          size={15}
          color="var(--primary)"
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: "12px",
            color: "var(--primary-dark)",
            lineHeight: "1.5",
          }}
        >
          Your data is secured by <strong>NHA</strong> and processed as per ABDM
          guidelines.
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   ABHA STEP 2 — OTP Verification
   ═══════════════════════════════════════ */
function AbhaOtp({ mobile, onBack, onVerify, onResend, busy, err }) {
  const [o, setO] = useState("");
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = () => {
    setO("");
    setCountdown(600);
    setCanResend(false);
    onResend();
  };

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div style={{ animation: "fadeIn 0.35s ease-in-out" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--bg-app)",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--text-main)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Confirm It's You
          </h3>
        </div>
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginBottom: "28px",
          paddingLeft: "44px",
          lineHeight: "1.6",
        }}
      >
        Enter the 6-digit verification code sent to mobile number linked with
        your ABHA account{" "}
        <strong style={{ color: "var(--text-main)" }}>+91 {mobile}</strong>
      </p>

      {err && <ErrorBox msg={err} />}

      <div style={{ marginBottom: "28px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          Enter OTP
        </label>
        <OtpInputGrid value={o} onChange={setO} />
      </div>

      {/* Resend timer */}
      <div style={{ textAlign: "right", marginBottom: "24px" }}>
        {canResend ? (
          <button
            onClick={handleResend}
            style={{
              color: "var(--primary)",
              fontWeight: "700",
              fontSize: "13px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Resend OTP
          </button>
        ) : (
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Resend OTP in{" "}
            <strong
              style={{
                color: "var(--text-main)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mins}:{secs}
            </strong>
          </span>
        )}
      </div>

      <button
        disabled={busy || o.length < 6}
        onClick={() => onVerify(o)}
        style={{
          width: "100%",
          background: busy || o.length < 6 ? "var(--border)" : "var(--accent)",
          color: busy || o.length < 6 ? "var(--text-muted)" : "#fff",
          border: "none",
          padding: "16px",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "700",
          cursor: busy || o.length < 6 ? "not-allowed" : "pointer",
          transition: "all 0.25s",
          boxShadow:
            busy || o.length < 6 ? "none" : "0 4px 16px rgba(251,145,63,0.38)",
        }}
      >
        {busy ? "Verifying..." : "Verify OTP"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   ABHA STEP 3 — Select ABHA Address
   ═══════════════════════════════════════ */
function AbhaSelectAddress({
  addresses,
  selected,
  onSelect,
  onBack,
  onConfirm,
  busy,
  err,
}) {
  const [dob, setDob] = useState("");
  const [dobErr, setDobErr] = useState("");

  const handleConfirm = () => {
    if (!dob) {
      setDobErr("Please enter your Date of Birth");
      return;
    }
    const selectedDob = new Date(dob);
    const now = new Date();
    const minAllowed = new Date(
      now.getFullYear() - 150,
      now.getMonth(),
      now.getDate(),
    );
    if (selectedDob < minAllowed) {
      setDobErr("Date of birth must be within the last 150 years");
      return;
    }
    if (selectedDob > now) {
      setDobErr("Date of birth cannot be in the future");
      return;
    }
    setDobErr("");
    onConfirm(selected, dob);
  };

  const hasAddress = !!selected || (addresses && addresses.length > 0);

  return (
    <div style={{ animation: "fadeIn 0.35s ease-in-out" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--bg-app)",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: "800",
            color: "var(--text-main)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Link ABHA Profile
        </h3>
      </div>

      {err && <ErrorBox msg={err} />}

      {/* Message above input when ABHA address is found */}
      {hasAddress && (
        <div
          style={{
            fontSize: "13px",
            color: "#15803d",
            fontWeight: "600",
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" />
          <span>ABHA addresses found for this mobile number</span>
        </div>
      )}

      {/* ABHA Address Field / Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-main)",
            marginBottom: "8px",
          }}
        >
          ABHA Address
        </label>

        {addresses.length > 1 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {addresses.map((addr, i) => {
              const addrVal =
                addr.abhaAddress ||
                addr.address ||
                addr.id ||
                (typeof addr === "string" ? addr : "");
              const isSelected = selected === addrVal;
              return (
                <button
                  key={i}
                  onClick={() => onSelect(addrVal)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    textAlign: "left",
                    border: isSelected
                      ? "2px solid var(--primary)"
                      : "1.5px solid var(--border)",
                    background: isSelected
                      ? "var(--primary-light)"
                      : "var(--bg-app)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        border: isSelected
                          ? "5px solid var(--primary)"
                          : "2px solid var(--border)",
                        transition: "all 0.2s",
                        background: "white",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--primary-dark)",
                          fontFamily: "monospace",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {addrVal}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={18} color="var(--primary)" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type="text"
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="e.g. username@sbx"
            className="input-field"
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "var(--bg-app)",
              fontSize: "15px",
              width: "100%",
              fontWeight: "600",
              color: "var(--primary-dark)",
              fontFamily: "monospace",
            }}
          />
        )}
      </div>

      {/* Date of Birth */}
      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-main)",
            marginBottom: "8px",
          }}
        >
          Date of Birth
        </label>
        <DobPicker
          value={dob}
          onChange={(val) => {
            setDob(val);
            setDobErr("");
          }}
          error={dobErr}
        />
        {dobErr && (
          <p
            style={{
              color: "var(--danger)",
              fontSize: "12px",
              marginTop: "6px",
              fontWeight: "500",
            }}
          >
            {dobErr}
          </p>
        )}
      </div>

      <button
        disabled={busy || !selected}
        onClick={handleConfirm}
        style={{
          width: "100%",
          background: busy || !selected ? "var(--border)" : "var(--accent)",
          color: busy || !selected ? "var(--text-muted)" : "#fff",
          border: "none",
          padding: "16px",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "700",
          cursor: busy || !selected ? "not-allowed" : "pointer",
          transition: "all 0.25s",
          boxShadow:
            busy || !selected ? "none" : "0 4px 16px rgba(251,145,63,0.38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {busy ? (
          "Logging in..."
        ) : (
          <>
            Continue and login <ChevronRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   ABHA CREATE FLOW
   ═══════════════════════════════════════ */
function AbhaCreate({
  step,
  initialMobile = "",
  abhaTransactionId = "",
  setAbhaTransactionId,
  saveSession,
  onBack,
  onNext,
  onFinish,
}) {
  const { showToast } = useAuth();
  const [aadhaar, setAadhaar] = useState("");
  const [mobile, setMobile] = useState(initialMobile || "");
  const [otp, setOtp] = useState("");
  const [txnId, setTxnId] = useState(abhaTransactionId || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "Male",
    mobile: "",
    address: "",
  });
  const [createdAbha, setCreatedAbha] = useState("");
  const [copied, setCopied] = useState(false);

  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (step === "abha_create_2") {
      setCountdown(600);
      setCanResend(false);
    }
  }, [step]);

  useEffect(() => {
    if (step !== "abha_create_2") return;
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const fmtAadhaar = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 12)
      .replace(/(\d{4})(?=\d)/g, "$1 ");

  const rawAadhaar = aadhaar.replace(/\s/g, "");
  const isAadhaarValid = rawAadhaar.length === 12;

  const handleResendOtp = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await abhaSendCreationOtp(rawAadhaar);
      const newTxnId =
        res?.txnId ||
        res?.transactionId ||
        res?.data?.txnId ||
        res?.data?.transactionId ||
        res?.txn_id ||
        res?.result?.txnId ||
        "";
      if (newTxnId) {
        setTxnId(newTxnId);
        if (setAbhaTransactionId) setAbhaTransactionId(newTxnId);
      }
      setOtp("");
      setCountdown(600);
      setCanResend(false);
      if (showToast)
        showToast("OTP resent to your Aadhaar-linked mobile", "success");
    } catch (e) {
      const errMsg = e.message || "Failed to resend OTP";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  const handleStep1 = async () => {
    if (!rawAadhaar || rawAadhaar.length !== 12) {
      const msg = "Please enter a valid 12-digit Aadhaar number.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (rawAadhaar.startsWith("0") || rawAadhaar.startsWith("1")) {
      const msg =
        "Aadhaar number cannot start with 0 or 1. Please enter a valid Aadhaar number.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (/^(\d)\1{11}$/.test(rawAadhaar)) {
      const msg =
        "Aadhaar number cannot contain all identical digits. Please enter a valid Aadhaar number.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const res = await abhaSendCreationOtp(rawAadhaar);
      const newTxnId =
        res?.txnId ||
        res?.transactionId ||
        res?.data?.txnId ||
        res?.data?.transactionId ||
        res?.txn_id ||
        res?.result?.txnId ||
        "";
      const fetchedMobile =
        res?.mobileNumber ||
        res?.data?.mobileNumber ||
        res?.mobile ||
        res?.data?.mobile ||
        "";

      if (newTxnId) {
        setTxnId(newTxnId);
        if (setAbhaTransactionId) setAbhaTransactionId(newTxnId);
      }
      if (fetchedMobile) {
        setMobile(fetchedMobile);
      }
      if (showToast)
        showToast("OTP sent to Aadhaar-registered mobile", "success");
      setBusy(false);
      onNext("abha_create_2");
    } catch (e) {
      let errMsg = e.message || "";
      if (
        !errMsg ||
        errMsg === "Request failed" ||
        errMsg.includes("Failed to send OTP")
      ) {
        errMsg = "This Aadhaar number is not recognized. Try again.";
      }
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
      setBusy(false);
    }
  };

  const [creationAuthData, setCreationAuthData] = useState(null);

  const handleStep2 = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10 && !mobile.includes("*")) {
      const msg = "Please enter a valid 10-digit mobile number.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    if (otp.length < 6) {
      const msg = "Enter the 6-digit OTP sent to your Aadhaar-linked mobile.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const activeTxnId = txnId || abhaTransactionId;
      const res = await abhaCreateByAadhaar(
        mobile.includes("*") ? mobile : cleanMobile,
        otp,
        activeTxnId,
      );

      const profile =
        res?.ABHAProfile || res?.data?.ABHAProfile || res?.profile || {};
      const tokens = res?.tokens || res?.data?.tokens || {};

      // Preferred ABHA Address or ABHA Number
      const abhaAddress =
        profile?.preferredAddress ||
        profile?.ABHANumber ||
        res?.abhaNumber ||
        res?.preferredAddress ||
        res?.abha_number ||
        res?.data?.abhaNumber ||
        "";

      // Name construction from firstName, middleName, lastName
      const constructedName = [
        profile?.firstName,
        profile?.middleName,
        profile?.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      const name =
        constructedName ||
        res?.name ||
        res?.fullName ||
        res?.data?.name ||
        res?.UserData?.name ||
        "ABHA User";

      // Format Date of Birth (DD-MM-YYYY -> YYYY-MM-DD)
      const rawDob =
        profile?.dob || res?.dob || res?.dateOfBirth || res?.data?.dob || "";
      let dob = "2000-01-01";
      if (rawDob && rawDob.includes("-")) {
        const parts = rawDob.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) dob = rawDob;
          else
            dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      // Format Gender ("M" -> "Male", "F" -> "Female")
      const rawGender =
        profile?.gender || res?.gender || res?.data?.gender || "Male";
      const gender =
        rawGender === "M" || rawGender === "MALE"
          ? "Male"
          : rawGender === "F" || rawGender === "FEMALE"
            ? "Female"
            : rawGender;

      const address =
        profile?.address || res?.address || res?.data?.address || "";
      const userMobile = profile?.mobile || cleanMobile;

      setForm({ name, dob, gender, mobile: userMobile, address });
      setCreatedAbha(
        abhaAddress ||
          `${name.split(" ")[0].toLowerCase()}.${Math.floor(Math.random() * 9000 + 1000)}@abdm`,
      );

      // Save tokens & profile to state to saveSession upon final step
      setCreationAuthData({
        token: tokens?.token || res?.token || "",
        refreshToken: tokens?.refreshToken || "",
        tokens,
        profile,
        user: {
          name,
          mobile: userMobile,
          dob,
          gender,
          address,
          abhaAddress,
          abhaNumber: profile?.ABHANumber || abhaAddress,
          abha_number: profile?.ABHANumber || abhaAddress,
          abha_token: tokens?.token || "",
          photo: profile?.photo || null,
          isKycVerified: true,
          abhaStatus: profile?.abhaStatus || "ACTIVE",
        },
      });

      if (showToast) showToast("OTP verified successfully", "success");
      setBusy(false);
      onNext("abha_create_3");
    } catch (e) {
      const errMsg = e.message || "Failed to create ABHA by Aadhaar.";
      setErr(errMsg);
      if (showToast) showToast(errMsg, "error");
      setBusy(false);
    }
  };

  const handleStep3 = async () => {
    if (!form.name.trim() || !form.dob || !form.mobile) {
      const msg = "Please fill all required fields.";
      setErr(msg);
      if (showToast) showToast(msg, "error");
      return;
    }
    setErr("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    onNext("abha_create_done");
  };

  const copyToClipboard = () => {
    if (createdAbha) {
      navigator.clipboard.writeText(createdAbha);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "abha_create_done") {
    return (
      <div
        style={{
          animation: "fadeIn 0.35s ease-in-out",
          textAlign: "center",
          padding: "8px 0",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 20px rgba(34,197,94,0.18)",
          }}
        >
          <CheckCircle2 size={36} color="#15803d" />
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--primary-light)",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "11.5px",
            fontWeight: "700",
            color: "var(--primary-dark)",
            marginBottom: "10px",
          }}
        >
          <Sparkles size={13} /> ABHA ID CREATED SUCCESSFULLY
        </div>

        <h3
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "var(--text-main)",
            marginBottom: "6px",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome to ABHA!
        </h3>
        <p
          style={{
            fontSize: "13.5px",
            color: "var(--text-muted)",
            marginBottom: "20px",
            lineHeight: "1.5",
            maxWidth: "360px",
            margin: "0 auto 20px",
          }}
        >
          Your Official Healthcare ID is active and ready to manage digital
          medical records.
        </p>

        <div
          style={{
            background: "var(--bg-app)",
            border: "1.5px solid var(--primary-soft)",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: "700",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              ABHA Address / ID
            </span>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "15px",
                fontWeight: "700",
                color: "var(--primary-dark)",
                marginTop: "2px",
              }}
            >
              {createdAbha}
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            style={{
              background: copied ? "#dcfce7" : "white",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "700",
              color: copied ? "#15803d" : "var(--text-main)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.2s",
            }}
          >
            {copied ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => {
            if (saveSession && creationAuthData) {
              saveSession({
                token: creationAuthData.token,
                refreshToken: creationAuthData.refreshToken,
                user: creationAuthData.user,
                loginMethod: "abha",
              });
            }
            onFinish();
          }}
          style={{
            width: "100%",
            padding: "14px 20px",
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-dark))",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(46,102,110,0.3)",
            transition: "all 0.25s",
          }}
        >
          Go to ABHA Hub →
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.35s ease-in-out" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            color: "var(--text-main)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10.5px",
              fontWeight: "700",
              color: "var(--primary)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {step === "abha_create_1" && (
              <>
                <FileText size={12} /> STEP 1 OF 3 • AADHAAR
              </>
            )}
            {step === "abha_create_2" && (
              <>
                <KeyRound size={12} /> STEP 2 OF 3 • VERIFICATION
              </>
            )}
            {step === "abha_create_3" && (
              <>
                <User size={12} /> STEP 3 OF 3 • DETAILS
              </>
            )}
          </span>
          <h3
            style={{
              fontSize: "19px",
              fontWeight: "800",
              color: "var(--text-main)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {step === "abha_create_1"
              ? "Enter Aadhaar Number"
              : step === "abha_create_2"
                ? "Verify OTP & Mobile"
                : "Confirm Personal Details"}
          </h3>
        </div>
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginBottom: "18px",
          lineHeight: "1.5",
        }}
      >
        {step === "abha_create_1"
          ? "Enter your 12-digit Aadhaar number to initiate instant ABHA registration."
          : step === "abha_create_2"
            ? "Enter your 10-digit mobile number and the 6-digit OTP sent to your phone."
            : "Review your details retrieved from Aadhaar to finalize your ABHA account."}
      </p>

      {err && (
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            padding: "10px 12px",
            borderRadius: "10px",
            fontSize: "12.5px",
            fontWeight: "500",
            marginBottom: "16px",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <X size={15} style={{ flexShrink: 0 }} />
          {err}
        </div>
      )}

      {/* STEP 1: Aadhaar Input */}
      {step === "abha_create_1" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "12.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FileText size={14} color="var(--primary)" /> 12-Digit Aadhaar
                Number
              </label>
              {isAadhaarValid && (
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#dcfce7",
                    padding: "1px 7px",
                    borderRadius: "10px",
                  }}
                >
                  <CheckCircle2 size={12} /> Valid
                </span>
              )}
            </div>

            <input
              className="input-field"
              autoFocus
              type="text"
              inputMode="numeric"
              placeholder="XXXX XXXX XXXX"
              value={aadhaar}
              onChange={(e) => setAadhaar(fmtAadhaar(e.target.value))}
              maxLength={14}
              style={{
                padding: "12px 14px",
                fontSize: "18px",
                letterSpacing: "0.12em",
                fontFamily: "monospace",
                borderRadius: "10px",
                background: "#fff",
                border: isAadhaarValid
                  ? "1.5px solid #16a34a"
                  : "1.5px solid var(--border)",
                width: "100%",
                color: "var(--text-main)",
                outline: "none",
              }}
            />

            <p
              style={{
                fontSize: "11.5px",
                color: "var(--text-muted)",
                marginTop: "6px",
                marginBottom: 0,
              }}
            >
              🔒 An authentication OTP will be dispatched to your
              Aadhaar-registered mobile.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "var(--primary-light)",
              borderRadius: "10px",
              border: "1px solid var(--primary-soft)",
            }}
          >
            <ShieldCheck
              size={16}
              color="var(--primary)"
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--primary-dark)",
                lineHeight: "1.4",
              }}
            >
              Protected by <strong>UIDAI & NHA 256-bit Encryption</strong>. Per
              ABDM consent guidelines.
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: Mobile + OTP Input */}
      {step === "abha_create_2" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Mobile Field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "var(--text-main)",
                marginBottom: "6px",
              }}
            >
              Mobile Number
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "0",
                  top: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderRight: "1.5px solid var(--border)",
                  color: "var(--text-main)",
                  fontWeight: "700",
                  fontSize: "14px",
                  gap: "4px",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                🇮🇳 <span>+91</span>
              </div>
              <input
                className="input-field"
                type="tel"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/[^\d*]/g, ""))
                }
                maxLength={10}
                style={{
                  paddingLeft: "84px",
                  padding: "12px 14px 12px 84px",
                  fontSize: "15px",
                  borderRadius: "10px",
                  background: "#fff",
                  border: "1.5px solid var(--border)",
                  width: "100%",
                  letterSpacing: mobile ? "0.04em" : "0",
                }}
              />
            </div>
          </div>

          {/* OTP Field */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "12.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                }}
              >
                Enter 6-Digit OTP
              </label>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                Sent via SMS
              </span>
            </div>

            <OtpInputGrid value={otp} onChange={setOtp} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                Didn't receive OTP?
              </span>
              {canResend ? (
                <button
                  disabled={busy}
                  onClick={handleResendOtp}
                  style={{
                    color: busy ? "var(--text-muted)" : "var(--primary)",
                    fontWeight: "700",
                    fontSize: "12px",
                    background: "none",
                    border: "none",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  {busy ? "Resending..." : "Resend OTP"}
                </button>
              ) : (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: "600",
                  }}
                >
                  Resend OTP in{" "}
                  <strong
                    style={{
                      color: "var(--text-main)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {mins}:{secs}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Personal Details Confirmation */}
      {step === "abha_create_3" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              background: "var(--primary-light)",
              border: "1px solid var(--primary-soft)",
              borderRadius: "10px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Sparkles
              size={14}
              color="var(--primary)"
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--primary-dark)",
                fontWeight: "600",
              }}
            >
              Details automatically retrieved from Aadhaar database. Please
              confirm below.
            </span>
          </div>

          {/* Row 1: Full Name & Mobile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  marginBottom: "3px",
                }}
              >
                Full Name
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                  }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "#fff",
                  fontSize: "13px",
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  height: "38px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  marginBottom: "3px",
                }}
              >
                Mobile Number
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="10-digit mobile"
                maxLength={10}
                value={form.mobile}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "#fff",
                  fontSize: "13px",
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  height: "38px",
                }}
              />
            </div>
          </div>

          {/* Row 2: Date of Birth & Gender */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  marginBottom: "3px",
                }}
              >
                Date of Birth
              </label>
              <DobPicker
                value={form.dob}
                onChange={(val) => setForm((f) => ({ ...f, dob: val }))}
                compact={true}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  marginBottom: "3px",
                }}
              >
                Gender
              </label>
              <select
                className="input-field"
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "#fff",
                  fontSize: "13px",
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  height: "38px",
                }}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Row 3: Address */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--text-main)",
                marginBottom: "3px",
              }}
            >
              Address
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="Your residential address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: "#fff",
                fontSize: "13px",
                width: "100%",
                border: "1.5px solid var(--border)",
                height: "38px",
              }}
            />
          </div>
        </div>
      )}

      {/* Main CTA Button */}
      <button
        disabled={busy || (step === "abha_create_1" && !isAadhaarValid)}
        onClick={
          step === "abha_create_1"
            ? handleStep1
            : step === "abha_create_2"
              ? handleStep2
              : handleStep3
        }
        style={{
          width: "100%",
          padding: "14px 18px",
          background:
            busy || (step === "abha_create_1" && !isAadhaarValid)
              ? "var(--border)"
              : "linear-gradient(135deg, #f97316, #ea580c)",
          color:
            busy || (step === "abha_create_1" && !isAadhaarValid)
              ? "var(--text-muted)"
              : "#fff",
          border: "none",
          borderRadius: "12px",
          fontSize: "14.5px",
          fontWeight: "700",
          cursor:
            busy || (step === "abha_create_1" && !isAadhaarValid)
              ? "not-allowed"
              : "pointer",
          transition: "all 0.25s",
          boxShadow:
            busy || (step === "abha_create_1" && !isAadhaarValid)
              ? "none"
              : "0 4px 16px rgba(234,88,12,0.32)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {busy ? (
          "Please wait..."
        ) : step === "abha_create_1" ? (
          "Send OTP →"
        ) : step === "abha_create_2" ? (
          "Verify OTP & Proceed →"
        ) : (
          <>
            <UserPlus size={17} /> Complete & Create ABHA
          </>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════ */
function ErrorBox({ msg }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        color: "#dc2626",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        marginBottom: "20px",
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        border: "1px solid #fecaca",
      }}
    >
      <X size={15} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function OtpInputGrid({ value, onChange }) {
  const refs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const newVal = (value.slice(0, idx) + val + value.slice(idx + 1)).slice(
      0,
      6,
    );
    onChange(newVal);
    if (idx < 5 && refs.current[idx + 1]) refs.current[idx + 1].focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[idx]) {
        onChange(value.slice(0, idx) + value.slice(idx + 1));
      } else if (idx > 0 && refs.current[idx - 1]) {
        refs.current[idx - 1].focus();
        onChange(value.slice(0, idx - 1) + value.slice(idx));
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div
      className="otp-input-grid"
      style={{
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        marginBottom: "8px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="otp-input-box"
          onFocus={(e) => {
            e.target.style.borderColor = "var(--primary)";
            e.target.style.boxShadow = "0 0 0 4px rgba(46,102,110,0.14)";
            e.target.style.background = "#fff";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = value[i]
              ? "var(--primary-soft)"
              : "var(--border)";
            e.target.style.boxShadow = "none";
            e.target.style.background = "var(--bg-app)";
          }}
          style={{
            width: "44px",
            height: "52px",
            border: value[i]
              ? "2px solid var(--primary-soft)"
              : "1.5px solid var(--border)",
            borderRadius: "12px",
            textAlign: "center",
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--text-main)",
            outline: "none",
            background: value[i] ? "var(--primary-light)" : "var(--bg-app)",
            transition: "all 0.2s",
            cursor: "text",
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}

function DobPicker({ value, onChange, error, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 150);
  minDate.setHours(0, 0, 0, 0);

  const minYear = today.getFullYear() - 150;
  const maxYear = today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed) && parsed >= minDate && parsed <= today) {
        return parsed;
      }
    }
    return new Date(new Date().setFullYear(today.getFullYear() - 18));
  });

  const [view, setView] = useState("days"); // 'days', 'months', 'years'

  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatValue = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d} / ${m} / ${y}`;
  };

  const handleSelectDate = (day) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderDaysView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const isPrevMonthDisabled =
      year < minYear || (year === minYear && month <= minDate.getMonth());
    const isNextMonthDisabled =
      year > maxYear || (year === maxYear && month >= today.getMonth());

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          style={{ width: "14.28%", padding: "8px 0" }}
        ></div>,
      );
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const isSelected = value === dateStr;

      const cellDate = new Date(year, month, i);
      cellDate.setHours(12, 0, 0, 0);
      const isDisabled = cellDate > today || cellDate < minDate;

      days.push(
        <div key={i} style={{ width: "14.28%", padding: "4px" }}>
          <button
            disabled={isDisabled}
            onClick={(e) => {
              e.preventDefault();
              handleSelectDate(i);
            }}
            style={{
              width: "100%",
              height: "32px",
              border: "none",
              borderRadius: "8px",
              background: isSelected ? "var(--primary)" : "transparent",
              color: isSelected
                ? "#fff"
                : isDisabled
                  ? "#d1d5db"
                  : "var(--text-main)",
              fontWeight: isSelected ? "700" : "500",
              fontSize: "13px",
              cursor: isDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isDisabled) {
                e.currentTarget.style.background = "var(--bg-app)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !isDisabled) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {i}
          </button>
        </div>,
      );
    }

    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            padding: "0 8px",
          }}
        >
          <button
            disabled={isPrevMonthDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (!isPrevMonthDisabled) {
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1,
                  ),
                );
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: isPrevMonthDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              color: isPrevMonthDisabled ? "#d1d5db" : "var(--text-main)",
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              setView("months");
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "700",
              color: "var(--text-main)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {currentMonth.toLocaleString("default", { month: "long" })}{" "}
            {currentMonth.getFullYear()}
          </button>

          <button
            disabled={isNextMonthDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (!isNextMonthDisabled) {
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1,
                  ),
                );
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: isNextMonthDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              color: isNextMonthDisabled ? "#d1d5db" : "var(--text-main)",
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginBottom: "8px",
            padding: "0 4px",
          }}
        >
          {weekDays.map((wd) => (
            <div
              key={wd}
              style={{
                width: "14.28%",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              {wd}
            </div>
          ))}
          {days}
        </div>
      </>
    );
  };

  const renderMonthsView = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setView("years");
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            {currentMonth.getFullYear()}
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "0 8px",
          }}
        >
          {months.map((m, idx) => {
            const isSelected = currentMonth.getMonth() === idx;
            const monthStart = new Date(currentMonth.getFullYear(), idx, 1);
            const monthEnd = new Date(
              currentMonth.getFullYear(),
              idx + 1,
              0,
              23,
              59,
              59,
            );
            const isMonthDisabled = monthEnd < minDate || monthStart > today;
            return (
              <button
                key={m}
                disabled={isMonthDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isMonthDisabled) {
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), idx, 1),
                    );
                    setView("days");
                  }
                }}
                style={{
                  width: "calc(33.33% - 6px)",
                  padding: "12px 0",
                  border: "none",
                  borderRadius: "8px",
                  background: isSelected ? "var(--primary)" : "var(--bg-app)",
                  color: isSelected
                    ? "#fff"
                    : isMonthDisabled
                      ? "#d1d5db"
                      : "var(--text-main)",
                  fontWeight: isSelected ? "700" : "600",
                  fontSize: "14px",
                  cursor: isMonthDisabled ? "not-allowed" : "pointer",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderYearsView = () => {
    const currentYear = currentMonth.getFullYear();
    const startYear = Math.floor(currentYear / 12) * 12;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i);

    const isPrevYearsDisabled = startYear <= minYear;
    const isNextYearsDisabled = startYear + 11 >= maxYear;

    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            padding: "0 8px",
          }}
        >
          <button
            disabled={isPrevYearsDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (!isPrevYearsDisabled) {
                const targetYear = Math.max(minYear, startYear - 12);
                setCurrentMonth(new Date(targetYear, 0, 1));
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: isPrevYearsDisabled ? "not-allowed" : "pointer",
              color: isPrevYearsDisabled ? "#d1d5db" : "var(--text-main)",
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            {startYear} - {startYear + 11}
          </span>
          <button
            disabled={isNextYearsDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (!isNextYearsDisabled) {
                const targetYear = Math.min(maxYear, startYear + 12);
                setCurrentMonth(new Date(targetYear, 0, 1));
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: isNextYearsDisabled ? "not-allowed" : "pointer",
              color: isNextYearsDisabled ? "#d1d5db" : "var(--text-main)",
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "0 8px",
          }}
        >
          {years.map((y) => {
            const isSelected = currentYear === y;
            const isTooOld = y < minYear;
            const isFuture = y > maxYear;
            const isYearDisabled = isTooOld || isFuture;
            return (
              <button
                key={y}
                disabled={isYearDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isYearDisabled) {
                    let targetMonth = currentMonth.getMonth();
                    const checkDate = new Date(y, targetMonth, 1);
                    if (checkDate < minDate) {
                      targetMonth = minDate.getMonth();
                    } else if (checkDate > today) {
                      targetMonth = today.getMonth();
                    }
                    setCurrentMonth(new Date(y, targetMonth, 1));
                    setView("months");
                  }
                }}
                style={{
                  width: "calc(33.33% - 6px)",
                  padding: "12px 0",
                  border: "none",
                  borderRadius: "8px",
                  background: isSelected ? "var(--primary)" : "var(--bg-app)",
                  color: isSelected
                    ? "#fff"
                    : isYearDisabled
                      ? "#d1d5db"
                      : "var(--text-main)",
                  fontWeight: isSelected ? "700" : "600",
                  fontSize: "14px",
                  cursor: isYearDisabled ? "not-allowed" : "pointer",
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: compact ? "8px 12px" : "14px 16px",
          height: compact ? "38px" : "auto",
          borderRadius: compact ? "10px" : "12px",
          background: compact ? "#fff" : "var(--bg-app)",
          fontSize: compact ? "13px" : "15px",
          width: "100%",
          border: error
            ? "1.5px solid var(--danger)"
            : isOpen
              ? "1.5px solid var(--primary)"
              : "1.5px solid var(--border)",
          color: value ? "var(--text-main)" : "var(--text-muted)",
          cursor: "pointer",
          fontWeight: value ? "600" : "500",
          fontFamily: value ? "monospace" : "inherit",
          letterSpacing: value ? "0.04em" : "normal",
          transition: "all 0.2s",
          boxShadow: isOpen ? "0 0 0 4px rgba(46,102,110,0.1)" : "none",
        }}
      >
        <CalendarIcon
          size={18}
          style={{
            marginRight: "12px",
            color: isOpen ? "var(--primary)" : "var(--text-muted)",
          }}
        />
        {value ? formatValue(value) : "Select Date of Birth"}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: compact ? "-15px" : "0",
            width: "270px",
            background: "#fff",
            borderRadius: "14px",
            padding: "12px",
            boxShadow:
              "0 16px 36px -6px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
            zIndex: 999,
            animation: "fadeInUp 0.18s ease-out",
          }}
        >
          {view === "days" && renderDaysView()}
          {view === "months" && renderMonthsView()}
          {view === "years" && renderYearsView()}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   CHOOSE PROFILE (Multiple Profiles Selection UI)
   ═══════════════════════════════════════ */
function ChooseProfile({
  profiles = [],
  selectedProfileId,
  onSelectProfile,
  uhidInputs,
  onUhidChange,
  onContinue,
  onBack,
  busy,
  err,
}) {
  const [chooseStep, setChooseStep] = useState("verify"); // "verify" | "select_primary"
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [verifiedProfileIds, setVerifiedProfileIds] = useState([]);
  const [uhidErrors, setUhidErrors] = useState({});
  const [primaryLoginId, setPrimaryLoginId] = useState(null);
  const [profileAvatars, setProfileAvatars] = useState({});
  const { showToast } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function loadAvatars() {
      if (!profiles || profiles.length === 0) return;

      // Match patients by mobile or id (same approach as Header.jsx)
      let patientsList = [];
      try {
        const mobile = profiles[0]?.mobile_number || "";
        const profileId = profiles[0]?.id;
        const filters = [
          ...(profileId ? [{ column: "id", operator: "=", value: profileId }] : []),
          ...(mobile ? [{ column: "mobile_number", operator: "=", value: mobile }] : [])
        ];
        const res = await getPatients(filters);
        if (Array.isArray(res)) {
          patientsList = res;
        } else if (res && typeof res === "object") {
          patientsList = [res];
        }
      } catch (err) {
        console.warn("Could not query patients in ChooseProfile:", err);
      }

      const avatarsMap = {};
      await Promise.all(
        profiles.map(async (p) => {
          try {
            const matchedPatient =
              patientsList.find(
                (item) => String(item.id || item.user_id || item.app_user_id) === String(p.id)
              ) ||
              patientsList.find(
                (item) =>
                  item.external_id &&
                  p.external_id &&
                  String(item.external_id).trim().toUpperCase() ===
                    String(p.external_id).trim().toUpperCase()
              ) ||
              patientsList.find(
                (item) =>
                  item.name &&
                  p.name &&
                  item.name.trim().toLowerCase() === p.name.trim().toLowerCase()
              );

            let imgPath =
              matchedPatient?.profile_image ||
              matchedPatient?.profileImage ||
              matchedPatient?.photo ||
              p?.profile_image ||
              p?.profileImage ||
              p?.photo ||
              p?.image ||
              "";

            if (imgPath) {
              const pathStr = String(imgPath).trim();
              if (
                pathStr.startsWith("http://") ||
                pathStr.startsWith("https://") ||
                pathStr.startsWith("data:") ||
                pathStr.startsWith("blob:")
              ) {
                avatarsMap[p.id] = pathStr;
              } else {
                const resolved = await fetchImageBlob(pathStr, "patientProfileImage");
                if (resolved) {
                  avatarsMap[p.id] = resolved;
                } else {
                  const fallback = getImageUrl(pathStr, "patientProfileImage");
                  if (fallback) avatarsMap[p.id] = fallback;
                }
              }
            }
          } catch (e) {
            console.error("Failed to load avatar for profile", p.id, e);
          }
        })
      );

      if (isMounted) {
        setProfileAvatars(avatarsMap);
      }
    }

    loadAvatars();

    return () => {
      isMounted = false;
    };
  }, [profiles]);

  const getInitials = (name) => {
    if (!name) return "U";
    const cleaned = name.trim().replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s+/i, "");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0] ? parts[0][0] : "U").toUpperCase();
  };

  const handleCheckboxToggle = (profileId, checked) => {
    // Only verified profiles can be toggled
    if (!verifiedProfileIds.includes(profileId)) {
      onSelectProfile(profileId);
      return;
    }
    if (checked) {
      setSelectedProfileIds((prev) =>
        prev.includes(profileId) ? prev : [...prev, profileId]
      );
    } else {
      setSelectedProfileIds((prev) => prev.filter((id) => id !== profileId));
    }
  };

  const handleUhidInputChange = (profile, val) => {
    // Only allow uppercase letters, numbers, and hyphen (format: KOL-55552)
    const sanitized = (val || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
    onUhidChange(profile.id, sanitized);
    // Clear error for this profile when user types
    setUhidErrors((prev) => {
      if (!prev[profile.id]) return prev;
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
    // Invalidate prior verification if input is changed
    setVerifiedProfileIds((prev) => prev.filter((id) => id !== profile.id));
    setSelectedProfileIds((prev) => prev.filter((id) => id !== profile.id));
  };

  const handleVerifyUhid = (profile) => {
    const rawVal =
      uhidInputs[profile.id] !== undefined ? uhidInputs[profile.id] : "";
    const entered = (rawVal || "").trim().toUpperCase();

    if (!entered) {
      setUhidErrors((prev) => ({
        ...prev,
        [profile.id]: "Please enter UHID to verify",
      }));
      return;
    }

    // Match against profile record if external_id exists
    const expected = (
      profile.external_id ||
      profile.uhid ||
      profile.externalId ||
      ""
    ).trim().toUpperCase();

    if (expected && entered !== expected) {
      setUhidErrors((prev) => ({
        ...prev,
        [profile.id]: "Incorrect UHID. Please check and try again.",
      }));
      return;
    }

    // Successful verification
    setUhidErrors((prev) => {
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
    setVerifiedProfileIds((prev) =>
      prev.includes(profile.id) ? prev : [...prev, profile.id]
    );
    setSelectedProfileIds((prev) =>
      prev.includes(profile.id) ? prev : [...prev, profile.id]
    );
  };

  const handleResetUhidVerification = (profileId) => {
    setVerifiedProfileIds((prev) => prev.filter((id) => id !== profileId));
    setSelectedProfileIds((prev) => prev.filter((id) => id !== profileId));
    setUhidErrors((prev) => {
      const next = { ...prev };
      delete next[profileId];
      return next;
    });
  };

  const handleProceedToPrimary = () => {
    const verifiedSelected = profiles.filter(
      (p) => selectedProfileIds.includes(p.id) && verifiedProfileIds.includes(p.id)
    );
    if (verifiedSelected.length === 0) return;

    // If single profile is verified, directly make the login
    if (verifiedSelected.length === 1) {
      onContinue(verifiedSelected[0], verifiedSelected);
      return;
    }

    // If multiple profiles are verified, show primary account selection screen
    const primarySelected =
      verifiedSelected.find(
        (p) => !p.relation && (!p.parent_account_id || p.parent_account_id === p.id)
      ) || verifiedSelected[0];

    setPrimaryLoginId(primarySelected ? primarySelected.id : verifiedSelected[0].id);
    setChooseStep("select_primary");
  };

  const handleDoLogin = () => {
    const verifiedSelected = profiles.filter(
      (p) => selectedProfileIds.includes(p.id) && verifiedProfileIds.includes(p.id)    );
    const chosen =
      profiles.find((p) => p.id === primaryLoginId) ||
      verifiedSelected[0] ||
      profiles[0];
    onContinue(chosen, verifiedSelected);
  };

  // Step 2: Select Primary Account view
  if (chooseStep === "select_primary") {
    const selectedProfiles = profiles.filter((p) =>
      selectedProfileIds.includes(p.id)
    );
    const chosenProfile =
      profiles.find((p) => p.id === primaryLoginId) || selectedProfiles[0];

    return (
      <div className="choose-profile-container">
        <div className="choose-profile-header">
          <button
            type="button"
            onClick={() => setChooseStep("verify")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: "#1b6b72",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              padding: "0 0 10px 0",
            }}
          >
            <ChevronLeft size={16} /> Back to account selection
          </button>

          <div>
            <h3 className="choose-profile-title">
              Select Primary Account
            </h3>
            <p className="choose-profile-desc">
              Select the primary account to login. All selected accounts will be accessible to switch anytime after login.
            </p>
          </div>
        </div>

        {err && <div style={{ flexShrink: 0, marginBottom: "8px" }}><ErrorBox msg={err} /></div>}

        <div className="choose-profile-list custom-modal-scroller">
          {selectedProfiles.map((p) => {
            const isPrimary =
              !p.relation &&
              (!p.parent_account_id || p.parent_account_id === p.id);
            const isCurrentActive = p.id === primaryLoginId;
            const displayName = (
              p.name && !/^User(\s*\(\+?\d+\))?$/i.test(p.name.trim())
                ? p.name
                : [
                    p.title ? (p.title.endsWith(".") ? p.title : `${p.title}.`) : "",
                    p.first_name || p.firstName,
                    p.last_name || p.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim() ||
                  p.full_name ||
                  p.patient_name ||
                  "Patient Profile"
            ).replace(/\.\./g, ".");
            const initials = getInitials(displayName);
            const currentUhid =
              uhidInputs[p.id] || p.external_id || "";

            return (
              <div
                key={p.id}
                onClick={() => setPrimaryLoginId(p.id)}
                style={{
                  border: isCurrentActive
                    ? "2px solid #1b6b72"
                    : "1.5px solid var(--border)",
                  borderRadius: "16px",
                  background: isCurrentActive ? "#f0fdfa" : "#ffffff",
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isCurrentActive
                    ? "0 4px 14px rgba(27, 107, 114, 0.12)"
                    : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: isCurrentActive
                        ? "6px solid #1b6b72"
                        : "2px solid #cbd5e1",
                      background: "#ffffff",
                      boxSizing: "border-box",
                      flexShrink: 0,
                    }}
                  />

                  {/* Avatar */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: isPrimary ? "#1b6b72" : "#ea580c",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: "700",
                      flexShrink: 0,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {profileAvatars[p.id] ? (
                      <img
                        src={profileAvatars[p.id]}
                        alt={displayName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          zIndex: 1,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    {initials}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "var(--text-main)",
                        lineHeight: "1.2",
                      }}
                    >
                      {displayName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Check size={11} /> Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="choose-profile-footer">
          <button
            disabled={busy || !primaryLoginId}
            onClick={handleDoLogin}
            style={{
              width: "100%",
              margin: 0,
              background: busy
                ? "#cbd5e1"
                : "linear-gradient(135deg, #1b6b72, #134e54)",
              color: "#ffffff",
              border: "none",
              padding: "13px 16px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: busy
                ? "none"
                : "0 4px 14px rgba(27, 107, 114, 0.35)",
              transition: "all 0.25s ease",
            }}
          >
            {busy
              ? "Logging in..."
              : `Login as ${(() => {
                  if (!chosenProfile?.name) return "Account";
                  const parts = chosenProfile.name.trim().split(/\s+/);
                  if (parts.length > 1 && /^(mr|mrs|ms|dr)\.?$/i.test(parts[0])) {
                    return `${parts[0]} ${parts[1]}`;
                  }
                  return chosenProfile.name;
                })()}`}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Verification & Selection view (matches Image 1)
  return (
    <div className="choose-profile-container">
      <div className="choose-profile-header">
        <h3 className="choose-profile-title">
          {profiles.length === 1 ? "Verify UHID" : "Choose a Profile"}
        </h3>
        <p className="choose-profile-desc">
          {profiles.length === 1
            ? "Please enter your UHID to verify and continue to your account."
            : "Select the profile you want to access."}
        </p>
      </div>

      {err && <div style={{ flexShrink: 0, marginBottom: "8px" }}><ErrorBox msg={err} /></div>}

      <div className="choose-profile-list custom-modal-scroller">
        {profiles.map((p) => {
          const isAccordionOpen =
            p.id === selectedProfileId || profiles.length === 1;
          const isPrimary =
            !p.relation &&
            (!p.parent_account_id || p.parent_account_id === p.id);
          const displayName = (
            p.name && !/^User(\s*\(\+?\d+\))?$/i.test(p.name.trim())
              ? p.name
              : [
                  p.title ? (p.title.endsWith(".") ? p.title : `${p.title}.`) : "",
                  p.first_name || p.firstName,
                  p.last_name || p.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                p.full_name ||
                p.patient_name ||
                "Patient Profile"
          ).replace(/\.\./g, ".");
          const initials = getInitials(displayName);
          const currentUhid =
            uhidInputs[p.id] !== undefined ? uhidInputs[p.id] : "";
          const isVerified = verifiedProfileIds.includes(p.id);
          const isChecked = selectedProfileIds.includes(p.id) && isVerified;
          const currentError = uhidErrors[p.id] || "";

          return (
            <div
              key={p.id}
              className="choose-profile-card"
              style={{
                border: currentError
                  ? "2px solid #ef4444"
                  : isAccordionOpen
                    ? "2px solid #1b6b72"
                    : isChecked
                      ? "2px solid #10b981"
                      : "1.5px solid var(--border)",
                borderRadius: "16px",
                background: "#ffffff",
                padding: "16px",
                transition: "all 0.25s ease",
                boxShadow: isAccordionOpen
                  ? "0 4px 16px rgba(27, 107, 114, 0.08)"
                  : "none",
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              {/* Card Top Row - Clickable to expand/collapse */}
              <div
                onClick={() => {
                  onSelectProfile(isAccordionOpen ? null : p.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "14px" }}
                >
                  {/* Avatar Circle */}
                  <div
                    className="choose-profile-avatar"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: isPrimary ? "#1b6b72" : "#ea580c",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      fontSize: "16px",
                      fontWeight: "700",
                      lineHeight: "1",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      overflow: "hidden",
                      position: "relative",
                      boxSizing: "border-box",
                    }}
                  >
                    {profileAvatars[p.id] ? (
                      <img
                        src={profileAvatars[p.id]}
                        alt={displayName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          zIndex: 1,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span>{initials}</span>
                  </div>

                  {/* Name and Badges */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="choose-profile-name"
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "var(--text-main)",
                        lineHeight: "1.2",
                        wordBreak: "break-word",
                      }}
                    >
                      {displayName}
                    </div>

                    {/* Only show verified below name when user has verified UHID */}
                    {isVerified && (
                      <div style={{ marginTop: "4px" }}>
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side top corner: Checkbox with tick UI */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isVerified) {
                      handleCheckboxToggle(p.id, !isChecked);
                    } else {
                      onSelectProfile(p.id);
                    }
                  }}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "5px",
                    border: isChecked
                      ? "2px solid #1b6b72"
                      : "2px solid #cbd5e1",
                    background: isChecked ? "#1b6b72" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                    boxSizing: "border-box",
                    alignSelf: "flex-start",
                  }}
                  title={
                    isVerified
                      ? isChecked
                        ? "Selected"
                        : "Click to select"
                      : "Click to enter UHID and verify"
                  }
                >
                  {isChecked && (
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  )}
                </div>
              </div>

              {/* Card Expanded Content - UHID verification is compulsory for all users */}
              {isAccordionOpen && (
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#475569",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      UHID <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    {/* <span
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "600",
                      }}
                    >
                      Format: KOL-55552
                    </span> */}
                  </div>

                  {/* Input + Verify Button row */}
                  <div
                    className="uhid-input-row"
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "stretch",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <input
                      className="uhid-input"
                      type="text"
                      placeholder="Enter UHID to continue"
                      value={currentUhid}
                      onChange={(e) => handleUhidInputChange(p, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!isVerified) handleVerifyUhid(p);
                        }
                      }}
                      disabled={isVerified}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: isVerified
                          ? "1.5px solid #10b981"
                          : currentError
                            ? "1.5px solid #ef4444"
                            : "1.5px solid #cbd5e1",
                        fontSize: "14.5px",
                        fontWeight: "600",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "var(--text-main)",
                        background: isVerified ? "#f0fdf4" : "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "all 0.2s",
                      }}
                      onFocus={(e) => {
                        if (!isVerified && !currentError) {
                          e.target.style.borderColor = "#1b6b72";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(27,107,114,0.12)";
                        }
                      }}
                      onBlur={(e) => {
                        if (!isVerified && !currentError) {
                          e.target.style.borderColor = "#cbd5e1";
                          e.target.style.boxShadow = "none";
                        }
                      }}
                    />

                    {isVerified ? (
                      <button
                        type="button"
                        className="uhid-verify-btn"
                        onClick={() => handleResetUhidVerification(p.id)}
                        style={{
                          padding: "0 16px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#e2e8f0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f8fafc";
                        }}
                      >
                        Change
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="uhid-verify-btn"
                        onClick={() => handleVerifyUhid(p)}
                        style={{
                          padding: "0 20px",
                          borderRadius: "10px",
                          border: "none",
                          background: "linear-gradient(135deg, #1b6b72, #144e53)",
                          color: "#ffffff",
                          fontSize: "13.5px",
                          fontWeight: "700",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(27, 107, 114, 0.25)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.92";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        Verify
                      </button>
                    )}
                  </div>

                  {/* Immediate error message if verification fails */}
                  {currentError && (
                    <div
                      style={{
                        color: "#ef4444",
                        fontSize: "12.5px",
                        marginTop: "8px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{currentError}</span>
                    </div>
                  )}

                  {/* If verified successfully, show success badge */}
                  {isVerified && (
                    <div
                      style={{
                        color: "#15803d",
                        fontSize: "12.5px",
                        marginTop: "8px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>UHID verified successfully</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue Button once at least one account is verified & checked */}
      <div className="choose-profile-footer">
        {selectedProfileIds.filter((id) => verifiedProfileIds.includes(id)).length > 0 ? (
          <button
            type="button"
            onClick={handleProceedToPrimary}
            style={{
              width: "100%",
              margin: 0,
              background: "linear-gradient(135deg, #1b6b72, #144e53)",
              color: "#ffffff",
              border: "none",
              padding: "13px 16px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(27, 107, 114, 0.35)",
              transition: "all 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>
              {profiles.length === 1
                ? "Continue"
                : `Continue (${selectedProfileIds.filter((id) => verifiedProfileIds.includes(id)).length} account${selectedProfileIds.filter((id) => verifiedProfileIds.includes(id)).length > 1 ? "s" : ""} selected)`}
            </span>
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={true}
            style={{
              width: "100%",
              margin: 0,
              background: "#e2e8f0",
              color: "#94a3b8",
              border: "none",
              padding: "13px 16px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>Verify UHID to Continue</span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <style>{`
        .uhid-input::placeholder {
          text-transform: none;
          letter-spacing: normal;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}
