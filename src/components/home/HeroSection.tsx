import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Phone, ArrowRight, X, LayoutDashboard, LogIn, LogOut, User, Building, Shield } from "lucide-react";
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
      {/* Canva embed wrapper — overflow visible so dropdown isn't clipped */}
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
        {/* iframe — clipped independently */}
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

        {/* ════════════════════════════════
            TRANSPARENT HOTSPOT OVERLAY
            Children opt in with pointerEvents auto
            ════════════════════════════════ */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Logo — top-left */}
          <Link
            to="/"
            aria-label="Rentmaikar Home"
            style={{
              position: "absolute",
              top: "2%",
              left: "2%",
              width: "22%",
              height: "8%",
              pointerEvents: "auto",
              borderRadius: 6,
              /* debug: outline: "2px solid red", */
            }}
          />

          {/* Hamburger / menu — top-right */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              position: "absolute",
              top: "2%",
              right: "2%",
              width: "10%",
              height: "7%",
              pointerEvents: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
            }}
          />

          {/* DRIVERS CTA — lower-left */}
          <Link
            to="/driver/register"
            aria-label="Drivers register here"
            style={{
              position: "absolute",
              bottom: "12%",
              left: "5%",
              width: "38%",
              height: "10%",
              pointerEvents: "auto",
              borderRadius: 8,
            }}
          />

          {/* OWNERS CTA — lower-right */}
          <Link
            to="/owner/register"
            aria-label="Owners list your car here"
            style={{
              position: "absolute",
              bottom: "12%",
              right: "5%",
              width: "38%",
              height: "10%",
              pointerEvents: "auto",
              borderRadius: 8,
            }}
          />

          {/* WhatsApp — mid-left */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Us"
            style={{
              position: "absolute",
              bottom: "24%",
              left: "5%",
              width: "40%",
              height: "8%",
              pointerEvents: "auto",
              borderRadius: 8,
            }}
          />

          {/* SMS / Text — mid-right */}
          <a
            href={`sms:${SMS_NUMBER}`}
            aria-label="Text Us"
            style={{
              position: "absolute",
              bottom: "24%",
              right: "5%",
              width: "40%",
              height: "8%",
              pointerEvents: "auto",
              borderRadius: 8,
            }}
          />
        </div>

        {/* Dropdown menu — rendered at z-50 so it appears above everything */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "10%",
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

            <Link to="/" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              Home
            </Link>
            <Link to="/catalogue/budget" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              Budget Cars
            </Link>
            <Link to="/catalogue/standard" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              Standard Cars
            </Link>
            <Link to="/catalogue/premium" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              Premium Cars
            </Link>

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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleSignOut}
                  >
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

      {/* ── Below-embed interactive CTA row ── */}
      <div className="bg-background py-6 px-4">
        <div className="container mx-auto flex flex-col items-center gap-4">
          {/* Contact buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="w-5 h-5" /> WhatsApp Us
              </Button>
            </a>
            <a href={`sms:${SMS_NUMBER}`}>
              <Button variant="sms" size="lg" className="gap-2">
                <Phone className="w-5 h-5" /> Text Us
              </Button>
            </a>
          </div>

          {/* Main CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/driver/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-black text-3xl uppercase tracking-wide">Drivers</span>
                  <span className="text-sm font-normal opacity-80">
                    register — <em>here</em>
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
            <Link to="/owner/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-black text-3xl uppercase tracking-wide">Owners</span>
                  <span className="text-sm font-normal opacity-80">
                    list your car — <em>here</em>
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
