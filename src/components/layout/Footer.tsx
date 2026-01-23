import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Code, FileText, Shield, HelpCircle } from "lucide-react";
import rentmaikarLogo from "@/assets/rentmaikar-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";

const Footer = () => {
  const { userRole } = useAuth();
  
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="block">
              <img 
                src={rentmaikarLogo} 
                alt="Rentmaikar" 
                className="h-12 w-auto object-contain bg-white rounded-lg p-1"
              />
            </Link>
            <p className="text-primary-foreground/70 text-sm">
              Connecting rideshare drivers with quality vehicles across the USA and Nigeria.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalogue/budget" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Budget Cars (2015-2016)
                </Link>
              </li>
              <li>
                <Link to="/catalogue/standard" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Standard Cars (2017-2020)
                </Link>
              </li>
              <li>
                <Link to="/catalogue/premium" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Premium Cars (2021-2025)
                </Link>
              </li>
              <li>
                <Link to="/driver/register" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Driver Registration
                </Link>
              </li>
              <li>
                <Link to="/owner/register" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  List Your Vehicle
                </Link>
              </li>
              {userRole === 'admin' && (
                <li>
                  <Link to="/api-docs" className="text-primary-foreground/70 hover:text-accent transition-colors flex items-center gap-1">
                    <Code className="w-3 h-3" />
                    API Documentation
                  </Link>
                </li>
              )}
              <li>
                <Link to="/terms" className="text-primary-foreground/70 hover:text-accent transition-colors flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-primary-foreground/70 hover:text-accent transition-colors flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-primary-foreground/70 hover:text-accent transition-colors flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h4 className="font-display font-semibold mb-4">Locations</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Washington DC, USA
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Maryland, USA
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Virginia, USA
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lagos, Nigeria
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Abuja, Nigeria
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Port Harcourt, Nigeria
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                support@rentmaikar.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +1 (240) 393-0081
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +234 803 555 0123
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Rentmaikar. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
