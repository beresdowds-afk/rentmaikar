Set up a PayPal payment integration for US-region transactions, leaving the live credentials as placeholders to be filled in later.

## Background
- The project already supports region-aware payments (US: PayPal, NG: Paystack, Bank transfers).
- Currently no PayPal secrets exist and no PayPal code is in the codebase.
- The build should follow the existing `RegionContext` pattern and the admin-mediated payment flow.

## What will be built

1. **Secrets scaffolding**
   - Create `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` entries (empty/placeholder values) so the project knows they are required.
   - You will fill them in later via the secrets form.

2. **Backend edge function**
   - `supabase/functions/paypal-create-order/index.ts`:
     - Validates the request, creates a PayPal order via the PayPal API, and returns the order ID to the client.
     - Uses `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` to generate an access token.
     - Supports both PayPal sandbox (`sb-`) and live modes based on a `PAYPAL_ENV` secret or inferred from credentials.
     - CORS headers included.
   - `supabase/functions/paypal-capture-order/index.ts`:
     - Captures an approved order and records the payment in the existing `payments` table.

3. **Frontend PayPal integration**
   - Add `@paypal/react-paypal-js` to the project.
   - Create `src/components/payments/PayPalCheckout.tsx`:
     - Renders PayPal buttons inside the existing rental/agreement checkout flow.
     - Consumes `RegionContext` and only renders for US/USD region.
     - Calls the edge functions to create/capture orders.
   - Create `src/hooks/usePayPalConfig.ts`:
     - Returns the correct PayPal client ID and environment based on region.

4. **Database schema additions**
   - Add `payment_provider` enum value or column support for `paypal`.
   - Add a migration to record PayPal order IDs and capture status in the `payments` table, or use a dedicated `paypal_transactions` table with RLS.
   - Include proper `GRANT` statements and RLS policies.

5. **Admin UI updates**
   - Add a "PayPal" option in the payment provider selector in admin rental/agreement management.
   - Add a read-only status badge for PayPal transactions.

6. **Validation / safe guards**
   - PayPal buttons only show for US region with USD currency.
   - Edge functions return clear errors if secrets are not set.
   - No secrets are hardcoded; the client ID may be passed from the backend but not stored in code.

## Out of scope
- Live PayPal account claim/verification (you will do that later).
- Webhook handling for PayPal events (can be added in a follow-up).
- Refund/ dispute flows (to be designed after the basic checkout works).

## Next steps after this build
- You will fill in `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with your PayPal app credentials.
- I will test the order creation flow end-to-end and verify the payment is recorded in the database.

## Files to create / edit
- New: `supabase/functions/paypal-create-order/index.ts`
- New: `supabase/functions/paypal-capture-order/index.ts`
- New: `src/components/payments/PayPalCheckout.tsx`
- New: `src/hooks/usePayPalConfig.ts`
- New: `supabase/migrations/20260713_add_paypal_transactions.sql`
- Edit: `src/integrations/supabase/types.ts` (if needed)
- Edit: relevant admin/payment provider UIs
- Edit: `package.json` / `bun.lock` for `@paypal/react-paypal-js`