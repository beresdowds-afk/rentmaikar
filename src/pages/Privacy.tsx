import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p className="text-muted-foreground">
                Rentmaikar ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
              <h3 className="text-xl font-medium">Personal Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Name, email address, and phone number</li>
                <li>Driver's license information and identification documents</li>
                <li>Payment and billing information</li>
                <li>Profile photos and verification selfies</li>
              </ul>
              
              <h3 className="text-xl font-medium mt-4">Vehicle Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Vehicle make, model, year, and registration details</li>
                <li>Vehicle photos and inspection reports</li>
                <li>Insurance and title documentation</li>
              </ul>
              
              <h3 className="text-xl font-medium mt-4">IoT and Location Data</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Real-time GPS location of IoT-equipped vehicles</li>
                <li>Vehicle telemetry data (speed, acceleration, battery level)</li>
                <li>Accident detection data and emergency alerts</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Facilitate vehicle rentals between owners and drivers</li>
                <li>Verify user identities and prevent fraud</li>
                <li>Process payments and rental transactions</li>
                <li>Provide real-time vehicle tracking and safety features</li>
                <li>Send notifications about rentals, payments, and inspections</li>
                <li>Improve our platform and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Other Users:</strong> Vehicle owners and drivers can see each other's relevant profile information during rental transactions</li>
                <li><strong>Service Providers:</strong> Payment processors, SMS providers, and other third-party services that help operate our platform</li>
                <li><strong>Law Enforcement:</strong> When required by law or to protect safety and security</li>
                <li><strong>Insurance Companies:</strong> In the event of accidents or claims</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and monitoring</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as your account is active or as needed to provide services. 
                We may retain certain information for longer periods as required for legal, tax, or regulatory purposes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Your Rights</h2>
              <p className="text-muted-foreground">
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Data portability</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                and provide personalized features. You can manage cookie preferences through your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Rentmaikar operates in the USA and Nigeria. Your information may be transferred to and processed 
                in countries where we operate. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our services are not intended for users under 18 years of age. We do not knowingly collect 
                personal information from children.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any material changes 
                by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: privacy@rentmaikar.com<br />
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

export default Privacy;
