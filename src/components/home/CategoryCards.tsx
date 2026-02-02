import { Link } from "react-router-dom";
import { ArrowRight, DollarSign } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { useUserType } from "@/contexts/UserTypeContext";
import { getCategoryContent } from "@/lib/localized-content";
import categoryBudget from "@/assets/category-budget.jpg";
import categoryStandard from "@/assets/category-standard.jpg";
import categoryPremium from "@/assets/category-premium.jpg";

interface CategoryCardProps {
  title: string;
  years: string;
  minPrice: string;
  maxPrice: string;
  description: string;
  image: string;
  link: string;
  variant: "budget" | "standard" | "premium";
  viewCta: string;
}

const CategoryCard = ({
  title,
  years,
  minPrice,
  maxPrice,
  description,
  image,
  link,
  variant,
  viewCta,
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
          <div className="flex items-center gap-1">
            <DollarSign className={`w-5 h-5 ${textColors[variant]}`} />
            <span className="text-lg font-bold text-foreground">{minPrice}</span>
            <span className="text-sm text-muted-foreground">-</span>
            <span className="text-lg font-bold text-foreground">{maxPrice}</span>
            <span className="text-sm text-muted-foreground">/week</span>
          </div>
          
          <div className={`flex items-center gap-1 ${textColors[variant]} group-hover:gap-2 transition-all`}>
            <span className="text-sm font-medium">{viewCta}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const CategoryCards = () => {
  const { country } = useRegion();
  const { userType } = useUserType();
  const content = getCategoryContent(country);

  // Only show CategoryCards for drivers (or when no type selected)
  // Owners don't need to browse rental categories
  if (userType === "owner") {
    return null;
  }

  const categories = [
    {
      title: content.budget.title,
      years: "2015 - 2016",
      minPrice: content.budget.minPriceLabel,
      maxPrice: content.budget.priceLabel,
      description: content.budget.description,
      image: categoryBudget,
      link: "/catalogue/budget",
      variant: "budget" as const,
    },
    {
      title: content.standard.title,
      years: "2017 - 2020",
      minPrice: content.standard.minPriceLabel,
      maxPrice: content.standard.priceLabel,
      description: content.standard.description,
      image: categoryStandard,
      link: "/catalogue/standard",
      variant: "standard" as const,
    },
    {
      title: content.premium.title,
      years: "2021 - 2025",
      minPrice: content.premium.minPriceLabel,
      maxPrice: content.premium.priceLabel,
      description: content.premium.description,
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
            {content.sectionBadge}
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {content.sectionTitle}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {content.sectionDescription}
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <CategoryCard 
              key={category.variant} 
              {...category} 
              viewCta={content.viewCta}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
