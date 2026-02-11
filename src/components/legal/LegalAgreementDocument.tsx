import React from 'react';
import { useRegion } from '@/contexts/RegionContext';
import { format } from 'date-fns';
import { EMAIL_CONFIG } from '@/lib/email-config';

interface Party {
  name: string;
  email: string;
  phone?: string;
}

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
}

interface LegalAgreementDocumentProps {
  driver: Party;
  owner: Party;
  vehicle: VehicleInfo;
  agreementDate?: Date;
  driverSignature?: string | null;
  ownerSignature?: string | null;
  adminWitnessSignature?: string | null;
  adminWitnessName?: string;
  driverSignedAt?: Date | null;
  ownerSignedAt?: Date | null;
  adminWitnessedAt?: Date | null;
}

const LegalAgreementDocument: React.FC<LegalAgreementDocumentProps> = ({
  driver,
  owner,
  vehicle,
  agreementDate = new Date(),
  driverSignature,
  ownerSignature,
  adminWitnessSignature,
  adminWitnessName = 'RentMaiKar Administrator',
  driverSignedAt,
  ownerSignedAt,
  adminWitnessedAt,
}) => {
  const { country } = useRegion();
  const isUSA = country === 'USA';

  const jurisdiction = isUSA ? 'the State of Maryland, United States' : 'the Federal Republic of Nigeria';
  const governingLaw = isUSA ? 'the laws of the State of Maryland' : 'the laws of the Federal Republic of Nigeria';

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto font-serif" id="legal-agreement-document">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Vehicle Rental Agreement</h1>
        <p className="text-sm mt-2">RentMaiKar Platform Agreement</p>
        <p className="text-sm text-gray-600">Agreement Date: {format(agreementDate, 'MMMM dd, yyyy')}</p>
      </div>

      {/* Parties */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 uppercase">Parties to This Agreement</h2>
        
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">VEHICLE OWNER ("Owner")</h3>
            <p><strong>Name:</strong> {owner.name}</p>
            <p><strong>Email:</strong> {owner.email}</p>
            {owner.phone && <p><strong>Phone:</strong> {owner.phone}</p>}
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">DRIVER ("Driver")</h3>
            <p><strong>Name:</strong> {driver.name}</p>
            <p><strong>Email:</strong> {driver.email}</p>
            {driver.phone && <p><strong>Phone:</strong> {driver.phone}</p>}
          </div>
        </div>
      </section>

      {/* Vehicle Information */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 uppercase">Vehicle Information</h2>
        <div className="border p-4 rounded text-sm">
          <div className="grid grid-cols-2 gap-4">
            <p><strong>Make:</strong> {vehicle.make}</p>
            <p><strong>Model:</strong> {vehicle.model}</p>
            <p><strong>Year:</strong> {vehicle.year}</p>
            <p><strong>License Plate:</strong> {vehicle.licensePlate}</p>
            {vehicle.vin && <p className="col-span-2"><strong>VIN:</strong> {vehicle.vin}</p>}
          </div>
        </div>
      </section>

      {/* Terms and Conditions */}
      <section className="mb-6 text-sm leading-relaxed">
        <h2 className="text-lg font-bold mb-3 uppercase">Terms and Conditions</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold">1. RENTAL TERMS</h3>
            <p>The Driver agrees to rent the Vehicle from the Owner through the RentMaiKar platform. All rental rates, payment schedules, and financial terms are as agreed upon and displayed on the RentMaiKar portal. This agreement references but does not supersede the pricing terms established on the platform.</p>
          </div>

          <div>
            <h3 className="font-bold">2. PAYMENT OBLIGATIONS</h3>
            <p>The Driver shall make all payments according to the schedule and amounts specified on the RentMaiKar platform. Late payments may result in penalties as outlined in the platform's Terms of Use, including but not limited to remote vehicle deactivation.</p>
          </div>

          <div>
            <h3 className="font-bold">3. VEHICLE USE AND CARE</h3>
            <p>The Driver agrees to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Use the Vehicle only for lawful purposes</li>
              <li>Maintain the Vehicle in good condition</li>
              <li>Not sublease or allow unauthorized persons to operate the Vehicle</li>
              <li>Submit weekly inspection reports as required by the platform</li>
              <li>Report any incidents, accidents, or damage within one (1) hour of occurrence</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold">4. IOT TRACKING AND REMOTE DEACTIVATION</h3>
            <p>Both parties acknowledge and consent to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Installation and operation of IoT tracking devices on the Vehicle</li>
              <li>Real-time GPS location tracking for safety and operational purposes</li>
              <li>Remote vehicle deactivation capability in cases of payment default, safety concerns, or contract violations</li>
              <li>Collection and storage of vehicle telemetry data</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold">5. INSURANCE AND LIABILITY</h3>
            <p>The Driver shall maintain valid insurance coverage as required by law. The Driver assumes full responsibility for any damage, loss, or liability arising from the use of the Vehicle during the rental period.</p>
          </div>

          <div>
            <h3 className="font-bold">6. OWNER'S REPRESENTATIONS</h3>
            <p>The Owner represents and warrants that:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>They have legal authority to rent the Vehicle</li>
              <li>The Vehicle is in safe and roadworthy condition</li>
              <li>All necessary registrations and inspections are current</li>
              <li>The Vehicle is free from liens that would affect the Driver's use</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold">7. PLATFORM FEE</h3>
            <p>The Owner acknowledges that RentMaiKar retains a platform fee as specified on the portal from all rental payments. The net amount after this fee will be disbursed to the Owner according to the platform's payout schedule.</p>
          </div>

          <div>
            <h3 className="font-bold">8. PROHIBITED ACTIVITIES</h3>
            <p>Both parties agree not to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Conduct direct transactions outside the RentMaiKar platform</li>
              <li>Share personal contact information for the purpose of bypassing the platform</li>
              <li>Engage in any activity that violates the platform's Terms of Use</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold">9. TERMINATION</h3>
            <p>This agreement may be terminated by either party in accordance with the terms specified on the RentMaiKar platform. RentMaiKar reserves the right to terminate this agreement for violation of platform policies.</p>
          </div>

          <div>
            <h3 className="font-bold">10. GOVERNING LAW AND JURISDICTION</h3>
            <p>This Agreement shall be governed by and construed in accordance with {governingLaw}. Any disputes arising from this Agreement shall be resolved in the courts of {jurisdiction}.</p>
          </div>

          <div>
            <h3 className="font-bold">11. ENTIRE AGREEMENT</h3>
            <p>This Agreement, together with the RentMaiKar Terms of Use and Privacy Policy, constitutes the entire agreement between the parties. Any modifications must be made through the platform's official processes.</p>
          </div>
        </div>
      </section>

      {/* Acknowledgment */}
      <section className="mb-8 text-sm bg-gray-50 p-4 rounded border">
        <h2 className="text-lg font-bold mb-3 uppercase">Acknowledgment</h2>
        <p>By signing below, each party acknowledges that they have read, understood, and agree to be bound by the terms of this Agreement and the RentMaiKar platform's Terms of Use and Privacy Policy, including consent for IoT tracking and remote vehicle deactivation.</p>
      </section>

      {/* Signatures */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-4 uppercase">Signatures</h2>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Owner Signature */}
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-3">OWNER SIGNATURE</h3>
            {ownerSignature ? (
              <div className="mb-2">
                <img src={ownerSignature} alt="Owner Signature" className="h-16 object-contain" />
              </div>
            ) : (
              <div className="h-16 border-b border-black mb-2"></div>
            )}
            <p className="text-sm"><strong>Name:</strong> {owner.name}</p>
            {ownerSignedAt && (
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {format(ownerSignedAt, 'MMM dd, yyyy HH:mm')}
              </p>
            )}
          </div>

          {/* Driver Signature */}
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-3">DRIVER SIGNATURE</h3>
            {driverSignature ? (
              <div className="mb-2">
                <img src={driverSignature} alt="Driver Signature" className="h-16 object-contain" />
              </div>
            ) : (
              <div className="h-16 border-b border-black mb-2"></div>
            )}
            <p className="text-sm"><strong>Name:</strong> {driver.name}</p>
            {driverSignedAt && (
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {format(driverSignedAt, 'MMM dd, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Admin Witness */}
        <div className="mt-6 border-2 border-primary p-4 rounded bg-primary/5">
          <h3 className="font-bold mb-3 text-center">WITNESSED BY RENTMAIKAR</h3>
          <div className="text-center">
            {adminWitnessSignature ? (
              <div className="mb-2 flex justify-center">
                <img src={adminWitnessSignature} alt="Admin Witness Signature" className="h-16 object-contain" />
              </div>
            ) : (
              <div className="h-16 border-b border-black mx-auto w-48 mb-2"></div>
            )}
            <p className="text-sm"><strong>Administrator:</strong> {adminWitnessName}</p>
            {adminWitnessedAt && (
              <p className="text-sm text-gray-600">
                <strong>Witnessed on:</strong> {format(adminWitnessedAt, 'MMM dd, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 border-t pt-4">
        <p>This document was generated and witnessed through the RentMaiKar platform.</p>
        <p>For questions or disputes, contact: {EMAIL_CONFIG.support}</p>
        <p className="mt-2">Agreement Version: 1.0 | Generated: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
      </footer>
    </div>
  );
};

export default LegalAgreementDocument;
