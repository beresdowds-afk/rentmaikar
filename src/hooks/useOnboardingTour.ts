import { useState, useEffect, useCallback } from "react";

const ONBOARDING_STORAGE_KEY = "rentmaikar_onboarding_completed";

export const useOnboardingTour = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (completed === "true") {
      setHasCompleted(true);
      setIsOpen(false);
    } else {
      setHasCompleted(false);
      // Auto-start tour for new users after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
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

export default useOnboardingTour;
