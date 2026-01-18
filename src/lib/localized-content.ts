import { Country } from "@/contexts/RegionContext";

export interface HeroContent {
  badge: string;
  headline: string;
  highlightedWord: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  whatsappCta: string;
  smsCta: string;
}

export interface CategoryContent {
  sectionBadge: string;
  sectionTitle: string;
  sectionDescription: string;
  budget: {
    title: string;
    description: string;
    priceLabel: string;
  };
  standard: {
    title: string;
    description: string;
    priceLabel: string;
  };
  premium: {
    title: string;
    description: string;
    priceLabel: string;
  };
  viewCta: string;
}

export interface HowItWorksContent {
  sectionBadge: string;
  sectionTitle: string;
  sectionDescription: string;
  steps: {
    title: string;
    description: string;
  }[];
}

export interface FeaturesContent {
  sectionBadge: string;
  sectionTitle: string;
  sectionDescription: string;
  features: {
    title: string;
    description: string;
  }[];
}

export interface CTAContent {
  driver: {
    title: string;
    description: string;
    cta: string;
  };
  owner: {
    title: string;
    description: string;
    cta: string;
  };
}

export interface TestimonialContent {
  sectionTitle: string;
  testimonials: {
    name: string;
    location: string;
    platform: string;
    quote: string;
    earning?: string;
  }[];
}

// ============================================
// USA CONTENT - Direct, Efficiency-Focused
// ============================================

const usaHeroContent: HeroContent = {
  badge: "USA 🇺🇸 Rideshare Rentals",
  headline: "Get the Right Car.",
  highlightedWord: "Maximize Your Earnings",
  description: "Drive more, earn more with a weekly rental that works for you. Browse rideshare-ready cars from trusted owners and get on the road fast.",
  primaryCta: "Find My Car",
  secondaryCta: "Earn From Your Car",
  whatsappCta: "Chat with Us",
  smsCta: "Text Us",
};

const usaCategoryContent: CategoryContent = {
  sectionBadge: "Vehicle Tiers",
  sectionTitle: "Choose Your Path to Higher Earnings",
  sectionDescription: "Select the vehicle tier that matches your goals. Every car is rideshare-ready and designed to help you succeed.",
  budget: {
    title: "The Smart Start",
    description: "Get started without big upfront costs. Reliable, fuel-efficient cars that let you keep more of your weekly earnings.",
    priceLabel: "Up to $250",
  },
  standard: {
    title: "The Earnings Optimizer",
    description: "Boost your ratings and unlock better ride requests. Modern comforts and reliability that passengers love.",
    priceLabel: "Up to $300",
  },
  premium: {
    title: "The Top Earner",
    description: "Command higher rates with Uber Comfort and Lyft Lux. Drive the latest models to attract premium rides and maximize your income.",
    priceLabel: "Up to $350",
  },
  viewCta: "See Cars",
};

const usaHowItWorksContent: HowItWorksContent = {
  sectionBadge: "Quick Start",
  sectionTitle: "Get on the Road in Days, Not Weeks",
  sectionDescription: "Our streamlined process eliminates the barriers between you and your next paycheck.",
  steps: [
    {
      title: "Sign Up in Minutes",
      description: "Quick driver verification with your rideshare approval and valid ID.",
    },
    {
      title: "Match with Your Perfect Car",
      description: "Browse our curated selection and find the vehicle that fits your earning goals.",
    },
    {
      title: "Approve Your Easy Weekly Plan",
      description: "Secure weekly payments via PayPal. Transparent pricing, no hidden fees.",
    },
    {
      title: "Pick Up & Start Earning",
      description: "Get your keys and hit the road. Start accepting rides immediately.",
    },
  ],
};

const usaFeaturesContent: FeaturesContent = {
  sectionBadge: "Your Competitive Edge",
  sectionTitle: "Everything You Need to Succeed",
  sectionDescription: "We've eliminated the friction so you can focus on what matters: maximizing your earnings.",
  features: [
    {
      title: "Verified & Rideshare-Ready",
      description: "Every vehicle meets Uber and Lyft requirements. No surprises, just approvals.",
    },
    {
      title: "Flexible Weekly Terms",
      description: "No long-term contracts. Upgrade, switch, or pause whenever life changes.",
    },
    {
      title: "Real-Time GPS Tracking",
      description: "Advanced tracking for safety, plus valuable insights to optimize your routes.",
    },
    {
      title: "24/7 Premium Support",
      description: "Round-the-clock assistance via WhatsApp, phone, or email. We're always here.",
    },
    {
      title: "Secure PayPal Payments",
      description: "Automated weekly billing through PayPal. Predictable, simple, protected.",
    },
    {
      title: "Full Insurance Coverage",
      description: "Comprehensive rideshare insurance included. Drive with complete peace of mind.",
    },
  ],
};

const usaCTAContent: CTAContent = {
  driver: {
    title: "Ready to Maximize Your Earnings?",
    description: "Join thousands of drivers who've unlocked their earning potential. Fast approval, flexible terms, and support when you need it.",
    cta: "Find My Car Now",
  },
  owner: {
    title: "Turn Your Vehicle into Income",
    description: "List your car and earn passive income. We handle driver screening, weekly payments, and all support.",
    cta: "Start Earning",
  },
};

const usaTestimonialContent: TestimonialContent = {
  sectionTitle: "What Drivers Are Saying",
  testimonials: [
    {
      name: "Marcus D.",
      location: "Washington DC",
      platform: "Uber/Lyft Driver",
      quote: "Thanks to this platform, I went from a used sedan to a premium SUV and increased my weekly earnings by 40%.",
      earning: "+40% weekly",
    },
    {
      name: "Sarah L.",
      location: "Virginia",
      platform: "Lyft Driver",
      quote: "The weekly rental lets me drive when I want, and their support team actually fixes issues fast.",
    },
    {
      name: "James R.",
      location: "Maryland",
      platform: "Uber Driver",
      quote: "Easy sign-up, clear pricing, and a car that passengers love. Best decision I made for my rideshare business.",
    },
  ],
};

// ============================================
// NIGERIA CONTENT - Community, Trust-Focused
// ============================================

const nigeriaHeroContent: HeroContent = {
  badge: "Nigeria 🇳🇬 Ride-Hailing Rentals",
  headline: "Get Your Ride.",
  highlightedWord: "Grow Your Income",
  description: "Join a community of smart drivers. Connect with verified vehicle owners and start earning with Bolt, Uber, and InDrive today.",
  primaryCta: "Find My Car",
  secondaryCta: "Earn From Your Car",
  whatsappCta: "Chat on WhatsApp",
  smsCta: "Send SMS",
};

const nigeriaCategoryContent: CategoryContent = {
  sectionBadge: "Vehicle Categories",
  sectionTitle: "Choose Your Path to Success",
  sectionDescription: "Select wisely, earn more. Every car is verified and ready for ride-hailing platforms.",
  budget: {
    title: "The Smart Start",
    description: "Perfect for wise starters. Keep your costs low and your profits high with these reliable, fuel-saving champions.",
    priceLabel: "Up to ₦60,000",
  },
  standard: {
    title: "The Profit Builder",
    description: "Boost your ratings and attract better rides. Modern comfort that passengers appreciate and reward with tips.",
    priceLabel: "Up to ₦73,000",
  },
  premium: {
    title: "The Top Earner",
    description: "Command premium fares and VIP rides. Drive the latest models that passengers request by name.",
    priceLabel: "Up to ₦93,000",
  },
  viewCta: "View Cars",
};

const nigeriaHowItWorksContent: HowItWorksContent = {
  sectionBadge: "Your Roadmap",
  sectionTitle: "Simple, Fast & Secure",
  sectionDescription: "We understand the hustle. Our process is designed to get you earning quickly and safely.",
  steps: [
    {
      title: "Sign Up in Minutes",
      description: "Register with your valid ID and ride-hailing platform approval. Quick verification.",
    },
    {
      title: "Choose Your Perfect Match",
      description: "Browse verified cars from trusted owners in Lagos, Abuja, or Port Harcourt.",
    },
    {
      title: "Secure Your Ride",
      description: "Easy weekly payments via Paystack. Secure, transparent, no wahala.",
    },
    {
      title: "Pick Up & Start Earning",
      description: "Get your keys and join the community of successful drivers on our platform.",
    },
  ],
};

const nigeriaFeaturesContent: FeaturesContent = {
  sectionBadge: "Why Drivers Trust Us",
  sectionTitle: "Built for Your Success",
  sectionDescription: "We understand the Nigerian driver's journey. Every feature is designed with your growth in mind.",
  features: [
    {
      title: "Verified Owners & Vehicles",
      description: "All owners and vehicles are thoroughly verified. Drive with peace of mind.",
    },
    {
      title: "Flexible Weekly Terms",
      description: "No long wahala. Weekly rentals with the freedom to upgrade or switch anytime.",
    },
    {
      title: "Real-Time GPS Tracking",
      description: "Advanced tracking for your safety. Navigate Lagos traffic with confidence.",
    },
    {
      title: "24/7 WhatsApp Support",
      description: "Our team is always available. Send a message anytime, get help immediately.",
    },
    {
      title: "Secure Paystack Payments",
      description: "Automated weekly billing through Paystack. Your money is protected.",
    },
    {
      title: "Full Insurance Coverage",
      description: "Comprehensive coverage included. Focus on earning, we handle the rest.",
    },
  ],
};

const nigeriaCTAContent: CTAContent = {
  driver: {
    title: "Ready to Join the Community?",
    description: "Join thousands of Nigerian drivers who are growing their income with verified vehicles. We're here to support your success.",
    cta: "Get Started Now",
  },
  owner: {
    title: "Let Your Car Work for You",
    description: "List your vehicle and earn steady income. We handle driver verification, secure payments, and full support.",
    cta: "List Your Car",
  },
};

const nigeriaTestimonialContent: TestimonialContent = {
  sectionTitle: "What Our Drivers Say",
  testimonials: [
    {
      name: "Emeka O.",
      location: "Lagos",
      platform: "Bolt/Uber Driver",
      quote: "I started with their 'Smart Start' car and upgraded in 6 months. This platform changed my game! My weekly profit increased by ₦35,000.",
      earning: "+₦35,000 weekly",
    },
    {
      name: "Adebayo K.",
      location: "Abuja",
      platform: "InDrive Driver",
      quote: "The verification process gave me confidence. I know my vehicle owner is legitimate, and the support team responds fast.",
    },
    {
      name: "Chidi N.",
      location: "Port Harcourt",
      platform: "Bolt Driver",
      quote: "No more fuel-guzzling cars eating my profit. The fuel-efficient option they matched me with was perfect for PH traffic.",
    },
  ],
};

// ============================================
// CONTENT GETTER FUNCTIONS
// ============================================

export const getHeroContent = (country: Country): HeroContent => {
  return country === "Nigeria" ? nigeriaHeroContent : usaHeroContent;
};

export const getCategoryContent = (country: Country): CategoryContent => {
  return country === "Nigeria" ? nigeriaCategoryContent : usaCategoryContent;
};

export const getHowItWorksContent = (country: Country): HowItWorksContent => {
  return country === "Nigeria" ? nigeriaHowItWorksContent : usaHowItWorksContent;
};

export const getFeaturesContent = (country: Country): FeaturesContent => {
  return country === "Nigeria" ? nigeriaFeaturesContent : usaFeaturesContent;
};

export const getCTAContent = (country: Country): CTAContent => {
  return country === "Nigeria" ? nigeriaCTAContent : usaCTAContent;
};

export const getTestimonialContent = (country: Country): TestimonialContent => {
  return country === "Nigeria" ? nigeriaTestimonialContent : usaTestimonialContent;
};

// Price formatting helper
export const formatPrice = (baseUSD: number, country: Country): string => {
  if (country === "Nigeria") {
    // Approximate NGN conversion (1 USD ≈ 750 NGN for display purposes)
    const ngnAmount = baseUSD * 750;
    return `₦${ngnAmount.toLocaleString()}`;
  }
  return `$${baseUSD}`;
};
