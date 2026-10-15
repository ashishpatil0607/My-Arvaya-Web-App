import { createContext, useContext, useState, useEffect, useRef } from "react";
const C = createContext();

export function BookingProvider({ children }) {
  const [doctor, setDoctor] = useState(() => {
    try {
      const saved = sessionStorage.getItem("arvaya_booking_doctor");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [slot, setSlot] = useState(() => {
    return sessionStorage.getItem("arvaya_slot") || "10:30 AM";
  });
  const [bookingId, setBookingId] = useState(() => {
    return sessionStorage.getItem("arvaya_booking_id") || "";
  });
  const [bookingType, setBookingType] = useState(() => {
    return sessionStorage.getItem("arvaya_booking_type") || "doctor";
  });
  
  const [bookingHospital, setBookingHospital] = useState(() => {
    const saved = sessionStorage.getItem("arvaya_booking_hospital");
    try {
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });
  
  const [bookingSpecialty, setBookingSpecialty] = useState(() => {
    return sessionStorage.getItem("arvaya_booking_specialty") || "";
  });
  
  const [bookingVisitType, setBookingVisitType] = useState(() => {
    return sessionStorage.getItem("arvaya_booking_visit_type") || "Initial consultation";
  });

  const [labPackage, setLabPackage] = useState(() => {
    try {
      const saved = sessionStorage.getItem("arvaya_booking_lab");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  const [labVisitType, setLabVisitType] = useState(() => {
    return sessionStorage.getItem("arvaya_lab_visit_type") || "home";
  });

  const [globalLocation, setGlobalLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("arvaya_location");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  useEffect(() => {
    if (doctor) sessionStorage.setItem("arvaya_booking_doctor", JSON.stringify(doctor));
  }, [doctor]);

  useEffect(() => {
    if (labPackage) sessionStorage.setItem("arvaya_booking_lab", JSON.stringify(labPackage));
    else sessionStorage.removeItem("arvaya_booking_lab");
  }, [labPackage]);

  useEffect(() => {
    sessionStorage.setItem("arvaya_lab_visit_type", labVisitType);
  }, [labVisitType]);

  useEffect(() => {
    sessionStorage.setItem("arvaya_booking_type", bookingType);
  }, [bookingType]);
  
  useEffect(() => {
    sessionStorage.setItem("arvaya_slot", slot);
  }, [slot]);
  
  useEffect(() => {
    if (bookingHospital) sessionStorage.setItem("arvaya_booking_hospital", JSON.stringify(bookingHospital));
    else sessionStorage.removeItem("arvaya_booking_hospital");
  }, [bookingHospital]);

  useEffect(() => {
    sessionStorage.setItem("arvaya_booking_specialty", bookingSpecialty);
  }, [bookingSpecialty]);

  useEffect(() => {
    sessionStorage.setItem("arvaya_booking_visit_type", bookingVisitType);
  }, [bookingVisitType]);

  useEffect(() => {
    if (bookingId) sessionStorage.setItem("arvaya_booking_id", bookingId);
    else sessionStorage.removeItem("arvaya_booking_id");
  }, [bookingId]);

  const initialLocationMount = useRef(true);
  useEffect(() => {
    if (globalLocation) {
      localStorage.setItem("arvaya_location", JSON.stringify(globalLocation));
    } else {
      localStorage.removeItem("arvaya_location");
    }

    if (!initialLocationMount.current) {
      // If location changes after mount, clear any in-progress booking state
      setBookingHospital(null);
      setBookingSpecialty("");
      setDoctor(null);
    }
    initialLocationMount.current = false;
  }, [globalLocation]);

  const clearBooking = () => {
    setDoctor(null);
    setBookingHospital(null);
    setBookingSpecialty("");
    setBookingVisitType("Initial consultation");
    setLabPackage(null);
    setLabVisitType("home");
    setBookingId("");
    sessionStorage.removeItem("arvaya_booking_id");
    sessionStorage.removeItem("arvaya_booking_doctor");
    sessionStorage.removeItem("arvaya_booking_hospital");
    sessionStorage.removeItem("arvaya_booking_specialty");
    sessionStorage.removeItem("arvaya_booking_visit_type");
    sessionStorage.removeItem("arvaya_booking_lab");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow);
    setSlot("10:30 AM");
    sessionStorage.removeItem("arvaya_slot");
  };

  return (
    <C.Provider
      value={{
        doctor,
        setDoctor,
        date,
        setDate,
        slot,
        setSlot,
        bookingId,
        setBookingId,
        bookingType, setBookingType,
        bookingHospital, setBookingHospital,
        bookingSpecialty, setBookingSpecialty,
        bookingVisitType,
        setBookingVisitType,
        labPackage,
        setLabPackage,
        labVisitType,
        setLabVisitType,
        globalLocation,
        setGlobalLocation,
        clearBooking
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useBooking = () => useContext(C);
