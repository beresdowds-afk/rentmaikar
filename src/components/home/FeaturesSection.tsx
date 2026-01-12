import { Shield, Clock, MapPin, Headphones, CreditCard, FileCheck } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Vehicles",
    description: "Every vehicle is inspected and meets rideshare platform requirements.",
  },
  {
    icon: Clock,
    title: "Flexible Terms",
    description: "Weekly rentals with no long-term commitment. Upgrade or switch anytime.",
  },
  {
    icon: MapPin,
    title: "GPS Tracking",
    description: "Real-time vehicle tracking for safety and peace of mind.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Round-the-clock customer support via WhatsApp, phone, or email.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "PayPal for USA, Paystack for Nigeria. Automated weekly billing.",
  },
  {
    icon: FileCheck,
    title: "Insurance Included",
    description: "Comprehensive rideshare insurance coverage included with every rental.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Built for Rideshare Success
          </h2>
          <p className="text-primary-foreground/70 max-w-2xl mx-auto">
            Everything you need to succeed as a rideshare driver, backed by our commitment to quality and support.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-primary-foreground/70 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
