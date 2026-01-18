import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useRegion } from "@/contexts/RegionContext";
import { isVehicleInRange, getVehicleDistance, getNigeriaParentCity } from "@/lib/geo-utils";
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
  priceNGN?: number;
  location: string;
  coordinates?: { lat: number; lng: number };
  rating: number;
  image: string;
  country: "USA" | "Nigeria";
}

interface VehicleWithDistance extends Vehicle {
  distance: number;
  isNearby: boolean;
  nearestCity?: string;
}

// Mock vehicles with coordinates for distance calculation
const mockVehicles: Record<string, Vehicle[]> = {
  budget: [
    { id: "1", make: "Toyota", model: "Corolla", year: 2015, color: "Silver", price: 225, location: "Washington DC", coordinates: { lat: 38.9072, lng: -77.0369 }, rating: 4.7, image: categoryBudget, country: "USA" },
    { id: "2", make: "Honda", model: "Civic", year: 2016, color: "White", price: 240, location: "Silver Spring", coordinates: { lat: 38.9907, lng: -77.0261 }, rating: 4.5, image: categoryBudget, country: "USA" },
    { id: "3", make: "Nissan", model: "Sentra", year: 2015, color: "Black", price: 210, location: "Arlington", coordinates: { lat: 38.8816, lng: -77.0910 }, rating: 4.3, image: categoryBudget, country: "USA" },
    { id: "4", make: "Hyundai", model: "Elantra", year: 2016, color: "Blue", priceNGN: 55000, price: 230, location: "Lagos", rating: 4.6, image: categoryBudget, country: "Nigeria" },
    { id: "14", make: "Kia", model: "Rio", year: 2015, color: "Red", priceNGN: 52000, price: 220, location: "Lekki", rating: 4.4, image: categoryBudget, country: "Nigeria" },
    { id: "15", make: "Toyota", model: "Yaris", year: 2016, color: "White", priceNGN: 58000, price: 235, location: "Abuja", rating: 4.5, image: categoryBudget, country: "Nigeria" },
    { id: "16", make: "Honda", model: "Fit", year: 2015, color: "Silver", priceNGN: 54000, price: 228, location: "Port Harcourt", rating: 4.3, image: categoryBudget, country: "Nigeria" },
    { id: "17", make: "Nissan", model: "Versa", year: 2016, color: "Gray", price: 245, location: "Baltimore", coordinates: { lat: 39.2904, lng: -76.6122 }, rating: 4.4, image: categoryBudget, country: "USA" },
  ],
  standard: [
    { id: "5", make: "Toyota", model: "Camry", year: 2019, color: "Gray", price: 280, location: "Washington DC", coordinates: { lat: 38.9072, lng: -77.0369 }, rating: 4.8, image: categoryStandard, country: "USA" },
    { id: "6", make: "Honda", model: "Accord", year: 2018, color: "Black", priceNGN: 68000, price: 290, location: "Abuja", rating: 4.9, image: categoryStandard, country: "Nigeria" },
    { id: "7", make: "Hyundai", model: "Sonata", year: 2020, color: "White", price: 300, location: "Bethesda", coordinates: { lat: 38.9847, lng: -77.0947 }, rating: 4.7, image: categoryStandard, country: "USA" },
    { id: "8", make: "Kia", model: "Optima", year: 2019, color: "Silver", priceNGN: 70000, price: 275, location: "Port Harcourt", rating: 4.5, image: categoryStandard, country: "Nigeria" },
    { id: "18", make: "Toyota", model: "Avalon", year: 2018, color: "Blue", priceNGN: 72000, price: 295, location: "Victoria Island", rating: 4.8, image: categoryStandard, country: "Nigeria" },
    { id: "19", make: "Mazda", model: "6", year: 2019, color: "Red", price: 285, location: "Alexandria", coordinates: { lat: 38.8048, lng: -77.0469 }, rating: 4.6, image: categoryStandard, country: "USA" },
  ],
  premium: [
    { id: "9", make: "Toyota", model: "Avalon", year: 2023, color: "Black", price: 340, location: "Washington DC", coordinates: { lat: 38.9072, lng: -77.0369 }, rating: 4.9, image: categoryPremium, country: "USA" },
    { id: "10", make: "Lexus", model: "ES 350", year: 2022, color: "Pearl White", price: 350, location: "Rockville", coordinates: { lat: 39.0840, lng: -77.1528 }, rating: 5.0, image: categoryPremium, country: "USA" },
    { id: "11", make: "Mercedes-Benz", model: "E-Class", year: 2024, color: "Silver", price: 350, location: "Arlington", coordinates: { lat: 38.8816, lng: -77.0910 }, rating: 4.9, image: categoryPremium, country: "USA" },
    { id: "12", make: "BMW", model: "5 Series", year: 2023, color: "Black", priceNGN: 90000, price: 345, location: "Lagos", rating: 4.8, image: categoryPremium, country: "Nigeria" },
    { id: "20", make: "Mercedes-Benz", model: "C-Class", year: 2022, color: "White", priceNGN: 88000, price: 335, location: "Ikeja", rating: 4.7, image: categoryPremium, country: "Nigeria" },
    { id: "21", make: "Audi", model: "A6", year: 2023, color: "Gray", priceNGN: 92000, price: 348, location: "Maitama", rating: 4.9, image: categoryPremium, country: "Nigeria" },
  ],
};

const categoryInfo: Record<string, { title: string; years: string; maxPrice: number; maxPriceNGN: number; color: string }> = {
  budget: { title: "Budget Friendly", years: "2015 - 2016", maxPrice: 250, maxPriceNGN: 60000, color: "category-budget" },
  standard: { title: "Standard Selection", years: "2017 - 2020", maxPrice: 300, maxPriceNGN: 73000, color: "category-standard" },
  premium: { title: "Premium Fleet", years: "2021 - 2025", maxPrice: 350, maxPriceNGN: 93000, color: "category-premium" },
};

// Mock driver home location (in a real app, this would come from user profile)
const getDriverHomeLocation = (country: "USA" | "Nigeria") => {
  if (country === "Nigeria") {
    return { location: "Lagos", coordinates: null };
  }
  return { location: "Washington DC", coordinates: { lat: 38.9072, lng: -77.0369 } };
};

const Catalogue = () => {
  const { category = "budget" } = useParams<{ category: string }>();
  const { country, currency, currencySymbol } = useRegion();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("nearby");
  const [sortBy, setSortBy] = useState("price-low");

  const driverHome = getDriverHomeLocation(country);
  const info = categoryInfo[category] || categoryInfo.budget;
  const allVehicles = mockVehicles[category] || mockVehicles.budget;

  // Filter vehicles by country first and calculate distances
  const vehiclesWithDistance: VehicleWithDistance[] = useMemo(() => {
    return allVehicles
      .filter(v => v.country === country)
      .map(vehicle => {
        const distance = getVehicleDistance(
          vehicle.location,
          vehicle.coordinates || null,
          driverHome.location,
          driverHome.coordinates,
          country
        );
        const isNearby = isVehicleInRange(
          vehicle.location,
          vehicle.coordinates || null,
          driverHome.location,
          driverHome.coordinates,
          country
        );
        const nearestCity = country === "Nigeria" 
          ? getNigeriaParentCity(vehicle.location) || vehicle.location
          : vehicle.location;
        
        return { ...vehicle, distance, isNearby, nearestCity };
      })
      .sort((a, b) => {
        // Sort by: nearby first, then by distance
        if (a.isNearby && !b.isNearby) return -1;
        if (!a.isNearby && b.isNearby) return 1;
        return a.distance - b.distance;
      });
  }, [allVehicles, country, driverHome]);

  // Get nearby vehicles count for display
  const nearbyCount = useMemo(() => 
    vehiclesWithDistance.filter(v => v.isNearby).length,
    [vehiclesWithDistance]
  );

  const filteredVehicles = vehiclesWithDistance
    .filter((v) => {
      const matchesSearch =
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply location filter
      if (locationFilter === "nearby") {
        return matchesSearch && v.isNearby;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      // When showing all, maintain nearby-first order before applying price/rating sort
      if (locationFilter === "all") {
        // Primary sort: nearby first
        if (a.isNearby !== b.isNearby) {
          return a.isNearby ? -1 : 1;
        }
        // Secondary sort: distance for non-nearby
        if (!a.isNearby && !b.isNearby) {
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
        }
      }
      
      // Tertiary sort: by selected criteria
      const priceA = country === "Nigeria" ? (a.priceNGN || a.price) : a.price;
      const priceB = country === "Nigeria" ? (b.priceNGN || b.price) : b.price;
      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "price-high") return priceB - priceA;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });

  const locations = [...new Set(vehiclesWithDistance.map((v) => v.location))];

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
                  {info.years} • Up to {currencySymbol}{country === "Nigeria" ? info.maxPriceNGN.toLocaleString() : info.maxPrice}/week
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

          {/* Location Info Alert */}
          <Alert className="mb-6 border-accent/30 bg-accent/5">
            <Info className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm">
              {country === "Nigeria" ? (
                <>Showing vehicles in <strong>{driverHome.location}</strong> (your home city)</>
              ) : (
                <>Showing vehicles within <strong>35 miles</strong> of <strong>{driverHome.location}</strong></>
              )}
            </AlertDescription>
          </Alert>

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
                <SelectTrigger className="w-full md:w-56">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Nearby Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearby">
                    {country === "Nigeria" ? "My City Only" : "Within 35 Miles"}
                  </SelectItem>
                  <SelectItem value="all">
                    All {country === "Nigeria" ? "Nigeria" : "DMV Area"}
                  </SelectItem>
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
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted-foreground">
              {filteredVehicles.length} vehicles found
              {locationFilter === "all" && nearbyCount > 0 && (
                <span className="ml-2 text-xs">
                  ({nearbyCount} nearby, {filteredVehicles.length - filteredVehicles.filter(v => v.isNearby).length} from other areas)
                </span>
              )}
            </span>
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles.map((vehicle, index) => {
              // Show separator before first non-nearby vehicle when showing all
              const showSeparator = locationFilter === "all" && 
                !vehicle.isNearby && 
                (index === 0 || filteredVehicles[index - 1]?.isNearby);
              
              return (
                <React.Fragment key={vehicle.id}>
                  {showSeparator && (
                    <div key={`separator-${vehicle.id}`} className="col-span-full py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
                          Vehicles from Nearby Cities
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>
                  )}
                  <div
                    key={vehicle.id}
                    className={`bg-card rounded-xl overflow-hidden shadow-card card-hover border ${
                      vehicle.isNearby ? "border-border" : "border-muted"
                    }`}
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
                      {!vehicle.isNearby && (
                        <div className="absolute top-3 left-3 bg-muted/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {country === "Nigeria" 
                              ? vehicle.nearestCity 
                              : `${Math.round(vehicle.distance)} mi`
                            }
                          </span>
                        </div>
                      )}
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
                        {!vehicle.isNearby && country === "Nigeria" && (
                          <span className="ml-1 text-xs text-accent">• {Math.round(vehicle.distance)} mi away</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-accent">{currencySymbol}</span>
                          <span className="text-xl font-bold text-foreground">
                            {country === "Nigeria" 
                              ? (vehicle.priceNGN || vehicle.price).toLocaleString()
                              : vehicle.price
                            }
                          </span>
                          <span className="text-sm text-muted-foreground">/week</span>
                        </div>
                        
                        <Button size="sm" variant="hero">
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No vehicles found matching your criteria.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {country === "Nigeria" 
                  ? `Try viewing all vehicles in Nigeria instead of just ${driverHome.location}`
                  : "Try expanding your search to the entire DMV area"
                }
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setLocationFilter("nearby");
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
