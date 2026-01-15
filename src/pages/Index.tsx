import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoryCards from "@/components/home/CategoryCards";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import OwnerBenefitsSection from "@/components/home/OwnerBenefitsSection";
import UserTypeSelector from "@/components/home/UserTypeSelector";
import { useUserType } from "@/contexts/UserTypeContext";

const Index = () => {
  const { hasSelectedType } = useUserType();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className={!hasSelectedType ? "pb-24" : ""}>
        <HeroSection />
        <CategoryCards />
        <OwnerBenefitsSection />
        <HowItWorks />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
      {/* Show user type selector if not selected */}
      {!hasSelectedType && <UserTypeSelector />}
    </div>
  );
};

export default Index;
