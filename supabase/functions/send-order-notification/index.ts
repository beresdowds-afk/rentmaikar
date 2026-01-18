import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  ownerEmail: string;
  ownerPhone?: string;
  devicePrice: number;
  currency: string;
  shippingAddress: string;
  paymentMethod: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, ownerEmail, ownerPhone, devicePrice, currency, shippingAddress, paymentMethod }: OrderNotificationRequest = await req.json();

    console.log("Sending order notification to admin for order:", orderId);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPrice = currency === 'NGN' ? `₦${devicePrice.toLocaleString()}` : `$${devicePrice.toFixed(2)}`;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Rentmaikar <notifications@resend.dev>",
        to: ["admin@rentmaikar.com"],
        subject: `🆕 New IoT Device Order - Payment Verification Required`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">New IoT Device Order</h1>
            <p>A new device order has been placed and requires payment verification.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order ID:</strong> ${orderId.slice(0, 8)}...</p>
              <p><strong>Owner Email:</strong> ${ownerEmail}</p>
              ${ownerPhone ? `<p><strong>Phone:</strong> ${ownerPhone}</p>` : ''}
              <p><strong>Amount:</strong> <span style="color: #16a34a;">${formattedPrice}</span></p>
              <p><strong>Payment Method:</strong> ${paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod}</p>
              <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong>⚠️ Action Required:</strong> Please verify the payment and confirm in the admin dashboard.
            </div>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
