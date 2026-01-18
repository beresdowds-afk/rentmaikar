import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Car, User, Shield, CreditCard, MapPin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

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
    description: "Your trusted platform for connecting vehicle owners with rideshare drivers. Let's take a quick tour to help you get started.",
    icon: Car,
    position: "center"
  },
  {
    id: "login",
    title: "Sign In to Rentmaikar",
    description: "Already have an account? Click 'Sign In' to access your personalized dashboard. New users can create an account to get started as a driver or vehicle owner.",
    target: "[data-tour='auth']",
    icon: User,
    position: "bottom"
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
    description: "Explore our three pricing tiers - Budget for economical options, Standard for balanced value, and Premium for luxury vehicles.",
    target: "[data-tour='categories']",
    icon: Car,
    position: "top"
  },
  {
    id: "regions",
    title: "Regional Operations",
    description: "We operate in specific hubs in USA and Nigeria. Use the region switcher to see pricing and features for your location.",
    target: "[data-tour='region']",
    icon: MapPin,
    position: "bottom"
  },
  {
    id: "security",
    title: "IoT-Powered Security",
    description: "Every rental vehicle is equipped with our IoT device for real-time tracking, accident detection, and remote management capabilities.",
    target: "[data-tour='features']",
    icon: Shield,
    position: "top"
  },
  {
    id: "payments",
    title: "Flexible Payment Options",
    description: "Choose between daily or weekly payment plans. We support PayPal in the USA and Paystack (bank transfers) in Nigeria.",
    target: "[data-tour='payments']",
    icon: CreditCard,
    position: "top"
  },
  {
    id: "notifications",
    title: "Stay Informed",
    description: "Receive SMS, WhatsApp, and email notifications for important updates like payment reminders, incident alerts, and account changes.",
    icon: Bell,
    position: "center"
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "Start exploring Rentmaikar now. Register as a driver or owner to access your personalized dashboard with all the tools you need.",
    icon: Car,
    position: "center"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  isOpen: boolean;
}

export const OnboardingTour = ({ onComplete, isOpen }: OnboardingTourProps) => {
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
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
            <Button size="sm" onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
              {currentStep < tourSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
};

export default OnboardingTour;
