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

const Index = () => {
  const { hasSelectedType } = useUserType();
  const { isOpen, completeTour, resetTour } = useOnboardingTour();

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
