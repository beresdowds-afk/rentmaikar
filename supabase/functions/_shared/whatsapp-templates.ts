/**
 * Rentmaikar WhatsApp Message Templates
 * Dual-provider: Twilio (USA +1) / Termii (Nigeria +234)
 * Plain text messages + structured template definitions for approval workflows
 */

// Format currency based on region
const formatCurrency = (amount: number, currency: 'USD' | 'NGN'): string => {
  const symbol = currency === 'NGN' ? '₦' : '$';
  return `${symbol}${amount.toLocaleString()}`;
};

// ==================== BOOKING FLOWS ====================

export const bookingConfirmedMessage = (data: {
  firstName: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
}) => `🚗 Booking Confirmed!

Hi ${data.firstName}, your booking is confirmed.

Vehicle: ${data.vehicleName}
Pickup: ${data.pickupDate}
Return: ${data.returnDate}

📍 Pickup location details are in your dashboard.

Need help? Reply *HELP*`;

export const ownerVehicleBookedMessage = (data: {
  firstName: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  amount: number;
  currency: 'USD' | 'NGN';
}) => `🎉 Good news!

Your vehicle ${data.vehicleName} has just been booked.

Rental period:
${data.pickupDate} → ${data.returnDate}

💰 Estimated earnings: ${formatCurrency(data.amount, data.currency)}

You'll be notified once pickup happens.`;

export const pickupReminderMessage = (data: {
  firstName: string;
  vehicleName: string;
  pickupTime: string;
}) => `⏰ Pickup Reminder

Hi ${data.firstName}, this is a reminder that your Rentmaikar pickup is tomorrow.

Vehicle: ${data.vehicleName}
Time: ${data.pickupTime}

Please arrive with valid ID.
Reply *OK* to confirm.`;

export const returnReminderMessage = (data: {
  firstName: string;
  vehicleName: string;
  returnTime: string;
}) => `🔔 Return Reminder

Your Rentmaikar rental ends today.

Vehicle: ${data.vehicleName}
Return time: ${data.returnTime}

Late returns may attract additional charges.
Reply *DONE* once returned.`;

// ==================== PAYMENT REMINDER FLOWS (PRE-DUE) ====================

export const paymentReminder72hMessage = (data: {
  firstName: string;
  vehicleName: string;
  amount: number;
  currency: 'USD' | 'NGN';
  dueDate: string;
}) => `👋 Friendly Reminder – Rentmaikar

Hi ${data.firstName}, this is a quick heads-up that your weekly rental payment is due in 3 days.

🚗 Vehicle: ${data.vehicleName}
💰 Amount due: ${formatCurrency(data.amount, data.currency)}
📅 Due date: ${data.dueDate}

You can pay early anytime to stay uninterrupted.
Reply *PAY* to make payment now.`;

export const paymentReminder60hMessage = (data: {
  firstName: string;
  amount: number;
  currency: 'USD' | 'NGN';
}) => `⏰ Rentmaikar Reminder

Your weekly rental payment is due soon.

⏳ Time remaining: about 2½ days
💰 Amount: ${formatCurrency(data.amount, data.currency)}

Pay early to avoid last-minute issues.
Reply *PAY* to continue.`;

export const paymentReminder48hMessage = (data: {
  firstName: string;
  vehicleName: string;
  amount: number;
  currency: 'USD' | 'NGN';
}) => `📅 Payment Reminder – 2 Days Left

Hi ${data.firstName}, your weekly Rentmaikar payment is due in 2 days.

Vehicle: ${data.vehicleName}
Amount: ${formatCurrency(data.amount, data.currency)}

Early payment keeps your ride uninterrupted.
Reply *PAY* to make payment.`;

export const paymentReminder36hMessage = () => `⚠️ Important Reminder

Your weekly payment is due in about 36 hours.

Please ensure payment is completed on or before the due date to avoid service interruption.

Reply *PAY* to pay now.`;

export const paymentReminder24hMessage = (data: {
  amount: number;
  currency: 'USD' | 'NGN';
  dueDate: string;
}) => `🚨 Due Tomorrow – Rentmaikar

This is a reminder that your weekly rental payment is due tomorrow.

💰 Amount: ${formatCurrency(data.amount, data.currency)}
📅 Due date: ${data.dueDate}

Paying today helps you avoid any disruption.
Reply *PAY* to continue.`;

export const paymentReminder12hMessage = (data: {
  firstName: string;
  amount: number;
  currency: 'USD' | 'NGN';
}) => `⏳ Final Reminder – Payment Due Today

Hi ${data.firstName}, your weekly Rentmaikar payment is due today.

💰 Amount due: ${formatCurrency(data.amount, data.currency)}

Please make payment before the due time to keep your rental active.
Reply *PAY* to pay now.`;

// ==================== PAYMENT OVERDUE FLOWS ====================

export const paymentOverdue8hMessage = (data: {
  firstName: string;
  vehicleName: string;
}) => `⚠️ Payment Reminder – Rentmaikar

Hi ${data.firstName}, your daily rental payment is overdue.

⏰ Overdue by: 8 hours
Vehicle: ${data.vehicleName}

Please make payment immediately to avoid vehicle restriction.

Need help? Reply *PAYMENT*`;

export const paymentOverdue16hMessage = (data: {
  vehicleName: string;
}) => `🚨 Second Reminder – Action Required

Your Rentmaikar daily payment is now 16 hours overdue.

⚠️ Vehicle restriction may occur if payment is not made within the next 8 hours.

Vehicle: ${data.vehicleName}

Reply *PAY* after completing payment.`;

export const paymentOverdue24hFinalMessage = (data: {
  vehicleName: string;
}) => `⛔ FINAL NOTICE – Vehicle Lockdown Imminent

Your daily payment is now 24 hours overdue.

Vehicle: ${data.vehicleName}

If payment is not received immediately, your vehicle may be locked remotely.

Please check your email for full details.`;

export const weeklyPaymentOverdue12hMessage = (data: {
  firstName: string;
  vehicleName: string;
}) => `⚠️ Payment Reminder – Weekly Plan

Hi ${data.firstName}, your weekly Rentmaikar payment is overdue.

⏰ Overdue by: 12 hours
Vehicle: ${data.vehicleName}

Please make payment to avoid plan downgrade or vehicle restriction.`;

export const weeklyPaymentOverdue24hMessage = (data: {
  vehicleName: string;
}) => `🚨 Important Notice – Plan Downgrade Warning

Your weekly payment is now 24 hours overdue.

⚠️ If payment is not received within 12 hours:
• Your plan will be downgraded to DAILY
• Higher daily charges will apply

Vehicle: ${data.vehicleName}`;

export const weeklyPaymentOverdue36hFinalMessage = () => `⛔ FINAL NOTICE – Plan Downgrade & Lockdown Risk

Your weekly Rentmaikar payment is now 36 hours overdue.

Your plan will be downgraded to DAILY immediately.
Vehicle restriction may follow if daily payments are missed.

Please check your email for full breakdown.`;

// ==================== LOCKDOWN & UNLOCK FLOWS ====================

export const vehicleLockedMessage = (data: {
  vehicleName: string;
}) => `🔒 Vehicle Locked – Rentmaikar

Your rented vehicle ${data.vehicleName} has been restricted due to non-payment.

To restore access:
1️⃣ Complete outstanding payment
2️⃣ Contact Rentmaikar support

Email details have been sent.`;

export const vehicleUnlockedMessage = () => `✅ Vehicle Restored

Your payment has been received.
Vehicle access has been restored.

Thank you for resolving this promptly.`;

export const planDowngradedMessage = () => `🔁 Plan Updated – Rentmaikar

Your rental plan has been changed from WEEKLY to DAILY due to non-payment.

Daily payments now apply.
Please ensure timely payment to avoid vehicle restriction.`;

export const paymentSuccessMessage = () => `✅ Payment Received

Thank you! Your weekly payment has been received successfully.`;

// ==================== SELF-SERVICE FLOWS ====================

export const selfServiceMenuMessage = () => `🚗 Rentmaikar Self-Service

What would you like to do?

Reply with:
*PAY* - Make a payment
*STATUS* - Check rental status
*BALANCE* - View payment balance
*HELP* - Contact support`;

export const paymentLinkMessage = (data: {
  amount: number;
  currency: 'USD' | 'NGN';
  paymentUrl: string;
}) => `💳 Payment Link Ready

Amount due: ${formatCurrency(data.amount, data.currency)}

Click here to pay securely:
${data.paymentUrl}

This link expires in 30 minutes.`;

export const rentalStatusMessage = (data: {
  vehicleName: string;
  status: string;
  nextPaymentDue: string;
  amount: number;
  currency: 'USD' | 'NGN';
}) => `📊 Your Rental Status

Vehicle: ${data.vehicleName}
Status: ${data.status}

Next payment: ${data.nextPaymentDue}
Amount: ${formatCurrency(data.amount, data.currency)}

Reply *PAY* to make payment.`;

export const helpMessage = () => `🛠 Rentmaikar Support

What do you need help with?

1️⃣ Booking issue
2️⃣ Payment issue
3️⃣ Vehicle issue
4️⃣ Talk to human

Reply with the number of your choice.`;

// ==================== DRIVER ONBOARDING ====================

export const driverWelcomeMessage = (data?: {
  firstName?: string;
  documentsRequired?: string;
  supportNumber?: string;
}) => `👋 Welcome to Rentmaikar${data?.firstName ? `, ${data.firstName}` : ''}!

I'll help you complete your driver onboarding.

${data?.documentsRequired ? `📄 Documents needed:\n${data.documentsRequired}\n` : ''}Reply with:
*DOCS* - Upload documents
*RULES* - Vehicle rules
*HELP* - Contact support${data?.supportNumber ? `\n\n📞 Support: ${data.supportNumber}` : ''}`;

export const ownerWelcomeMessage = (data: {
  firstName: string;
  vehicleCount?: number;
}) => `👋 Welcome to Rentmaikar, ${data.firstName}!

Thank you for listing ${data.vehicleCount && data.vehicleCount > 1 ? `${data.vehicleCount} vehicles` : 'your vehicle'} with us.

Your dashboard is ready:
🚗 Track your vehicles
💰 Monitor earnings
📊 View rental activity

Visit: https://rentmaikar.lovable.app/owner/dashboard`;

// ==================== PAYMENT CONFIRMATION ====================

export const paymentConfirmationMessage = (data: {
  amount: number;
  currency: 'USD' | 'NGN';
  transactionId: string;
  date: string;
}) => `✅ Payment Received

Amount: ${formatCurrency(data.amount, data.currency)}
Transaction ID: ${data.transactionId}
Date: ${data.date}

Thank you for your timely payment!`;

// ==================== DOCUMENT TEMPLATES ====================

export const documentRequestMessage = (data: {
  documentType: string;
  deadline: string;
  instructions?: string;
}) => `📄 Document Required – Rentmaikar

You need to submit: *${data.documentType}*
📅 Deadline: ${data.deadline}

${data.instructions || 'Please upload via your dashboard or send as an attachment in this chat.'}

Reply *DOCS* to get the upload link.`;

export const documentVerifiedMessage = (data: {
  documentType: string;
  expiryDate?: string;
}) => `✅ Document Verified

Your *${data.documentType}* has been verified successfully.${data.expiryDate ? `\n\n📅 Valid until: ${data.expiryDate}` : ''}

No further action needed.`;

export const documentRejectedMessage = (data: {
  documentType: string;
  reason: string;
  reuploadLink?: string;
}) => `❌ Document Rejected

Your *${data.documentType}* was not accepted.

📝 Reason: ${data.reason}

${data.reuploadLink ? `Please reupload here:\n${data.reuploadLink}` : 'Please upload a new copy via your dashboard.'}`;

// ==================== VEHICLE TEMPLATES ====================

export const vehicleListedMessage = (data: {
  vehicleName: string;
  price: string;
  status: string;
}) => `🚗 Vehicle Listed – Rentmaikar

Vehicle: ${data.vehicleName}
💰 Price: ${data.price}
📊 Status: ${data.status}

Your vehicle is now visible to drivers.`;

export const vehicleAssignedMessage = (data: {
  vehicleName: string;
  driverName: string;
  rentalPeriod: string;
}) => `✅ Vehicle Assigned

Vehicle: ${data.vehicleName}
👤 Driver: ${data.driverName}
📅 Period: ${data.rentalPeriod}

You'll receive weekly payout updates.`;

export const vehicleShutdownWarningMessage = (data: {
  vehicleName: string;
  reason: string;
  timeRemaining: string;
  actionRequired: string;
}) => `⚠️ Vehicle Shutdown Warning

Vehicle: ${data.vehicleName}
📝 Reason: ${data.reason}
⏰ Time remaining: ${data.timeRemaining}

🔧 Action required: ${data.actionRequired}`;

// ==================== NIGERIA-SPECIFIC TEMPLATES ====================

export const policeReportRequestPidgin = (data: {
  firstName: string;
  deadline: string;
}) => `👮 Police Report – Rentmaikar

${data.firstName}, we need your police report / NUR number.

Abeg submit am before ${data.deadline} so your account no go get wahala.

Send the document for this chat or visit your dashboard.`;

export const policeReportRequestYoruba = (data: {
  firstName: string;
  deadline: string;
}) => `👮 Ìròyìn Ọlọ́pàá – Rentmaikar

${data.firstName}, a nílò ìròyìn ọlọ́pàá rẹ / NUR number.

Jọ̀wọ́ fi ránṣẹ́ kí ${data.deadline} kó lè yẹ̀.

Fi ìwé ránṣẹ́ sí ibi tàbí lọ sí dashboard rẹ.`;

// ==================== STRUCTURED TEMPLATE REGISTRY ====================
// These definitions map to WhatsApp Business API template format
// for use with both Twilio Content Templates and Termii Template API

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: Array<{
    type: 'text' | 'payload' | 'url';
    text?: string;
    payload?: string;
    url?: string;
  }>;
}

export interface StructuredTemplate {
  name: string;
  language: string;
  components: TemplateComponent[];
}

export const structuredTemplates: Record<string, StructuredTemplate> = {
  // ─── Welcome & Onboarding ───
  welcome_driver: {
    name: 'welcome_driver',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '{{1}}' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' }, // Platform name
        { type: 'text', text: '{{2}}' }, // Document list
        { type: 'text', text: '{{3}}' }, // Support number
      ]},
      { type: 'button', sub_type: 'quick_reply', index: 0, parameters: [{ type: 'payload', payload: 'GET_STARTED' }] },
    ],
  },
  welcome_owner: {
    name: 'welcome_owner',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '{{1}}' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
      ]},
    ],
  },

  // ─── Payment Templates ───
  payment_reminder_day1: {
    name: 'payment_reminder_day1',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '⚠️ Payment Reminder' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' }, // Amount
        { type: 'text', text: '{{2}}' }, // Due date
        { type: 'text', text: '{{3}}' }, // Vehicle
      ]},
      { type: 'button', sub_type: 'quick_reply', index: 0, parameters: [{ type: 'payload', payload: 'PAY_NOW' }] },
      { type: 'button', sub_type: 'quick_reply', index: 1, parameters: [{ type: 'payload', payload: 'PAYMENT_HELP' }] },
    ],
  },
  payment_reminder_day2: {
    name: 'payment_reminder_day2',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '⚠️ URGENT: Payment Overdue' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },
  payment_reminder_day3: {
    name: 'payment_reminder_day3',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '🚨 FINAL WARNING' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },
  payment_confirmation: {
    name: 'payment_confirmation',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '✅ Payment Received' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },

  // ─── Document Templates ───
  document_request: {
    name: 'document_request',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '📄 Document Required' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
      { type: 'button', sub_type: 'quick_reply', index: 0, parameters: [{ type: 'payload', payload: 'UPLOAD_NOW' }] },
    ],
  },
  document_verified: {
    name: 'document_verified',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '✅ Document Verified' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
      ]},
    ],
  },
  document_rejected: {
    name: 'document_rejected',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '❌ Document Rejected' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },

  // ─── Vehicle Templates ───
  vehicle_listed: {
    name: 'vehicle_listed',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '🚗 Vehicle Listed' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },
  vehicle_assigned: {
    name: 'vehicle_assigned',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '✅ Vehicle Assigned' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
      ]},
    ],
  },
  vehicle_shutdown_warning: {
    name: 'vehicle_shutdown_warning',
    language: 'en_US',
    components: [
      { type: 'header', parameters: [{ type: 'text', text: '⚠️ Vehicle Shutdown Warning' }] },
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
        { type: 'text', text: '{{3}}' },
        { type: 'text', text: '{{4}}' },
      ]},
    ],
  },

  // ─── Nigeria-Specific (Pidgin / Yoruba) ───
  police_report_request_pidgin: {
    name: 'police_report_request_pidgin',
    language: 'pcm',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
      ]},
    ],
  },
  police_report_request_yoruba: {
    name: 'police_report_request_yoruba',
    language: 'yo',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: '{{1}}' },
        { type: 'text', text: '{{2}}' },
      ]},
    ],
  },
};

export type WhatsAppMessageType = 
  | 'booking_confirmed'
  | 'owner_vehicle_booked'
  | 'pickup_reminder'
  | 'return_reminder'
  | 'payment_reminder_72h'
  | 'payment_reminder_60h'
  | 'payment_reminder_48h'
  | 'payment_reminder_36h'
  | 'payment_reminder_24h'
  | 'payment_reminder_12h'
  | 'payment_overdue_8h'
  | 'payment_overdue_16h'
  | 'payment_overdue_24h_final'
  | 'weekly_payment_overdue_12h'
  | 'weekly_payment_overdue_24h'
  | 'weekly_payment_overdue_36h_final'
  | 'vehicle_locked'
  | 'vehicle_unlocked'
  | 'plan_downgraded'
  | 'payment_success'
  | 'payment_confirmation'
  | 'self_service_menu'
  | 'payment_link'
  | 'rental_status'
  | 'help'
  | 'driver_welcome'
  | 'owner_welcome'
  | 'document_request'
  | 'document_verified'
  | 'document_rejected'
  | 'vehicle_listed'
  | 'vehicle_assigned'
  | 'vehicle_shutdown_warning'
  | 'police_report_pidgin'
  | 'police_report_yoruba';
