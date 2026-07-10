import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building, Mail, Phone, MapPin, Car, Calendar, DollarSign, Check, ArrowLeft, Upload, ExternalLink, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCategoryYearSpecs } from "@/hooks/useCategoryYearSpecs";

const createOwnerSchema = (country: "usa" | "nigeria") => z.object({
  // Owner Details
  firstName: z.string().min(2, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(2, "Last name is required").max(50, "Last name too long"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  phoneCountry: z.enum(["us", "ng"]),
  phoneNumber: z.string().min(10, "Phone number is required").max(15, "Phone number too long"),
  
  // Location
  country: z.enum(["usa", "nigeria"]),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(3, "ZIP/Postal code is required").max(10, "ZIP code too long"),
  
  // Vehicle Details
  vehicleMake: z.string().min(1, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required").max(50, "Model name too long"),
  vehicleYear: z.string().min(4, "Vehicle year is required"),
  vehicleColor: z.string().min(1, "Vehicle color is required").max(30, "Color name too long"),
  vehiclePlate: country === "usa" 
    ? z.string().min(1, "VIN is required").max(17, "VIN too long")
    : z.string().min(1, "License plate is required").max(15, "License plate too long"),
  desiredPrice: z.string().min(1, "Desired weekly price is required"),
  vehicleDescription: z.string().max(500, "Description too long").optional(),
  
  // Confirmations
  hasRegistration: z.boolean().refine(val => val, "Vehicle registration is required"),
  hasInsurance: z.boolean().refine(val => val, "Insurance is required"),
  hasInspectionCertificate: country === "usa" 
    ? z.boolean().refine(val => val, "Vehicle inspection certificate is required for USA")
    : z.boolean().optional(),
  // Nigeria-specific
  hasRoadWorthiness: country === "nigeria"
    ? z.boolean().refine(val => val, "Road worthiness certificate is required for Nigeria")
    : z.boolean().optional(),
  hasProofOfOwnership: country === "nigeria"
    ? z.boolean().refine(val => val, "Proof of ownership is required for Nigeria")
    : z.boolean().optional(),
  hasSafetyEquipment: country === "nigeria"
    ? z.boolean().refine(val => val, "You must affirm provision of required safety equipment")
    : z.boolean().optional(),
  agreeTerms: z.boolean().refine(val => val, "You must agree to Terms of Service"),
  agreePrivacy: z.boolean().refine(val => val, "You must agree to Privacy Policy"),
  agreeIoT: z.boolean().refine(val => val, "You must consent to IoT tracking"),
  agreeFees: z.boolean().refine(val => val, "You must acknowledge platform fees"),
});

const ownerSchema = createOwnerSchema("usa");

type OwnerFormData = z.infer<typeof ownerSchema>;

const usaCities = ["Washington DC", "Maryland", "Virginia"];
const nigeriaCities = ["Lagos", "Abuja", "Port Harcourt"];

const carMakes = [
  "Toyota", "Honda", "Nissan", "Hyundai", "Kia", "Chevrolet", 
  "Ford", "Mazda", "Volkswagen", "Mercedes-Benz", "BMW", "Lexus"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => (currentYear - 10 + i).toString());

const OwnerRegistration = () => {
  const navigate = useNavigate();
  const [currentCountry, setCurrentCountry] = useState<"usa" | "nigeria">("usa");
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(createOwnerSchema(currentCountry)),
    defaultValues: {
      phoneCountry: "us",
      country: "usa",
      hasRegistration: false,
      hasInsurance: false,
      hasInspectionCertificate: false,
      hasRoadWorthiness: false,
      hasProofOfOwnership: false,
      hasSafetyEquipment: false,
      agreeTerms: false,
      agreePrivacy: false,
      agreeIoT: false,
      agreeFees: false,
    },
  });

  const selectedCountry = watch("country");
  const selectedYear = watch("vehicleYear");
  const cities = selectedCountry === "usa" ? usaCities : nigeriaCities;

  // Calculate suggested price based on year (uses editable year specs)
  const yearSpecsRegion = selectedCountry === "usa" ? "USA" : "Nigeria";
  const { specs: yearSpecs } = useCategoryYearSpecs(yearSpecsRegion);
  const getSuggestedPrice = () => {
    if (!selectedYear) return null;
    const year = parseInt(selectedYear);
    // Fallback pricing map matches historical hardcoded values
    const priceByCategory: Record<string, string> = {
      premium: "$350/week (Premium)",
      standard: "$300/week (Standard)",
      budget: "$250/week (Budget)",
    };
    const match = [...yearSpecs]
      .sort((a, b) => b.sort_order - a.sort_order)
      .find((s) => year >= s.min_year && year <= s.max_year);
    if (match) {
      return priceByCategory[match.category] ??
        `${match.label} tier (${match.min_year}-${match.max_year})`;
    }
    // Legacy fallback
    if (year >= 2021) return "$350/week (Premium)";
    if (year >= 2017) return "$300/week (Standard)";
    return "$250/week (Budget)";
  };

  const onSubmit = async (data: OwnerFormData) => {
    try {
      const { error } = await supabase.from('applications').insert({
        application_type: 'owner' as const,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_country: data.phoneCountry,
        phone_number: data.phoneNumber,
        country: data.country,
        city: data.city,
        zip_code: data.zipCode,
        region: data.country === 'usa' ? 'usa' : 'nigeria',
        vehicle_make: data.vehicleMake,
        vehicle_model: data.vehicleModel,
        vehicle_year: parseInt(data.vehicleYear),
        vehicle_color: data.vehicleColor,
        vehicle_plate: data.vehiclePlate,
        desired_weekly_price: parseFloat(data.desiredPrice),
        vehicle_description: data.vehicleDescription || null,
        has_registration: data.hasRegistration,
        has_insurance: data.hasInsurance,
        agreed_terms: data.agreeTerms,
        agreed_privacy: data.agreePrivacy,
        agreed_iot: data.agreeIoT,
        agreed_fees: data.agreeFees,
      });
      
      if (error) throw error;
      
      toast.success("Vehicle submitted for review! We'll contact you within 24-48 hours.");
      navigate("/");
    } catch (error) {
      console.error("Owner registration error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                List Your Vehicle
              </h1>
              <p className="text-muted-foreground mt-2">
                Earn passive income by renting your car to verified rideshare drivers
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Owner Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building className="w-5 h-5 text-accent" />
                  Owner Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" {...register("firstName")} />
                    {errors.firstName && (
                      <p className="text-destructive text-sm">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" {...register("lastName")} />
                    {errors.lastName && (
                      <p className="text-destructive text-sm">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <Select
                      defaultValue="us"
                      onValueChange={(value) => setValue("phoneCountry", value as "us" | "ng")}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">🇺🇸 +1</SelectItem>
                        <SelectItem value="ng">🇳🇬 +234</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="(202) 555-0123"
                        className="pl-10"
                        {...register("phoneNumber")}
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-destructive text-sm">{errors.phoneNumber.message}</p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  Location
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      defaultValue="usa"
                      onValueChange={(value) => {
                        const country = value as "usa" | "nigeria";
                        setValue("country", country);
                        setCurrentCountry(country);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usa">🇺🇸 United States</SelectItem>
                        <SelectItem value="nigeria">🇳🇬 Nigeria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select onValueChange={(value) => setValue("city", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && (
                      <p className="text-destructive text-sm">{errors.city.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                  <Input id="zipCode" placeholder="20001" {...register("zipCode")} />
                  {errors.zipCode && (
                    <p className="text-destructive text-sm">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Car className="w-5 h-5 text-accent" />
                  Vehicle Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Make</Label>
                    <Select onValueChange={(value) => setValue("vehicleMake", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {carMakes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleMake && (
                      <p className="text-destructive text-sm">{errors.vehicleMake.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Model</Label>
                    <Input id="vehicleModel" placeholder="Camry" {...register("vehicleModel")} />
                    {errors.vehicleModel && (
                      <p className="text-destructive text-sm">{errors.vehicleModel.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select onValueChange={(value) => setValue("vehicleYear", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.reverse().map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleYear && (
                      <p className="text-destructive text-sm">{errors.vehicleYear.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleColor">Color</Label>
                    <Input id="vehicleColor" placeholder="Silver" {...register("vehicleColor")} />
                    {errors.vehicleColor && (
                      <p className="text-destructive text-sm">{errors.vehicleColor.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlate">
                      {selectedCountry === "usa" ? "Vehicle Identification Number (VIN)" : "License Plate"}
                    </Label>
                    <Input 
                      id="vehiclePlate" 
                      placeholder={selectedCountry === "usa" ? "1HGBH41JXMN109186" : "ABC-1234"} 
                      {...register("vehiclePlate")} 
                    />
                    {errors.vehiclePlate && (
                      <p className="text-destructive text-sm">{errors.vehiclePlate.message}</p>
                    )}
                  </div>
                </div>

                {selectedYear && (
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                    <p className="text-sm font-medium text-accent flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Suggested price: {getSuggestedPrice()}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="desiredPrice">Desired Weekly Price ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="desiredPrice"
                      type="number"
                      placeholder="300"
                      className="pl-10"
                      {...register("desiredPrice")}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Final price is set by admin based on market rates and vehicle condition
                  </p>
                  {errors.desiredPrice && (
                    <p className="text-destructive text-sm">{errors.desiredPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleDescription">Description (Optional)</Label>
                  <Textarea
                    id="vehicleDescription"
                    placeholder="Tell us about your vehicle's features, condition, etc."
                    rows={3}
                    {...register("vehicleDescription")}
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Upload className="w-5 h-5 text-accent" />
                  Documents & Confirmations
                </h3>
                
                <label className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-accent/50 cursor-pointer">
                  <Checkbox
                    onCheckedChange={(checked) =>
                      setValue("hasRegistration", checked as boolean)
                    }
                  />
                  <div>
                    <span className="font-medium">Valid Vehicle Registration</span>
                    <p className="text-sm text-muted-foreground">
                      You have current registration documents ready to upload
                    </p>
                  </div>
                </label>
                {errors.hasRegistration && (
                  <p className="text-destructive text-sm">{errors.hasRegistration.message}</p>
                )}

                <label className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-accent/50 cursor-pointer">
                  <Checkbox
                    onCheckedChange={(checked) =>
                      setValue("hasInsurance", checked as boolean)
                    }
                  />
                  <div>
                    <span className="font-medium">Valid Insurance with Rideshare Coverage</span>
                    <p className="text-sm text-muted-foreground">
                      Your insurance includes rideshare endorsement
                    </p>
                  </div>
                </label>
                {errors.hasInsurance && (
                  <p className="text-destructive text-sm">{errors.hasInsurance.message}</p>
                )}

                {/* Vehicle Inspection Certificate - USA Only */}
                {selectedCountry === "usa" && (
                  <>
                    <label className="flex items-start gap-3 p-4 rounded-lg border border-accent/30 bg-accent/5 hover:border-accent/50 cursor-pointer">
                      <Checkbox
                        onCheckedChange={(checked) =>
                          setValue("hasInspectionCertificate", checked as boolean)
                        }
                      />
                      <div>
                        <span className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" />
                          Current Vehicle Inspection Certificate
                        </span>
                        <p className="text-sm text-muted-foreground">
                          You have a valid state vehicle inspection certificate (required for USA)
                        </p>
                      </div>
                    </label>
                    {errors.hasInspectionCertificate && (
                      <p className="text-destructive text-sm">{errors.hasInspectionCertificate.message}</p>
                    )}
                  </>
                )}

                {/* Nigeria-Specific Requirements */}
                {selectedCountry === "nigeria" && (
                  <>
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                      <p className="text-sm font-medium text-warning flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4" />
                        🇳🇬 Nigeria Owner Requirements
                      </p>
                    </div>

                    <label className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 hover:border-warning/50 cursor-pointer">
                      <Checkbox
                        onCheckedChange={(checked) =>
                          setValue("hasRoadWorthiness", checked as boolean)
                        }
                      />
                      <div>
                        <span className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-warning" />
                          Road Worthiness Certificate
                        </span>
                        <p className="text-sm text-muted-foreground">
                          You have a valid road worthiness certificate for your vehicle (required for Nigeria)
                        </p>
                      </div>
                    </label>
                    {errors.hasRoadWorthiness && (
                      <p className="text-destructive text-sm">{errors.hasRoadWorthiness.message}</p>
                    )}

                    <label className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 hover:border-warning/50 cursor-pointer">
                      <Checkbox
                        onCheckedChange={(checked) =>
                          setValue("hasProofOfOwnership", checked as boolean)
                        }
                      />
                      <div>
                        <span className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-warning" />
                          Proof of Ownership
                        </span>
                        <p className="text-sm text-muted-foreground">
                          You have valid proof of vehicle ownership documentation ready for upload
                        </p>
                      </div>
                    </label>
                    {errors.hasProofOfOwnership && (
                      <p className="text-destructive text-sm">{errors.hasProofOfOwnership.message}</p>
                    )}

                    <div className="p-4 rounded-lg border-2 border-warning/50 bg-warning/5">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          onCheckedChange={(checked) =>
                            setValue("hasSafetyEquipment", checked as boolean)
                          }
                        />
                        <div>
                          <span className="font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4 text-warning" />
                            Safety Equipment Affirmation
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            I affirm that my vehicle is equipped with or I will provide the following mandatory safety items:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                            <li><strong className="text-foreground">C-Caution Sign</strong> (reflective warning triangle)</li>
                            <li><strong className="text-foreground">Fire Extinguisher</strong> (valid and not expired)</li>
                            <li><strong className="text-foreground">Jack</strong> (functional vehicle jack)</li>
                            <li><strong className="text-foreground">Extra/Spare Tyre</strong> (in good condition)</li>
                          </ul>
                        </div>
                      </label>
                      {errors.hasSafetyEquipment && (
                        <p className="text-destructive text-sm mt-2">{errors.hasSafetyEquipment.message}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Terms & Policy Acceptance */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  Terms & Policy Acceptance
                </h3>
                
                {/* Terms of Service */}
                <div className="p-4 rounded-lg border border-border hover:border-accent/50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      onCheckedChange={(checked) =>
                        setValue("agreeTerms", checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Terms of Service
                        </span>
                        <a 
                          href="/terms" 
                          target="_blank" 
                          className="text-accent hover:underline text-sm flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        I have read and agree to the Terms of Service
                      </p>
                    </div>
                  </label>
                  {errors.agreeTerms && (
                    <p className="text-destructive text-sm mt-2">{errors.agreeTerms.message}</p>
                  )}
                </div>

                {/* Privacy Policy */}
                <div className="p-4 rounded-lg border border-border hover:border-accent/50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      onCheckedChange={(checked) =>
                        setValue("agreePrivacy", checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Privacy Policy
                        </span>
                        <a 
                          href="/privacy" 
                          target="_blank" 
                          className="text-accent hover:underline text-sm flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        I have read and agree to the Privacy Policy
                      </p>
                    </div>
                  </label>
                  {errors.agreePrivacy && (
                    <p className="text-destructive text-sm mt-2">{errors.agreePrivacy.message}</p>
                  )}
                </div>

                {/* IoT Consent */}
                <div className="p-4 rounded-lg border border-border hover:border-accent/50 bg-accent/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      onCheckedChange={(checked) =>
                        setValue("agreeIoT", checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <span className="font-medium">IoT Tracking Device Requirement</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        I agree to install Rentmaikar IoT tracking devices on my vehicle(s) and understand that 
                        this enables real-time GPS tracking, accident detection, and remote deactivation capabilities.
                      </p>
                    </div>
                  </label>
                  {errors.agreeIoT && (
                    <p className="text-destructive text-sm mt-2">{errors.agreeIoT.message}</p>
                  )}
                </div>

                {/* Platform Fees */}
                <div className="p-4 rounded-lg border border-border hover:border-accent/50 bg-primary/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      onCheckedChange={(checked) =>
                        setValue("agreeFees", checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <span className="font-medium">Platform Fee Acknowledgement</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        I acknowledge and agree to the 20% management fee deducted from all rental earnings 
                        before payout to my account.
                      </p>
                    </div>
                  </label>
                  {errors.agreeFees && (
                    <p className="text-destructive text-sm mt-2">{errors.agreeFees.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit Vehicle for Review
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OwnerRegistration;
