# Onboarding: Authentication → Identity Verification → Marketplace

This document describes RentMaikar's layered onboarding model and how
marketplace features are gated on Persona identity verification.

## Layers

| # | Layer | Provider(s) | Purpose |
|---|---|---|---|
| 1 | **Sign-up / Sign-in** | Supabase Auth (email+password, Google SSO, Phone OTP) | Establish an authenticated session. Google provides a verified email; phone OTP provides a verified phone. |
| 2 | **Account bootstrap** | `handle_new_user` trigger | Auto-creates `profiles`, `user_roles`, `onboarding_state`. OAuth users with `email_verified` skip email verification. |
| 3 | **Profile completion** | `/onboarding/complete-profile` wizard, `get_profile_completion_status` RPC | Collects mandatory fields (phone, country, emergency contact). Optional: license, vehicle ownership, payment method. |
| 4 | **Identity verification (KYC/AML)** | Persona (`persona-create-inquiry`, `persona-webhook`) | Verifies government ID, selfie, and PEP/sanctions. Region-aware template routing. |
| 5 | **Feature grant** | `MarketplaceGate`, `SubscriptionGate`, `PortalRouteGuard` | Unlocks renting, listing, checkout, subscriptions, and portals once earlier layers pass. |

## Distinction: Google SSO vs Persona

- **Google Sign-In** is authentication only. It proves the user controls
  the Google account and its email — nothing more. It never returns a
  government ID, address, or KYC decision.
- **Persona** is identity verification. It runs document + biometric
  + database checks and returns a signed decision (`approved`,
  `declined`, `needs_review`, `expired`, `pending`).

Both are required for marketplace access. Google alone is not sufficient.

## Marketplace gating — real-time

`MarketplaceGate` (`src/components/onboarding/MarketplaceGate.tsx`) enforces
two conditions before rendering marketplace surfaces:

1. `get_profile_completion_status().mandatory_complete === true`
2. `get_my_identity_verification().is_verified === true`
   (i.e. `profiles.identity_verification_status = 'approved'`)

The gate consumes `useIdentityVerification`, which subscribes via Supabase
Realtime to `persona_inquiries` and `profiles` filtered on the current user.
The moment `persona-webhook` writes an `approved` status, the client
invalidates its cache and the gate flips open without a manual refresh.

### Routing decisions

| Condition | Redirect |
|---|---|
| Not authenticated | children render (public routes) or `ProtectedRoute` bounces to `/auth` |
| Mandatory profile fields missing | `/onboarding/complete-profile?returnTo=<path>` |
| Identity not verified | `/onboarding/verification-status?returnTo=<path>` |
| All pass | Marketplace surface renders |

The verification status page auto-navigates back to `returnTo` when the
realtime event flips `is_verified` to true.

## Verification status page

`/onboarding/verification-status` (`src/pages/VerificationStatusPage.tsx`)
shows each user their Persona lifecycle:

- **Submitted** — inquiry created with required fields
- **Pending review** — Persona is running checks (`pending`, `needs_review`)
- **Verified** — approved; marketplace unlocked
- **Action required** — `declined` or `expired`; flagged checks are surfaced
  from `mismatch_fields` and a fresh Persona session can be launched

The page also lists the last 10 inquiry attempts for the signed-in user.

## Data contract

- Table `persona_inquiries` (user-scoped, RLS-protected, `REPLICA IDENTITY FULL`)
- Column `profiles.identity_verification_status` (canonical decision)
- RPC `public.get_my_identity_verification()` (SECURITY DEFINER, granted to
  `authenticated`) returns `{ is_verified, profile_status, latest_inquiry,
  timeline }` for the caller.
- Realtime publication: `persona_inquiries` and `profiles` are members of
  `supabase_realtime`.

## Extending the gate

- To gate a new surface: wrap it with `<MarketplaceGate>`.
- To surface identity status inside a dashboard: use `useIdentityVerification()`.
- To add another verification step (e.g. address proof) fold it into the
  Persona template; the gate does not need changes.
