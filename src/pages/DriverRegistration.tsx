import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Phone, MapPin, FileText, Car, Check, ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const driverSchema = z.object({
  firstName: z.string().min(2, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(2, "Last name is required").max(50, "Last name too long"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  phoneCountry: z.enum(["us", "ng"]),
  phoneNumber: z.string().min(10, "Phone number is required").max(15, "Phone number too long"),
  country: z.enum(["usa", "nigeria"]),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(3, "ZIP/Postal code is required").max(10, "ZIP code too long"),
  rideshareApproval: z.array(z.string()).min(1, "Select at least one platform"),
  hasDriverLicense: z.boolean().refine(val => val, "Driver license is required"),
  agreeTerms: z.boolean().refine(val => val, "You must agree to Terms of Service"),
  agreePrivacy: z.boolean().refine(val => val, "You must agree to Privacy Policy"),
  agreeIoT: z.boolean().refine(val => val, "You must consent to IoT tracking"),
});

type DriverFormData = z.infer<typeof driverSchema>;

const usaCities = [
  "Washington DC",
  "Maryland",
  "Virginia",
];

const nigeriaCities = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
];

const ridesharePlatforms = [
  { id: "uber", label: "Uber" },
  { id: "lyft", label: "Lyft" },
  { id: "bolt", label: "Bolt" },
  { id: "indrive", label: "InDrive" },
];

const DriverRegistration = () => {
  const navigate = useNavigate();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      phoneCountry: "us",
      country: "usa",
      rideshareApproval: [],
      hasDriverLicense: false,
      agreeTerms: false,
      agreePrivacy: false,
      agreeIoT: false,
    },
  });

  const selectedCountry = watch("country");
  const cities = selectedCountry === "usa" ? usaCities : nigeriaCities;

  const handlePlatformChange = (platformId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedPlatforms, platformId]
      : selectedPlatforms.filter((p) => p !== platformId);
    setSelectedPlatforms(updated);
    setValue("rideshareApproval", updated);
  };

  const onSubmit = async (data: DriverFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Driver registration:", data);
      toast.success("Registration submitted successfully! We'll review your application.");
      navigate("/");
    } catch (error) {
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
                <User className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Driver Registration
              </h1>
              <p className="text-muted-foreground mt-2">
                Join our network of rideshare drivers
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...register("firstName")}
                    />
                    {errors.firstName && (
                      <p className="text-destructive text-sm">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...register("lastName")}
                    />
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
                      onValueChange={(value) => setValue("country", value as "usa" | "nigeria")}
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
                  <Input
                    id="zipCode"
                    placeholder="20001"
                    {...register("zipCode")}
                  />
                  {errors.zipCode && (
                    <p className="text-destructive text-sm">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>

              {/* Rideshare Platforms */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Car className="w-5 h-5 text-accent" />
                  Rideshare Platform Approval
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the platforms you're approved to drive for
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {ridesharePlatforms.map((platform) => (
                    <label
                      key={platform.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedPlatforms.includes(platform.id)
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={(checked) =>
                          handlePlatformChange(platform.id, checked as boolean)
                        }
                      />
                      <span className="font-medium">{platform.label}</span>
                    </label>
                  ))}
                </div>
                {errors.rideshareApproval && (
                  <p className="text-destructive text-sm">{errors.rideshareApproval.message}</p>
                )}
              </div>

              {/* Requirements */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  Requirements
                </h3>
                
                <label className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-accent/50 cursor-pointer">
                  <Checkbox
                    onCheckedChange={(checked) =>
                      setValue("hasDriverLicense", checked as boolean)
                    }
                  />
                  <div>
                    <span className="font-medium">I have a valid driver's license</span>
                    <p className="text-sm text-muted-foreground">
                      You'll need to upload a copy during verification
                    </p>
                  </div>
                </label>
                {errors.hasDriverLicense && (
                  <p className="text-destructive text-sm">{errors.hasDriverLicense.message}</p>
                )}

                {selectedCountry === "nigeria" && (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <p className="text-sm font-medium text-warning">
                      🇳🇬 Nigeria drivers must provide a Police Clearance Certificate
                    </p>
                  </div>
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
                <div className="p-4 rounded-lg border border-border hover:border-accent/50 bg-warning/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      onCheckedChange={(checked) =>
                        setValue("agreeIoT", checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <span className="font-medium">IoT Tracking & Remote Deactivation Consent</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        I understand and consent to continuous GPS tracking of the vehicle and acknowledge 
                        that the vehicle may be remotely deactivated in cases of payment default, unauthorized use, or safety concerns.
                      </p>
                    </div>
                  </label>
                  {errors.agreeIoT && (
                    <p className="text-destructive text-sm mt-2">{errors.agreeIoT.message}</p>
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
                    Submit Registration
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

export default DriverRegistration;
