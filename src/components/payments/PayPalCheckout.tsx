import { useState, useCallback } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { usePayPalConfig } from "@/hooks/usePayPalConfig";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayPalCheckoutProps {
  amount: number;
  rentalId?: string;
  vehicleId?: string;
  ownerId?: string;
  driverId?: string;
  paymentFrequency?: "daily" | "weekly";
  description?: string;
  onSuccess?: (data: { orderId: string; captureId?: string; paymentId?: string }) => void;
  onError?: (error: string) => void;
}

export function PayPalCheckout({
  amount,
  rentalId,
  vehicleId,
  ownerId,
  driverId,
  paymentFrequency = "weekly",
  description,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  const { country, currency } = useRegion();
  const { clientId, environment, enabled: isEnabled, isLoading, error: configErrorRaw } = usePayPalConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(configErrorRaw);

  const createOrder = useCallback(async () => {
    setIsProcessing(true);
    setConfigError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          amount,
          currency: "USD",
          rental_id: rentalId,
          vehicle_id: vehicleId,
          owner_id: ownerId,
          driver_id: driverId,
          payment_frequency: paymentFrequency,
          description: description ?? `Rentmaikar rental payment`,
        },
      });

      if (error || !data?.order_id) {
        throw new Error(error?.message ?? data?.error ?? "Failed to create PayPal order");
      }

      return data.order_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "PayPal order creation failed";
      setConfigError(message);
      onError?.(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [amount, rentalId, vehicleId, ownerId, driverId, paymentFrequency, description, onError]);

  const onApprove = useCallback(
    async (data: { orderID: string }) => {
      setIsProcessing(true);
      try {
        const { data: captureData, error } = await supabase.functions.invoke("capture-paypal-order", {
          body: { order_id: data.orderID },
        });

        if (error || captureData?.status !== "COMPLETED") {
          throw new Error(error?.message ?? captureData?.error ?? "PayPal capture failed");
        }

        toast.success("Payment completed via PayPal", {
          description: `Order ${captureData.order_id}`,
        });

        onSuccess?.({
          orderId: captureData.order_id,
          captureId: captureData.capture_id,
          paymentId: captureData.payment_id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "PayPal capture failed";
        toast.error("Payment failed", { description: message });
        onError?.(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onSuccess, onError],
  );

  if (country !== "USA" || currency !== "USD") {
    return (
      <Alert variant="default" className="bg-muted">
        <AlertDescription>PayPal is only available for US/USD payments.</AlertDescription>
      </Alert>
    );
  }

  if (!clientId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          PayPal is not configured. Add PAYPAL_CLIENT_ID in your environment to enable PayPal checkout.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing PayPal payment...
        </div>
      )}

      {configError && (
        <Alert variant="destructive">
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      )}

      <PayPalScriptProvider
        options={{
          clientId,
          components: "buttons",
          currency: "USD",
          intent: "capture",
          environment: env === "live" ? "production" : "sandbox",
        }}
      >
        <PayPalButtons
          disabled={!isEnabled || isProcessing}
          style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(err) => {
            const message = typeof err === "string" ? err : "PayPal checkout error";
            setConfigError(message);
            onError?.(message);
          }}
          onCancel={() => {
            toast.info("PayPal payment cancelled");
          }}
        />
      </PayPalScriptProvider>

      {!isEnabled && (
        <Button disabled className="w-full">
          PayPal unavailable for this region
        </Button>
      )}
    </div>
  );
}
