# Bulk messaging reliability + non-USA delivery

Both concerns are confirmed as real defects in the current code.

## What I verified

1. **Non-USA recipients cannot be messaged.** When the composer opens a new thread it writes the region as `NGN` for any non-USA country (`useMessageComposer.ts` line 237), but the conversations table only accepts `USA` or `Nigeria` (check constraint confirmed on the live database). Every new non-USA thread therefore fails at insert time and the recipient gets nothing — the toast just says "Could not send the message".

2. **Failed sends are reported as successful.** After the message row is saved, if the email/SMS/WhatsApp dispatch function returns an error, the send helper still returns `true`. In bulk mode that recipient is counted in the "sent" tally, so a blast can report "Sent to N recipients" when nothing was delivered. Individually it only shows a soft warning.

## Fixes

**Region mapping**
- Map the composer country to the accepted values (`USA` / `Nigeria`) when creating a conversation, defaulting unknown countries to `Nigeria` only when the phone is Nigerian, otherwise `USA`.
- Surface the actual database error text in the failure toast so any future value mismatch is visible instead of hidden behind a generic message.

**Honest delivery accounting**
- Change the send helper to return a delivery outcome (`saved`, `delivered`, `failed`) with the provider error rather than a plain boolean.
- Bulk counters: only count a recipient as sent when the provider accepted it; count provider failures as failed.
- Final bulk summary lists the failed recipients and the reason, and the progress UI shows the failed count live.
- Single sends show an error toast (not a soft warning) when the provider rejects, while keeping the thread record.

## Verification after the change

- Compose to a Nigerian (+234) contact with no existing thread and confirm the conversation is created and the message dispatches.
- Bulk send to a small mixed set including one deliberately unreachable recipient, and confirm the summary reports it as failed, not sent.
- Build and typecheck.

## Technical notes

- Files: `src/hooks/useMessageComposer.ts` (region mapping, outcome type, bulk tally) and `src/components/admin/MessageComposer.tsx` (progress and summary display).
- No schema migration and no edge-function change; `send-email-reply` / `send-inbox-reply` already return `success: false` on provider failure.
