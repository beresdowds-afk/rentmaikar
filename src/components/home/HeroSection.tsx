import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageCircle, Phone, ArrowRight, X,
  LayoutDashboard, LogIn, LogOut, User, Building, Shield, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "124078589931";
const SMS_NUMBER = "124078589931";

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, userRole, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
    setMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "owner") return "/owner/dashboard";
    if (userRole === "driver") return "/driver/dashboard";
    return "/driver/dashboard";
  };

  return (
    <section className="relative w-full">
      {/* Outer wrapper — overflow visible so dropdown escapes the clip */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 0,
          paddingTop: "96.817%",
          paddingBottom: 0,
          boxShadow: "0 2px 8px 0 rgba(63,69,81,0.16)",
          overflow: "visible",
          borderRadius: 8,
          willChange: "transform",
          marginTop: "1.6em",
          marginBottom: "0.9em",
        }}
      >
        {/* iframe clipped to its own box */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: 8,
          }}
        >
          <iframe
            loading="lazy"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              border: "none",
              padding: 0,
              margin: 0,
            }}
            src="https://www.canva.com/design/DAHB0MhNQG8/tgr0P0y88bZBexcV50g1GA/watch?embed"
            allowFullScreen
            allow="fullscreen"
            title="Rentmaikar Hero"
          />
        </div>

        {/* ═══════════════════════════════════════════
            OVERLAY LAYER — actual visible elements
            ═══════════════════════════════════════════ */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* ── Logo hotspot — top-left, transparent over Canva logo ── */}
          <Link
            to="/"
            aria-label="Rentmaikar Home"
            style={{
              position: "absolute",
              top: "22%",
              left: "13%",
              width: "60%",
              height: "9%",
              pointerEvents: "auto",
              borderRadius: 6,
            }}
          />

          {/* ── Menu button — top-right ── */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              position: "absolute",
              top: "23%",
              right: "4%",
              pointerEvents: "auto",
              cursor: "pointer",
              borderRadius: 8,
            }}
            className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border px-3 py-2 shadow-md hover:bg-muted"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-xs font-semibold">Menu</span>
          </button>

          {/* ── DRIVERS CTA — left card, upper-middle ── */}
          <Link
            to="/driver/register"
            aria-label="Drivers register here"
            style={{
              position: "absolute",
              top: "36%",
              left: "13%",
              width: "38%",
              pointerEvents: "auto",
            }}
          >
            <Button variant="heroCTAGreen" className="w-full gap-2 py-4 shadow-lg">
              <span className="flex flex-col items-start leading-tight">
                <span className="font-black text-xl uppercase tracking-wide">Drivers</span>
                <span className="text-xs font-normal opacity-80">Register here</span>
              </span>
              <ArrowRight className="w-4 h-4 flex-shrink-0 ml-auto" />
            </Button>
          </Link>

          {/* ── OWNERS CTA — right card, upper-middle ── */}
          <Link
            to="/owner/register"
            aria-label="Owners list your cars here"
            style={{
              position: "absolute",
              top: "36%",
              right: "13%",
              width: "38%",
              pointerEvents: "auto",
            }}
          >
            <Button variant="heroCTAGreen" className="w-full gap-2 py-4 shadow-lg">
              <span className="flex flex-col items-start leading-tight">
                <span className="font-black text-xl uppercase tracking-wide">Owners</span>
                <span className="text-xs font-normal opacity-80">List your cars here</span>
              </span>
              <ArrowRight className="w-4 h-4 flex-shrink-0 ml-auto" />
            </Button>
          </Link>

          {/* ── WhatsApp button — left, below CTAs ── */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Us"
            style={{
              position: "absolute",
              top: "60%",
              left: "13%",
              pointerEvents: "auto",
            }}
          >
            <Button variant="whatsapp" size="sm" className="gap-1.5 shadow-lg">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </a>

          {/* ── SMS / Text Us button — right, below CTAs ── */}
          <a
            href={`sms:${SMS_NUMBER}`}
            aria-label="Text Us"
            style={{
              position: "absolute",
              top: "60%",
              right: "13%",
              pointerEvents: "auto",
            }}
          >
            <Button variant="sms" size="sm" className="gap-1.5 shadow-lg">
              <Phone className="w-4 h-4" />
              Text us
            </Button>
          </a>
        </div>

        {/* ── Dropdown menu (no animation, instant) ── */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "9%",
              right: "2%",
              zIndex: 200,
              pointerEvents: "auto",
            }}
            className="bg-background border border-border rounded-xl shadow-2xl p-4 min-w-[220px] flex flex-col gap-2"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm text-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Link to="/" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">Home</Link>
            <Link to="/catalogue/budget" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">Budget Cars</Link>
            <Link to="/catalogue/standard" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">Standard Cars</Link>
            <Link to="/catalogue/premium" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">Premium Cars</Link>

            <div className="border-t border-border pt-2 mt-1 flex flex-col gap-2">
              {!isLoading && user ? (
                <>
                  <Link to={getDashboardLink()} onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <LayoutDashboard className="w-4 h-4" /> My Dashboard
                    </Button>
                  </Link>
                  {userRole === "admin" && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full gap-2">
                        <Shield className="w-4 h-4" /> Admin Portal
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" className="w-full gap-2" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/driver/register" onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <User className="w-4 h-4" /> Driver Sign Up
                    </Button>
                  </Link>
                  <Link to="/owner/register" onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Building className="w-4 h-4" /> List Your Car
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMenuOpen(false)}>
                    <Button variant="default" size="sm" className="w-full gap-2">
                      <LogIn className="w-4 h-4" /> Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
