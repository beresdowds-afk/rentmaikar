import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Car, User, Shield, CreditCard, MapPin, Bell, LogIn, Inbox, MessageSquare, FileText, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRegion, type Country } from "@/contexts/RegionContext";
import rentmaikarLogo from "@/assets/rentmaikar-logo.jpg";


interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  icon: React.ElementType;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Rentmaikar! 🚗",
    description: "Your trusted platform for connecting vehicle owners with rideshare drivers across the USA and Nigeria. Let's take a quick tour to help you get started.",
    icon: Car,
    position: "center"
  },
  {
    id: "user-type",
    title: "Choose Your Role",
    description: "Select whether you're a Driver looking to rent a vehicle, or an Owner wanting to list your cars. This helps us personalize your experience.",
    target: "[data-tour='user-type']",
    icon: User,
    position: "top"
  },
  {
    id: "categories",
    title: "Browse Vehicle Categories",
    description: "Explore our three pricing tiers — Budget, Standard, and Premium — each with daily or weekly payment options. Year ranges are shown on every category card and reflect the latest admin configuration.",
    target: "[data-tour='categories']",
    icon: Car,
    position: "top"
  },
  {
    id: "regions",
    title: "Regional Operations",
    description: "We operate in hubs across the USA (DC, Maryland, Virginia) and Nigeria (Lagos, Abuja, Port Harcourt). Switch regions to see local pricing and available features.",
    target: "[data-tour='region']",
    icon: MapPin,
    position: "bottom"
  },
  {
    id: "security",
    title: "IoT-Powered Security",
    description: "Every rental vehicle is equipped with our IoT device for real-time GPS tracking, accident detection, and remote vehicle management capabilities.",
    target: "[data-tour='features']",
    icon: Shield,
    position: "top"
  },
  {
    id: "training",
    title: "Mandatory Driver Training 📚",
    description: "All drivers must complete our online training program before driving. Training is a precondition for group insurance eligibility and must be refreshed every 6 months.",
    icon: FileText,
    position: "center"
  },
  {
    id: "payments",
    title: "Flexible Payment Options",
    description: "Choose between daily or weekly payment plans. We support PayPal in the USA and Paystack (bank transfers) in Nigeria. Payment reminders are sent automatically via SMS, WhatsApp, and email.",
    target: "[data-tour='payments']",
    icon: CreditCard,
    position: "top"
  },
  {
    id: "rent-to-own",
    title: "Rent-to-Own Program 🏠",
    description: "Owners can list vehicles for rent-to-own with country-specific pricing. Drivers can search for listings in their region and work toward vehicle ownership.",
    icon: Home,
    position: "center"
  },
  {
    id: "notifications",
    title: "Multi-Channel Communication 📱",
    description: "Stay connected via WhatsApp, SMS, email, or voice calls. You can set your communication preferences and opt out anytime. All channels are supported in both USA and Nigeria.",
    icon: MessageSquare,
    position: "center"
  },
  {
    id: "unified-inbox",
    title: "Unified Support System 📬",
    description: "Need help? Reach us via email, SMS, WhatsApp, or phone. All your messages are handled through our centralized support system with regional forwarding numbers for quick, local responses.",
    icon: Inbox,
    position: "center"
  },
  {
    id: "policies",
    title: "Terms & Policies",
    description: "During registration, you'll review and accept our Terms of Service (including mandatory training and group insurance), Privacy Policy, and platform-specific agreements. These are versioned and region-specific.",
    icon: FileText,
    position: "center"
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "Start exploring Rentmaikar now. Register as a driver or owner to access your personalized dashboard with vehicle tracking, payment management, inspections, and more.",
    icon: Car,
    position: "center"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  isOpen: boolean;
}

export const OnboardingTour = ({ onComplete, isOpen }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const updateTargetRect = useCallback(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    if (isOpen) {
      updateTargetRect();
      window.addEventListener("resize", updateTargetRect);
      window.addEventListener("scroll", updateTargetRect);
      return () => {
        window.removeEventListener("resize", updateTargetRect);
        window.removeEventListener("scroll", updateTargetRect);
      };
    }
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleLoginClick = () => {
    onComplete();
    navigate("/auth");
  };

  if (!isOpen) return null;

  const getCardPosition = () => {
    if (!targetRect || step.position === "center") {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const padding = 16;
    const cardWidth = 400;
    const cardHeight = 250;

    switch (step.position) {
      case "top":
        return {
          position: "fixed" as const,
          top: Math.max(padding, targetRect.top - cardHeight - padding),
          left: Math.min(
            window.innerWidth - cardWidth - padding,
            Math.max(padding, targetRect.left + targetRect.width / 2 - cardWidth / 2)
          )
        };
      case "bottom":
        return {
          position: "fixed" as const,
          top: Math.min(window.innerHeight - cardHeight - padding, targetRect.bottom + padding),
          left: Math.min(
            window.innerWidth - cardWidth - padding,
            Math.max(padding, targetRect.left + targetRect.width / 2 - cardWidth / 2)
          )
        };
      case "left":
        return {
          position: "fixed" as const,
          top: Math.max(padding, targetRect.top + targetRect.height / 2 - cardHeight / 2),
          left: Math.max(padding, targetRect.left - cardWidth - padding)
        };
      case "right":
        return {
          position: "fixed" as const,
          top: Math.max(padding, targetRect.top + targetRect.height / 2 - cardHeight / 2),
          left: Math.min(window.innerWidth - cardWidth - padding, targetRect.right + padding)
        };
      default:
        return {
          position: "fixed" as const,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        };
    }
  };

  const Icon = step.icon;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleSkip}
      />

      {/* Highlight cutout */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.5)"
          }}
        />
      )}

      {/* Tour Card */}
      <Card
        className={cn(
          "w-[400px] max-w-[calc(100vw-32px)] z-[101] shadow-2xl border-primary/20",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={getCardPosition()}
      >
        {currentStep === 0 && (
          <div className="flex justify-center pt-6 pb-2">
            <img 
              src={rentmaikarLogo} 
              alt="Rentmaikar Logo" 
              className="h-16 w-auto rounded-lg shadow-md"
            />
          </div>
        )}
        <CardHeader className={cn("pb-3", currentStep === 0 && "pt-2")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep !== 0 && (
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <p className="text-muted-foreground">{step.description}</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {tourSteps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between pt-0">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {currentStep === tourSteps.length - 1 ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLoginClick}
                  className="gap-1"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
                <Button size="sm" onClick={handleNext}>
                  Get Started
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
};

export default OnboardingTour;
