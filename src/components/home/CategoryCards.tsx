import { Link } from "react-router-dom";
import { ArrowRight, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import categoryBudget from "@/assets/category-budget.jpg";
import categoryStandard from "@/assets/category-standard.jpg";
import categoryPremium from "@/assets/category-premium.jpg";

interface CategoryCardProps {
  title: string;
  years: string;
  price: string;
  description: string;
  image: string;
  link: string;
  variant: "budget" | "standard" | "premium";
}

const CategoryCard = ({
  title,
  years,
  price,
  description,
  image,
  link,
  variant,
}: CategoryCardProps) => {
  const borderColors = {
    budget: "border-l-category-budget",
    standard: "border-l-category-standard",
    premium: "border-l-category-premium",
  };

  const bgColors = {
    budget: "bg-category-budget/10",
    standard: "bg-category-standard/10",
    premium: "bg-category-premium/10",
  };

  const textColors = {
    budget: "text-category-budget",
    standard: "text-category-standard",
    premium: "text-category-premium",
  };

  return (
    <Link
      to={link}
      className={`group block bg-card rounded-xl overflow-hidden shadow-card card-hover border-l-4 ${borderColors[variant]}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${bgColors[variant]} ${textColors[variant]} text-sm font-semibold backdrop-blur-sm`}>
          {years}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-display font-bold text-foreground mb-2">
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-4">{description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${textColors[variant]}`} />
            <span className="text-lg font-bold text-foreground">{price}</span>
            <span className="text-sm text-muted-foreground">/week</span>
          </div>
          
          <div className={`flex items-center gap-1 ${textColors[variant]} group-hover:gap-2 transition-all`}>
            <span className="text-sm font-medium">View Cars</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const CategoryCards = () => {
  const categories = [
    {
      title: "Budget Friendly",
      years: "2015 - 2016",
      price: "Up to $250",
      description: "Reliable, fuel-efficient vehicles perfect for starting your rideshare journey. Great value for new drivers.",
      image: categoryBudget,
      link: "/catalogue/budget",
      variant: "budget" as const,
    },
    {
      title: "Standard Selection",
      years: "2017 - 2020",
      price: "Up to $300",
      description: "Modern vehicles with updated features. Ideal balance of comfort, reliability, and earnings potential.",
      image: categoryStandard,
      link: "/catalogue/standard",
      variant: "standard" as const,
    },
    {
      title: "Premium Fleet",
      years: "2021 - 2025",
      price: "Up to $350",
      description: "Latest models with premium features. Maximize your earnings with UberX Comfort and Lyft Lux rides.",
      image: categoryPremium,
      link: "/catalogue/premium",
      variant: "premium" as const,
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Vehicle Categories
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Find Your Perfect Ride
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse our curated selection of rideshare-ready vehicles, organized by year and price range to match your budget and goals.
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <CategoryCard key={category.variant} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
