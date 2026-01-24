import { useState, useEffect, useCallback } from "react";

const VEHICLE_SUPPORT_ONBOARDING_KEY = "rentmaikar_vehicle_support_onboarding_completed";

export const useVehicleSupportOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(VEHICLE_SUPPORT_ONBOARDING_KEY);
    if (completed === "true") {
      setHasCompleted(true);
      setIsOpen(false);
    } else {
      setHasCompleted(false);
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    localStorage.setItem(VEHICLE_SUPPORT_ONBOARDING_KEY, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(VEHICLE_SUPPORT_ONBOARDING_KEY);
    setHasCompleted(false);
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    hasCompleted,
    startTour,
    completeTour,
    resetTour
  };
};

export default useVehicleSupportOnboarding;
