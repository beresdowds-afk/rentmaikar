import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import PricingHintBanner from "@/components/home/PricingHintBanner";
import CategoryCards from "@/components/home/CategoryCards";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import OwnerBenefitsSection from "@/components/home/OwnerBenefitsSection";
import UserTypeSelector from "@/components/home/UserTypeSelector";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { useUserType } from "@/contexts/UserTypeContext";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { useAuth } from "@/contexts/AuthContext";
import { homeForRole, type AppRole } from "@/lib/role-home";

const Index = () => {
  const { hasSelectedType } = useUserType();
  const { isOpen, completeTour, resetTour } = useOnboardingTour();
  const navigate = useNavigate();
  const { user, userRole, isLoading, isRoleLoading } = useAuth();

  // Returning verified users landing on `/` are forwarded straight to their
  // role dashboard — the landing page is for guests only.

useEffect(() => {
    if (isLoading || isRoleLoading) return;

    if (!user || !userRole) return;

    const target = homeForRole(userRole, "/");

    if (target !== "/") {
        navigate(target, { replace: true });
    }
}, [
    isLoading,
    isRoleLoading,
    user,
    userRole,
    navigate,
]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header hidden on home — hero has its own embedded nav */}
      <main className={!hasSelectedType ? "pb-24" : ""}>
        <HeroSection />
        <PricingHintBanner />
        <div data-tour="categories">
          <CategoryCards />
        </div>
        <OwnerBenefitsSection />
        <HowItWorks />
        <div data-tour="features">
          <FeaturesSection />
        </div>
        <TestimonialsSection />
        <div data-tour="payments">
          <CTASection />
        </div>
      </main>
      <Footer />
      {/* Show user type selector if not selected */}
      {!hasSelectedType && (
        <div data-tour="user-type">
          <UserTypeSelector />
        </div>
      )}
      {/* Onboarding Tour */}
      <OnboardingTour isOpen={isOpen} onComplete={completeTour} />
    </div>
  );
};

export default Index;
