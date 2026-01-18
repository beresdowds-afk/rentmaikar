import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Car, User, Building, Shield, LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RegionSwitcher from "@/components/home/RegionSwitcher";
import { useUserType } from "@/contexts/UserTypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userType } = useUserType();
  const { user, userRole, signOut, isLoading } = useAuth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/catalogue/budget", label: "Budget Cars" },
    { href: "/catalogue/standard", label: "Standard Cars" },
    { href: "/catalogue/premium", label: "Premium Cars" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin';
    if (userRole === 'owner') return '/owner/dashboard';
    if (userRole === 'driver') return '/driver/dashboard';
    // Fallback based on userType context
    return userType === 'driver' ? '/driver/dashboard' : '/owner/dashboard';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-primary">
              Rent<span className="text-accent">maikar</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <RegionSwitcher />
            
            {!isLoading && user ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    My Dashboard
                  </Button>
                </Link>
                {userRole === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" size="icon">
                      <Shield className="w-5 h-5" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                {userType === 'driver' ? (
                  <Link to="/driver/register">
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      Driver Sign Up
                    </Button>
                  </Link>
                ) : (
                  <Link to="/owner/register">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Building className="w-4 h-4" />
                      List Your Car
                    </Button>
                  </Link>
                )}
                <Link to="/auth">
                  <Button variant="default" size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-slide-up">
            <nav className="flex flex-col gap-2">
              {/* Region Switcher for Mobile */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-border mb-2 pb-4">
                <span className="text-sm text-muted-foreground">Region</span>
                <RegionSwitcher />
              </div>
              
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
                {!isLoading && user ? (
                  <>
                    <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        My Dashboard
                      </Button>
                    </Link>
                    {userRole === 'admin' && (
                      <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" className="w-full gap-2">
                          <Shield className="w-4 h-4" />
                          Admin Portal
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" className="w-full gap-2" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    {userType === 'driver' ? (
                      <Link to="/driver/register" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full gap-2">
                          <User className="w-4 h-4" />
                          Driver Sign Up
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/owner/register" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full gap-2">
                          <Building className="w-4 h-4" />
                          List Your Car
                        </Button>
                      </Link>
                    )}
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
      </div>
    </header>
  );
};

export default Header;
