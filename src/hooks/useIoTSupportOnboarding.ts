import { useState, useEffect, useCallback } from "react";

const IOT_SUPPORT_ONBOARDING_KEY = "rentmaikar_iot_support_onboarding_completed";

export const useIoTSupportOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(IOT_SUPPORT_ONBOARDING_KEY);
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
    localStorage.setItem(IOT_SUPPORT_ONBOARDING_KEY, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(IOT_SUPPORT_ONBOARDING_KEY);
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

export default useIoTSupportOnboarding;
