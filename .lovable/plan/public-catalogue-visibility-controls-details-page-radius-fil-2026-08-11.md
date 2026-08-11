# Public catalogue: visibility controls, details page, radius filter, booking requests

## 1. Admin control over public visibility

- Add `is_public` (boolean, default false) to `vehicles`. A vehicle only shows publicly when `is_public` is on AND its rental status is `available` or `active`.
- Update the `public_vehicle_listings` view to require `is_public = true`, and tighten the public read policy on `vehicles` to match.
- In the Admin Vehicle Catalogue page: a "Public listing" toggle per vehicle plus bulk publish/unpublish for selected rows, with a badge showing Published / Hidden / Hidden by status.
- "Preview as visitor" button opens a modal rendering the exact anon-facing card and details layout, built from only the RLS-safe fields, so admins see what a signed-out user sees.

## 2. Public vehicle details page

- New route `/vehicle/:id` (public, no auth). Reads a single row from `public_vehicle_listings` — same safe fields only (make, model, year, color, status, pickup city/location, photos, created_at).
- Layout: photo gallery with thumbnails, spec grid (year, colour, category, availability), pickup location block, weekly price from the region's category price, and a "Request to book" CTA.
- Handles not-found / hidden vehicles with a clear message and a link back to the catalogue. SEO title, description, and Vehicle JSON-LD included.
- Catalogue cards link to this page.

## 3. Radius filter and visible distance

- Replace the fixed radius with a radius control in the catalogue filter bar: a slider/select (5, 10, 25, 50, 100 miles, plus "Any distance") for the USA, and a city selector for Nigeria. Value syncs to the `radius` URL parameter so a filtered view is shareable.
- Every card shows its computed distance ("8.4 mi away" / "In Lagos"); when sorting by "Closest first" the distance is emphasised and results are strictly distance-ordered.
- Result header states how many vehicles are within the chosen radius out of the total.

## 4. Request to book

- New table `vehicle_booking_requests`: vehicle, driver, requested start/end dates, message, status (`pending`, `offer_sent`, `accepted`, `declined`, `withdrawn`, `cancelled`), admin-curated offer fields (offered rate, currency, offer note, offer expiry), reviewer and timestamps.
- Access rules: drivers can create and view their own requests and accept/decline an offer sent to them; they cannot set status or offer fields themselves. Admins and permitted assistants can view all, send curated offers, and review. No anonymous inserts.
- Public flow: "Request to book" on the catalogue card and details page opens a dialog with a date-range picker and optional message. Signed-out visitors are routed to sign in first and returned to the same vehicle. Non-driver accounts see a short explanation instead.
- Admin flow: new "Booking requests" queue with filters by status/region, request detail, and a "Send offer" action that records the curated rate and notifies the driver. The driver sees pending offers on their dashboard and can accept or decline.

## Technical notes

- Migration adds `vehicles.is_public`, recreates `public_vehicle_listings` with the new predicate, creates `vehicle_booking_requests` with grants, RLS policies, an `updated_at` trigger, and a column-scope trigger that blocks drivers from editing offer/status fields directly. Status changes go through security-definer RPCs (`submit_booking_request`, `admin_send_booking_offer`, `driver_respond_to_booking_offer`).
- Frontend: extend `usePublicVehicles.ts` with a single-vehicle hook and radius-aware helpers; new `useBookingRequests.ts`; new `src/pages/VehicleDetails.tsx`; new admin panel component plus a preview modal; catalogue filter bar and card updates.
- All new UI consumes `RegionContext` for currency, distance/city semantics, and copy.
