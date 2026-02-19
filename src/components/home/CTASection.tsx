import { Link } from "react-router-dom";
import { ArrowRight, Building, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegion } from "@/contexts/RegionContext";
import { getCTAContent } from "@/lib/localized-content";

const CTASection = () => {
  const { country } = useRegion();
  const content = getCTAContent(country);

  // Bold the first word ("Drivers" / "Owners") in button text
  const renderCTALabel = (text: string) => {
    const spaceIdx = text.indexOf(",");
    if (spaceIdx === -1) return text;
    const boldPart = text.slice(0, spaceIdx);
    const rest = text.slice(spaceIdx);
    return <><span className="font-black">{boldPart}</span>{rest}</>;
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Driver CTA */}
          <div className="relative p-8 md:p-12 rounded-2xl bg-gradient-hero text-white overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                <User className="w-7 h-7" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                {content.driver.title}
              </h3>
              <p className="text-white/80 mb-6 max-w-md">
                {content.driver.description}
              </p>
              
              <Link to="/driver/register">
                <Button variant="heroOutline" size="lg" className="gap-2 group-hover:bg-white group-hover:text-primary transition-colors">
                  {renderCTALabel(content.driver.cta)}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Owner CTA */}
          <div className="relative p-8 md:p-12 rounded-2xl bg-card border-2 border-accent/30 overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Building className="w-7 h-7 text-accent" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                {content.owner.title}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {content.owner.description}
              </p>
              
              <Link to="/owner/register">
                <Button variant="hero" size="lg" className="gap-2">
                  {renderCTALabel(content.owner.cta)}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
