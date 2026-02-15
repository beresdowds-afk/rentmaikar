# Rentmaikar Outgoing Call Flow — Reference

## Architecture Overview

```mermaid
graph TB
    subgraph "Trigger Sources"
        A1[Payment Default Stage 1] --> T[Trigger Queue]
        A2[Payment Default Stage 2] --> T
        A3[Payment Default Stage 3] --> T
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

## Payment Default Escalation — Detailed Sequence

```mermaid
sequenceDiagram
    participant S as System
    participant Q as Queue
    participant C as Caller
    participant A as Agent/IVR
    participant DB as Database
    
    Note over S,DB: STAGE 1 - Initial Warning
    
    S->>Q: Hourly cron check
    Q->>DB: Find defaulted drivers
    DB->>Q: Return list of defaulters
    Q->>C: Initiate VoIP call with IVR
    
    alt Call Answered
        C->>A: Hello?
        A->>C: "This is Rentmaikar regarding your payment"
        A->>C: "Your payment of $X is now overdue"
        A->>C: "Press 1 to make payment now"
        A->>C: "Press 2 to speak with support"
        
        alt Payment Option (Press 1)
            C->>A: Press 1
            A->>C: "Payment link sent to your phone via SMS"
            A->>DB: Log IVR interaction
            S->>C: Send payment link SMS
        else Support Option (Press 2)
            C->>A: Press 2
            A->>C: Connect to support number
            A->>DB: Log support request
        end
    else No Answer
        Q->>C: Leave voicemail TwiML
        Q->>S: Schedule retry (15min, max 3x)
        S->>C: Send SMS reminder
    end
    
    Note over S,DB: STAGE 2 - Escalation
    
    S->>Q: Next notification interval
    Q->>C: Second VoIP call with IVR
    A->>C: "Urgent: payment still outstanding"
    A->>C: "Vehicle deactivation in Xh"
    
    Note over S,DB: STAGE 3 - Critical / Lockdown
    
    S->>Q: Final notification interval
    Q->>C: Critical VoIP call
    A->>C: "Immediate action required"
    A->>C: "Vehicle will be disabled when parked"
    
    alt Payment Received
        S->>C: "Payment confirmed - vehicle active"
        S->>DB: Resolve default, clear lockdown
    else No Payment
        S->>DB: Mark deactivation_eligible
        S->>C: Send lockdown warning SMS
    end
```

## Business Rules — Escalation Timing

| Plan Type | Overdue Window | Stage 1 | Stage 2 | Stage 3 (Lockdown) | Consequence |
|---|---|---|---|---|---|
| **Daily** | 24 hours | 8h overdue | 16h overdue | 24h overdue | Daily plan eligibility **permanently revoked** |
| **Weekly** | 36 hours | 12h overdue | 24h overdue | 36h overdue | Downgraded to **Daily plan** permanently |

### Key Enforcement Rules

- **10% administrative fine** on all late payments (driver must consent)
- **Vehicle lockdown** only when telemetry confirms: speed = 0, ignition OFF
- **Payment-to-unlock latency**: Under 30 seconds
- If vehicle is moving at lockdown time: queued and re-checked every 10-15 minutes
- Daily plan eligibility is **permanently revoked** after any default

## Implementation Mapping

### Currently Implemented Triggers

| Trigger | Edge Function | VoIP + IVR? | SMS/WhatsApp? |
|---|---|---|---|
| Payment Default Stage 1 | `process-payment-defaults` | ✅ Press 1/2 IVR | ✅ |
| Payment Default Stage 2 | `process-payment-defaults` | ✅ Press 1/2 IVR | ✅ |
| Payment Default Stage 3 | `process-payment-defaults` | ✅ Press 1/2 IVR | ✅ |
| Document Expiry (30-day) | `process-expiry-notifications` | ✅ IVR (Press 1/2/3) | ✅ Email/SMS/WhatsApp |
| Document Expiry (15-day) | `process-expiry-notifications` | ✅ IVR (Priority) | ✅ Email/SMS/WhatsApp |
| Document Expiry (7-day) | `process-expiry-notifications` | ✅ IVR (Urgent) | ✅ Email/SMS/WhatsApp |
| Document Expiry (5-day) | `process-expiry-notifications` | ✅ Critical Alert + Admin | ✅ + Account Restriction |
| Insurance Renewal (30/15/7/5) | `process-expiry-notifications` | ✅ (all tiers) | ✅ |
| Pre-Due Payment Reminders | `process-predue-reminders` | ❌ | ✅ WhatsApp/Email |
| Emergency (IoT Accident) | `iot-accident-detection` | ❌ (SMS only) | ✅ |

### Edge Functions Involved

| Function | Role |
|---|---|
| `process-payment-defaults` | Hourly cron — escalation, SMS/WhatsApp + VoIP with IVR |
| `payment-default-ivr` | Twilio `<Gather>` callback — handles Press 1 (payment SMS) / Press 2 (connect support) |
| `expiry-notification-ivr` | Twilio `<Gather>` callback — handles Press 1 (upload link SMS) / Press 2 (extension request) / Press 3 (connect agent) |
| `voip-status-callback` | Twilio status webhook — retry logic (3x @ 15min), post-call summary SMS |
| `process-expiry-notifications` | Daily 8 AM UTC — 30/15/7/5-day expiry alerts with VoIP+IVR, document-type routing, account restriction at 5-day |
| `process-predue-reminders` | Hourly — friendly pre-due WhatsApp/email reminders (72h→12h before due) |

### Not Yet Implemented (Blueprint Only)

| Trigger | Notes |
|---|---|
| Vehicle Return Reminder | Requires rental end-date tracking |
| Rental Extension Offer | Requires proactive rental management flow |
| Owner Payout Confirmation | Requires payout processing integration |
| Driver Welcome Call | Requires onboarding automation trigger |
| Vehicle Shutdown Warning | Partially handled via IoT lockdown safety logic |

### Call Execution Flow

1. Edge function creates `voip_calls` record with `status: 'pending'`, `caller_role: 'system'`
2. Twilio REST API called with `<Gather>` TwiML pointing to `payment-default-ivr`
3. Answering Machine Detection enabled (`MachineDetection: DetectMessageEnd`)
4. `StatusCallback` → `voip-status-callback` receives real-time updates
5. On answered: IVR menu plays, driver presses 1 or 2
6. On busy/no-answer: retry scheduled (up to 3x @ 15min intervals)
7. On completion: duration logged, summary SMS sent
8. On max retries exhausted: marked as permanently failed
