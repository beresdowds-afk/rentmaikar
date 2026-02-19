import { Link } from "react-router-dom";
import { MessageCircle, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegion } from "@/contexts/RegionContext";
import { getHeroContent } from "@/lib/localized-content";
import heroCar from "@/assets/hero-car.jpg";

const HeroSection = () => {
  const { country, whatsappNumber, smsNumber } = useRegion();
  const content = getHeroContent(country);

  // Bold the role word ("Drivers" / "Owners") in button text, add "here" as second line
  const renderCTALabel = (text: string) => {
    const commaIdx = text.indexOf(",");
    if (commaIdx === -1) return (
      <span className="flex flex-col items-start leading-tight">
        <span>{text}</span>
        <span className="text-xs font-normal opacity-80 tracking-normal normal-case">here</span>
      </span>
    );
    const boldPart = text.slice(0, commaIdx);
    const rest = text.slice(commaIdx + 1).trim();
    return (
      <span className="flex flex-col items-start leading-tight">
        <span className="font-black text-3xl uppercase tracking-wide">{boldPart}</span>
        <span className="text-sm font-normal opacity-80">{rest} — <em>here</em></span>
      </span>
    );
  };

  return (
    <section className="relative min-h-[90vh] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroCar}
          alt="Premium rental car"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 pt-32">
        <div className="max-w-2xl animate-slide-up">

          {/* Contact Buttons - top of hero content */}
          <div className="flex flex-wrap gap-3 mb-6">
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="w-5 h-5" />
                {content.whatsappCta}
              </Button>
            </a>
            <a href={`sms:${smsNumber}`}>
              <Button variant="sms" size="lg" className="gap-2">
                <Phone className="w-5 h-5" />
                {content.smsCta}
              </Button>
            </a>
          </div>

          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6 backdrop-blur-sm">
            {content.badge}
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
            {content.headline}{" "}
            <span className="text-accent">{content.highlightedWord}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
            {content.description}
          </p>

          {/* CTA Buttons - always show both */}
          <div className="flex flex-wrap gap-4">
            <Link to="/driver/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                {renderCTALabel(content.primaryCta)}
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
            <Link to="/owner/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                {renderCTALabel(content.secondaryCta)}
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-8 h-12 rounded-full border-2 border-white/40 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
