import { useState, useEffect, useCallback } from "react";

const ADMIN_ONBOARDING_STORAGE_KEY = "rentmaikar_admin_onboarding_completed";

export const useAdminOnboardingTour = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ADMIN_ONBOARDING_STORAGE_KEY);
    if (completed === "true") {
      setHasCompleted(true);
      setIsOpen(false);
    } else {
      setHasCompleted(false);
      // Auto-start tour for new admin users after a short delay
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
    localStorage.setItem(ADMIN_ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(ADMIN_ONBOARDING_STORAGE_KEY);
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

export default useAdminOnboardingTour;
