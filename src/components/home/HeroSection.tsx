import { Link } from "react-router-dom";
import { MessageCircle, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroCar from "@/assets/hero-car.jpg";

const HeroSection = () => {
  const whatsappNumber = "12025550123";
  const smsNumber = "12025550123";

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
          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6 backdrop-blur-sm">
            USA 🇺🇸 & Nigeria 🇳🇬
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
            Rent Quality Vehicles for{" "}
            <span className="text-accent">Rideshare</span> Success
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
            Connect with trusted vehicle owners. Drive for Uber, Lyft, Bolt & more. 
            Flexible weekly rentals starting from $250/week.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Link to="/driver/register">
              <Button variant="hero" size="xl" className="gap-2">
                Start Driving Today
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/owner/register">
              <Button variant="heroOutline" size="xl">
                List Your Vehicle
              </Button>
            </Link>
          </div>

          {/* Contact Buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="w-5 h-5" />
                WhatsApp Us
              </Button>
            </a>
            <a href={`sms:${smsNumber}`}>
              <Button variant="sms" size="lg" className="gap-2">
                <Phone className="w-5 h-5" />
                Send SMS
              </Button>
            </a>
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
