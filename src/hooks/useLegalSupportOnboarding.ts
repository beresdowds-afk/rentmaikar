import { useState, useEffect, useCallback } from "react";

const LEGAL_SUPPORT_ONBOARDING_KEY = "rentmaikar_legal_support_onboarding_completed";

export const useLegalSupportOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(LEGAL_SUPPORT_ONBOARDING_KEY);
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
    localStorage.setItem(LEGAL_SUPPORT_ONBOARDING_KEY, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(LEGAL_SUPPORT_ONBOARDING_KEY);
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

export default useLegalSupportOnboarding;
