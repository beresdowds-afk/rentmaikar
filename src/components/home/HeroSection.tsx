import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Phone, Menu, X, LayoutDashboard, LogOut, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserType } from "@/contexts/UserTypeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import rentmaikarLogo from "@/assets/rentmaikar-logo.jpg";
import rentmaikarHeroBanner from "@/assets/rentmaikar-hero-banner.jpg";
import heroCar from "@/assets/hero-car.jpg";

const HeroSection = () => {
  const { whatsappNumber, smsNumber } = useRegion();
  const { user, userRole, signOut, isLoading } = useAuth();
  const { userType } = useUserType();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/catalogue/budget", label: "Budget Cars" },
    { href: "/catalogue/standard", label: "Standard Cars" },
    { href: "/catalogue/premium", label: "Premium Cars" },
    { href: "/faq", label: "FAQ" },
  ];

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "owner") return "/owner/dashboard";
    if (userRole === "driver") return "/driver/dashboard";
    return userType === "driver" ? "/driver/dashboard" : "/owner/dashboard";
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroCar}
          alt="Premium rental car"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* ── Top Bar: Logo + Hamburger ── */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
        <Link to="/">
          <img
            src={rentmaikarLogo}
            alt="Rentmaikar"
            className="h-14 md:h-16 w-auto object-contain drop-shadow-lg"
          />
        </Link>

        {/* Banner between logo and menu */}
        <div className="flex-1 flex justify-center px-3 min-w-0">
          <img
            src={rentmaikarHeroBanner}
            alt="Rent Mai Kar"
            className="h-12 md:h-16 w-auto max-w-[220px] md:max-w-[300px] object-contain drop-shadow-lg"
          />
        </div>

        <button
          className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <Menu className="w-7 h-7 text-white" />
          )}
        </button>
      </div>

      {/* ── Slide-down Menu ── */}
      {isMenuOpen && (
        <div className="relative z-20 mx-4 mt-1 rounded-xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/20 animate-slide-up overflow-hidden">
          <nav className="flex flex-col p-4 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 rounded-lg font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              {!isLoading && user ? (
                <>
                  <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      My Dashboard
                    </Button>
                  </Link>
                  {userRole === "admin" && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full gap-2">
                        <Shield className="w-4 h-4" />
                        Admin Portal
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/driver/register" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="heroCTAGreen" className="w-full">
                      Driver Sign Up
                    </Button>
                  </Link>
                  <Link to="/owner/register" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      List Your Car
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="default" className="w-full gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── Main Hero Content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-8 gap-8">

        {/* DRIVERS & OWNERS CTAs */}
        <div className="flex flex-row gap-4 justify-center">
          {/* DRIVERS */}
          <Link to="/driver/register" className="flex-1 max-w-[220px]">
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[hsl(142_72%_38%)] hover:bg-[hsl(142_72%_32%)] transition-colors shadow-xl cursor-pointer py-5 px-4 text-white">
              <span className="font-black text-4xl md:text-5xl uppercase tracking-wide leading-none">
                DRIVERS
              </span>
              <span className="text-sm font-medium opacity-90 mt-1">Register here</span>
            </div>
          </Link>

          {/* OWNERS */}
          <Link to="/owner/register" className="flex-1 max-w-[220px]">
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors shadow-xl cursor-pointer py-5 px-4 text-white border border-white/30">
              <span className="font-black text-4xl md:text-5xl uppercase tracking-wide leading-none">
                OWNERS
              </span>
              <span className="text-sm font-medium opacity-90 mt-1">List your cars here</span>
            </div>
          </Link>
        </div>

        {/* Tagline */}
        <div className="text-center px-4">
          <p className="text-xl md:text-2xl font-bold text-white leading-snug drop-shadow-lg">
            "Your Journey, Our Wheels –{" "}
            <span className="text-accent">Rent or List</span> with Confidence on Rentmaikar."
          </p>
        </div>

        {/* Contact Buttons */}
        <div className="flex flex-row gap-4 justify-center">
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 max-w-[200px]"
          >
            <Button variant="whatsapp" size="lg" className="w-full gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </Button>
          </a>
          <a href={`sms:${smsNumber}`} className="flex-1 max-w-[200px]">
            <Button variant="sms" size="lg" className="w-full gap-2">
              <Phone className="w-5 h-5" />
              Text us
            </Button>
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="relative z-10 flex justify-center pb-6 animate-bounce">
        <div className="w-8 h-12 rounded-full border-2 border-white/40 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
