# Roadmap

## In progress
- [x] Security deposit ERP editor → public registration wiring
- [x] Navigation architecture audit (RENTMAIKAR_UI_NAVIGATION_ARCHITECTURE.md)
  - [x] Read spec, audit dashboards for permanently-mounted sibling features
  - [x] Root cause: `usePersistedTab` duplicate source of truth (state + URL race)
  - [x] Fix: URL-derived tab selection (single source of truth)
  - [x] Regression test for the navigation matrix
- [x] Call centre: real microphone / speaker / mute / end-call controls

## Queued (from earlier request, not yet built)
- [ ] Platform workflow registry table + sentry worker + downloadable worker list
- [ ] Agreement stage (signed / accredit / pickup) → canned SMS + WhatsApp templates
- [ ] Owner Activity tab: agreement stage, licence + referee status
- [ ] Live admin-session verifications (needs an admin sign-in in preview)
