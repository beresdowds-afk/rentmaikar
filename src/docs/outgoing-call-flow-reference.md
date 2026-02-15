# Rentmaikar Outgoing Call Flow — Reference

## Architecture Overview

```mermaid
graph TB
    subgraph "Trigger Sources"
        A1[Payment Default Day 1] --> T[Trigger Queue]
        A2[Payment Default Day 2] --> T
        A3[Payment Default Day 3] --> T
        B1[Document Expiry Alert] --> T
        B2[Insurance Renewal] --> T
        C1[Vehicle Return Reminder] --> T
        C2[Rental Extension Offer] --> T
        D1[Owner Payout Confirmation] --> T
        D2[Driver Welcome Call] --> T
        E1[Emergency Alert] --> T
        E2[Vehicle Shutdown Warning] --> T
    end

    subgraph "Call Scheduling System"
        T --> S[Call Scheduler]
        S --> P{Priority Level}
        
        P -->|Critical| Q1[Immediate Queue]
        P -->|High| Q2[15min Queue]
        P -->|Medium| Q3[1hr Queue]
        P -->|Low| Q4[Scheduled Batch]
        
        Q1 --> R[Call Dispatcher]
        Q2 --> R
        Q3 --> R
        Q4 --> R
    end

    subgraph "Call Preparation"
        R --> U[Fetch User Context]
        U --> V[Load User Profile]
        V --> W[Check Timezone]
        W --> X[Language Selection]
        X --> Y[Generate Dynamic Script]
        
        Y --> Z[Prepare Call Data]
        Z --> AA[Store in Call Queue]
    end

    subgraph "Call Execution Engine"
        AA --> AB[Twilio API]
        AB --> AC{Call Attempt}
        
        AC -->|Answered| AD[Connect Call]
        AC -->|Busy| AE[Schedule Retry]
        AC -->|No Answer| AF[Voicemail Drop]
        AC -->|Invalid| AG[Mark Invalid]
        
        AD --> AH[IVR Handler]
    end

    subgraph "Call Flow by Type"
        AH --> AI{Call Type}
        
        AI -->|Payment Default| BJ[Default Collection Flow]
        AI -->|Document Reminder| BK[Document Update Flow]
        AI -->|Vehicle Related| BL[Vehicle Management Flow]
        AI -->|Payment Confirmation| BM[Payment Confirmation Flow]
        AI -->|Emergency| BN[Emergency Alert Flow]
    end

    subgraph "Post-Call Processing"
        BJ --> BO[Log Call Outcome]
        BK --> BO
        BL --> BO
        BM --> BO
        BN --> BO
        
        BO --> BP[Update Database]
        BP --> BQ[Schedule Follow-up]
        BQ --> BR[Send Summary SMS]
        BR --> BS[Update Analytics]
    end
```

## Implementation Mapping

### Currently Implemented Triggers

| Trigger | Edge Function | VoIP Call? | SMS/WhatsApp? |
|---|---|---|---|
| Payment Default Day 1 | `process-payment-defaults` | ❌ | ✅ |
| Payment Default Day 2 | `process-payment-defaults` | ❌ | ✅ |
| Payment Default Day 3 (Final Notice) | `process-payment-defaults` | ✅ | ✅ |
| Document Expiry (30-day) | `process-expiry-notifications` | ❌ | ✅ Email/SMS/WhatsApp |
| Document Expiry (7-day) | `process-expiry-notifications` | ✅ | ✅ Email/SMS/WhatsApp |
| Insurance Renewal (30/7-day) | `process-expiry-notifications` | ✅ (7-day) | ✅ |
| Pre-Due Payment Reminders | `process-predue-reminders` | ❌ | ✅ WhatsApp/Email |
| Emergency (IoT Accident) | `iot-accident-detection` | ❌ (SMS only) | ✅ |

### Not Yet Implemented (Blueprint Only)

| Trigger | Notes |
|---|---|
| Vehicle Return Reminder | Requires rental end-date tracking |
| Rental Extension Offer | Requires proactive rental management flow |
| Owner Payout Confirmation | Requires payout processing integration |
| Driver Welcome Call | Requires onboarding automation trigger |
| Vehicle Shutdown Warning | Partially handled via payment default lockdown |

### Call Scheduling

- **Immediate (Critical)**: Payment Default Day 3, Emergency alerts
- **Cron-based (Scheduled)**: Expiry notifications (daily 8 AM UTC), Payment defaults (hourly), Pre-due reminders (hourly)

### Retry Logic (voip-status-callback)

- `busy` / `no-answer` → Auto-retry up to **3 attempts** within 1 hour
- Retry interval: **15 minutes** between attempts
- After max retries: Call marked as failed, no further retries

### Post-Call Processing (voip-status-callback)

- **Call Outcome**: Logged via `voip_calls` table (status, duration, ended_at)
- **Participant Updates**: Status tracked in `voip_call_participants`
- **Summary SMS**: Sent automatically after completed calls >5 seconds
- **Database Updates**: Call record updated with Twilio SID, duration, recording URL

### Call Execution Flow

1. Edge function creates `voip_calls` record with `status: 'pending'`
2. Twilio REST API called with dynamic TwiML script
3. `StatusCallback` → `voip-status-callback` receives real-time updates
4. On completion: duration logged, summary SMS sent, analytics updated
5. On failure: retry scheduled (up to 3x) or marked as permanently failed
