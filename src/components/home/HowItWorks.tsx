import { UserPlus, Search, CreditCard, Car } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up",
    description: "Create your driver account with valid ID and rideshare platform approval.",
  },
  {
    icon: Search,
    title: "Browse Vehicles",
    description: "Explore our curated selection of rideshare-ready vehicles in your area.",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "Pay securely via PayPal (USA) or Paystack (Nigeria). Weekly billing made easy.",
  },
  {
    icon: Car,
    title: "Start Driving",
    description: "Pick up your vehicle and start earning with Uber, Lyft, Bolt, or InDrive.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get on the road in four simple steps. Our streamlined process gets you driving faster.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative text-center group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              
              {/* Step Number */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-card shadow-card group-hover:shadow-card-hover transition-shadow mb-6">
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <step.icon className="w-10 h-10 text-primary" />
              </div>

              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
