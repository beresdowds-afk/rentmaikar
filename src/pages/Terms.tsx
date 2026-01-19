import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">Terms of Use</h1>
          </div>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using the Rentmaikar platform, you agree to be bound by these Terms of Use. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Description of Services</h2>
              <p className="text-muted-foreground">
                Rentmaikar is a vehicle rental marketplace that connects vehicle owners with rideshare drivers. 
                We facilitate the rental process but are not party to the rental agreements between owners and drivers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              <p className="text-muted-foreground">
                Users must register for an account to access certain features. You are responsible for maintaining 
                the confidentiality of your account credentials and for all activities under your account.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You must provide accurate and complete registration information</li>
                <li>You must be at least 21 years old to register as a driver</li>
                <li>You must have a valid driver's license and insurance where applicable</li>
                <li>You are responsible for all activities that occur under your account</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Driver Responsibilities</h2>
              <p className="text-muted-foreground">
                As a driver using our platform, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Maintain a valid driver's license and required insurance coverage</li>
                <li>Use vehicles only for legitimate rideshare purposes</li>
                <li>Return vehicles in the same condition as received</li>
                <li>Make timely rental payments as agreed</li>
                <li>Report any accidents or incidents immediately</li>
                <li>Submit weekly inspection reports as required</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Vehicle Owner Responsibilities</h2>
              <p className="text-muted-foreground">
                As a vehicle owner using our platform, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide vehicles that are safe, properly maintained, and legally registered</li>
                <li>Maintain adequate insurance coverage for your vehicles</li>
                <li>Provide accurate vehicle information and pricing</li>
                <li>Respond to driver inquiries in a timely manner</li>
                <li>Honor agreed-upon rental terms</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Payment Terms</h2>
              <p className="text-muted-foreground">
                Payment terms are agreed upon between owners and drivers. Rentmaikar may facilitate payments 
                but is not responsible for disputes between parties. Late payments may result in:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Late fees as specified in individual rental agreements</li>
                <li>Vehicle deactivation through IoT systems</li>
                <li>Account suspension or termination</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. IoT Device Terms</h2>
              <p className="text-muted-foreground">
                Vehicles equipped with IoT tracking devices are subject to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Real-time location tracking for safety and security purposes</li>
                <li>Remote deactivation in cases of payment default or unauthorized use</li>
                <li>Accident detection and emergency response features</li>
                <li>Weekly inspection monitoring</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Rentmaikar is a marketplace platform and is not liable for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Vehicle condition, safety, or mechanical issues</li>
                <li>Accidents or injuries occurring during vehicle use</li>
                <li>Disputes between owners and drivers</li>
                <li>Loss of income or consequential damages</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate accounts that violate these terms or engage in 
                fraudulent, abusive, or illegal activities.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Use, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: support@rentmaikar.com<br />
                Phone: +1 (240) 393-0081 (USA) | +234 803 555 0123 (Nigeria)
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;
