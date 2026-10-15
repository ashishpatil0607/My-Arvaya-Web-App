import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import Signup from "../pages/Signup";
import Home from "../pages/Home";
import Doctors from "../pages/Doctors";
import DoctorProfile from "../pages/DoctorProfile";
import SelectSlot from "../pages/SelectSlot";
import Review from "../pages/Review";
import Confirmed from "../pages/Confirmed";
import CareJourney from "../pages/CareJourney";
import ABHA from "../pages/abha/index";
import Records from "../pages/Records";
import Labs from "../pages/Labs";
import AllLabTests from "../pages/AllLabTests";
import AllHealthPackages from "../pages/AllHealthPackages";
import Wallet from "../pages/Wallet";
import Rewards from "../pages/Rewards";
import Ambulance from "../pages/Ambulance";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import Notifications from "../pages/Notifications";
import MyAppointments from "../pages/MyAppointments";
import Prescriptions from "../pages/Prescriptions";
import Pharmacy from "../pages/Pharmacy";
import Orders from "../pages/Orders";
import Payments from "../pages/Payments";
import Referrals from "../pages/Referrals";
import Support from "../pages/Support";
import AIAssistant from "../pages/AIAssistant";
import SpecialtySelection from "../pages/booking/SpecialtySelection";
import VisitTypeSelection from "../pages/booking/VisitTypeSelection";
import DoctorList from "../pages/booking/DoctorList";
import ScheduleSelection from "../pages/booking/ScheduleSelection";
import HospitalSelection from "../pages/booking/HospitalSelection";
import BookingReview from "../pages/booking/BookingReview";
import BookingConfirmed from "../pages/booking/BookingConfirmed";

import PackageDetails from "../pages/PackageDetails";
import Login from "../pages/Login";
import AccountDeletion from "../pages/AccountDeletion";
import About from "../pages/About";
import Terms from "../pages/Terms";

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/account-deletion" element={<AccountDeletion />} />
      <Route path="/doctor" element={<DoctorProfile />} />
      <Route path="/pharmacy" element={<Pharmacy />} />
      <Route path="/labs" element={<Labs />} />
      <Route path="/labs/all-tests" element={<AllLabTests />} />
      <Route path="/labs/all-packages" element={<AllHealthPackages />} />
      <Route path="/labs/package-details" element={<PackageDetails />} />
      <Route path="/labs/package-details/:id" element={<PackageDetails />} />
      <Route path="/abha" element={<ABHA />} />
      <Route path="/records" element={<Records />} />
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/ambulance" element={<Ambulance />} />
      <Route path="/support" element={<Support />} />
      <Route path="/care-journey" element={<CareJourney />} />

      {/* Doctors Public Flow */}
      <Route path="/doctors" element={<HospitalSelection />} />
      <Route path="/doctors/specialty" element={<SpecialtySelection />} />
      <Route path="/doctors/list" element={<DoctorList />} />
      <Route path="/doctors/visit-type" element={<VisitTypeSelection />} />
      <Route path="/doctors/schedule" element={<ScheduleSelection />} />

      {/* Protected Routes (Require Login for Checkout/Booking Completion/Account) */}
      <Route path="/slot" element={<P><SelectSlot /></P>} />
      <Route path="/review" element={<P><Review /></P>} />
      <Route path="/confirmed" element={<P><Confirmed /></P>} />
      <Route path="/profile" element={<P><Profile /></P>} />
      <Route path="/settings" element={<P><Settings /></P>} />
      <Route path="/notifications" element={<P><Notifications /></P>} />
      <Route path="/my-appointments" element={<P><MyAppointments /></P>} />
      <Route path="/prescriptions" element={<P><Prescriptions /></P>} />
      <Route path="/orders" element={<P><Orders /></P>} />
      <Route path="/payments" element={<P><Payments /></P>} />
      <Route path="/referrals" element={<P><Referrals /></P>} />
      <Route path="/ai-assistant" element={<P><AIAssistant /></P>} />
      <Route path="/doctors/review" element={<P><BookingReview /></P>} />
      <Route path="/doctors/confirmed" element={<P><BookingConfirmed /></P>} />
      <Route path="/about" element={<About />} />
      <Route path="/terms-and-conditions" element={<Terms />} />
      <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
    </Routes>
  );
}
