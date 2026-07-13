import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaystackCheckout } from "./PaystackCheckout";
import { OpayCheckout } from "./OpayCheckout";
import { PayPalCheckout } from "./PayPalCheckout";
import { getCheckoutPSPs, resolveCountryCode, getRegionCurrency } from "@/lib/psp-support";

interface PaymentMethodPickerProps {
  country: string;
  amount: number;
  rentalId?: string;
  vehicleId?: string;
  driverId?: string;
  paymentFrequency?: "daily" | "weekly";
  description?: string;
  onSuccess?: () => void;
  onError?: () => void;
  /** Optional preselected PSP tab (e.g. after a Retry from the status panel). */
  preferredPSP?: "paystack" | "opay" | "paypal";
}

const psplabels: Record<string, string> = {
  paystack: "Paystack",
  opay: "Opay",
  paypal: "PayPal",
};

export function PaymentMethodPicker({
  country, amount, rentalId, vehicleId, driverId, paymentFrequency, description,
  onSuccess, onError, preferredPSP,
}: PaymentMethodPickerProps) {
  const psps = getCheckoutPSPs(country);
  const currency = getRegionCurrency(country);
  const cc = resolveCountryCode(country);
  const defaultPSP = preferredPSP && psps.includes(preferredPSP) ? preferredPSP : psps[0];

  if (psps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment methods</CardTitle>
          <CardDescription>No payment provider is enabled for your region yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose how to pay</CardTitle>
        <CardDescription>
          Total {new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)}
          {" — "}pick a provider available in your region.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={psps[0]} className="w-full">
          <TabsList className="w-full" style={{ display: "grid", gridTemplateColumns: `repeat(${psps.length}, minmax(0,1fr))` }}>
            {psps.map((p) => (
              <TabsTrigger key={p} value={p}>{psplabels[p]}</TabsTrigger>
            ))}
          </TabsList>
          {psps.includes("paystack") && (
            <TabsContent value="paystack" className="pt-4">
              <PaystackCheckout
                amount={amount}
                currency={currency as any}
                rentalId={rentalId} vehicleId={vehicleId} driverId={driverId}
                paymentFrequency={paymentFrequency} description={description}
                onSuccess={onSuccess} onError={() => onError?.()}
              />
            </TabsContent>
          )}
          {psps.includes("opay") && cc === "NG" && (
            <TabsContent value="opay" className="pt-4">
              <OpayCheckout
                amount={amount} rentalId={rentalId} vehicleId={vehicleId} driverId={driverId}
                paymentFrequency={paymentFrequency} description={description}
                onSuccess={onSuccess} onError={() => onError?.()}
              />
            </TabsContent>
          )}
          {psps.includes("paypal") && (
            <TabsContent value="paypal" className="pt-4">
              <PayPalCheckout
                amount={Number(amount.toFixed(2))}
                rentalId={rentalId} vehicleId={vehicleId} driverId={driverId}
                paymentFrequency={paymentFrequency} description={description}
                onSuccess={onSuccess} onError={() => onError?.()}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
