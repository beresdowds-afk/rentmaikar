import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, DollarSign, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import categoryBudget from "@/assets/category-budget.jpg";
import categoryStandard from "@/assets/category-standard.jpg";
import categoryPremium from "@/assets/category-premium.jpg";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  price: number;
  location: string;
  rating: number;
  image: string;
}

const mockVehicles: Record<string, Vehicle[]> = {
  budget: [
    { id: "1", make: "Toyota", model: "Corolla", year: 2015, color: "Silver", price: 225, location: "Washington DC", rating: 4.7, image: categoryBudget },
    { id: "2", make: "Honda", model: "Civic", year: 2016, color: "White", price: 240, location: "Maryland", rating: 4.5, image: categoryBudget },
    { id: "3", make: "Nissan", model: "Sentra", year: 2015, color: "Black", price: 210, location: "Virginia", rating: 4.3, image: categoryBudget },
    { id: "4", make: "Hyundai", model: "Elantra", year: 2016, color: "Blue", price: 230, location: "Lagos", rating: 4.6, image: categoryBudget },
  ],
  standard: [
    { id: "5", make: "Toyota", model: "Camry", year: 2019, color: "Gray", price: 280, location: "Washington DC", rating: 4.8, image: categoryStandard },
    { id: "6", make: "Honda", model: "Accord", year: 2018, color: "Black", price: 290, location: "Abuja", rating: 4.9, image: categoryStandard },
    { id: "7", make: "Hyundai", model: "Sonata", year: 2020, color: "White", price: 300, location: "Maryland", rating: 4.7, image: categoryStandard },
    { id: "8", make: "Kia", model: "Optima", year: 2019, color: "Silver", price: 275, location: "Port Harcourt", rating: 4.5, image: categoryStandard },
  ],
  premium: [
    { id: "9", make: "Toyota", model: "Avalon", year: 2023, color: "Black", price: 340, location: "Washington DC", rating: 4.9, image: categoryPremium },
    { id: "10", make: "Lexus", model: "ES 350", year: 2022, color: "Pearl White", price: 350, location: "Maryland", rating: 5.0, image: categoryPremium },
    { id: "11", make: "Mercedes-Benz", model: "E-Class", year: 2024, color: "Silver", price: 350, location: "Virginia", rating: 4.9, image: categoryPremium },
    { id: "12", make: "BMW", model: "5 Series", year: 2023, color: "Black", price: 345, location: "Lagos", rating: 4.8, image: categoryPremium },
  ],
};

const categoryInfo: Record<string, { title: string; years: string; maxPrice: number; color: string }> = {
  budget: { title: "Budget Friendly", years: "2015 - 2016", maxPrice: 250, color: "category-budget" },
  standard: { title: "Standard Selection", years: "2017 - 2020", maxPrice: 300, color: "category-standard" },
  premium: { title: "Premium Fleet", years: "2021 - 2025", maxPrice: 350, color: "category-premium" },
};

const Catalogue = () => {
  const { category = "budget" } = useParams<{ category: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");

  const info = categoryInfo[category] || categoryInfo.budget;
  const vehicles = mockVehicles[category] || mockVehicles.budget;

  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === "all" || v.location === locationFilter;
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });

  const locations = [...new Set(vehicles.map((v) => v.location))];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <span className="text-foreground capitalize">{category} Cars</span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  {info.title}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {info.years} • Up to ${info.maxPrice}/week
                </p>
              </div>
              
              <div className="flex gap-2">
                <Link to="/catalogue/budget">
                  <Button variant={category === "budget" ? "default" : "outline"} size="sm">
                    Budget
                  </Button>
                </Link>
                <Link to="/catalogue/standard">
                  <Button variant={category === "standard" ? "default" : "outline"} size="sm">
                    Standard
                  </Button>
                </Link>
                <Link to="/catalogue/premium">
                  <Button variant={category === "premium" ? "default" : "outline"} size="sm">
                    Premium
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl p-4 mb-8 shadow-sm border border-border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by make or model..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4 text-muted-foreground">
            {filteredVehicles.length} vehicles found
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-card rounded-xl overflow-hidden shadow-card card-hover border border-border"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={vehicle.image}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="text-sm font-medium">{vehicle.rating}</span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    {vehicle.year}
                    <span className="mx-1">•</span>
                    {vehicle.color}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {vehicle.location}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-5 h-5 text-accent" />
                      <span className="text-xl font-bold text-foreground">{vehicle.price}</span>
                      <span className="text-sm text-muted-foreground">/week</span>
                    </div>
                    
                    <Button size="sm" variant="hero">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No vehicles found matching your criteria.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setLocationFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Catalogue;
