/**
 * WhatsApp Message Templates for Rentmaikar
 * These are for Twilio WhatsApp notifications (not ManyChat)
 */

export interface WhatsAppTemplateData {
  firstName?: string;
  vehicleName?: string;
  amount?: number;
  currency?: string;
  pickupDate?: string;
  returnDate?: string;
  dueDate?: string;
  hoursRemaining?: number;
  hoursOverdue?: number;
  planType?: 'daily' | 'weekly';
  paymentUrl?: string;
  notificationNumber?: number;
}

const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const formatAmount = (amount: number, currency: string): string => {
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString()}`;
};

// ============= BOOKING FLOWS =============

export const bookingConfirmedMessage = (data: WhatsAppTemplateData): string => `
🚗 *Booking Confirmed!*

Hi ${data.firstName || 'there'}, your booking is confirmed.

Vehicle: ${data.vehicleName}
Pickup: ${data.pickupDate}
Return: ${data.returnDate}

📍 Pickup location details are in your dashboard.

Need help? Reply *HELP*
`.trim();

export const ownerVehicleBookedMessage = (data: WhatsAppTemplateData): string => `
🎉 *Good news!*

Your vehicle ${data.vehicleName} has just been booked.

Rental period:
${data.pickupDate} → ${data.returnDate}

💰 Estimated earnings: ${formatAmount(data.amount || 0, data.currency || 'USD')}

You'll be notified once pickup happens.
`.trim();

export const pickupReminderMessage = (data: WhatsAppTemplateData): string => `
⏰ *Pickup Reminder*

Hi ${data.firstName}, this is a reminder that your Rentmaikar pickup is tomorrow.

Vehicle: ${data.vehicleName}
Time: ${data.pickupDate}

Please arrive with valid ID.
Reply *OK* to confirm.
`.trim();

export const returnReminderMessage = (data: WhatsAppTemplateData): string => `
🔔 *Return Reminder*

Your Rentmaikar rental ends today.

Vehicle: ${data.vehicleName}
Return time: ${data.returnDate}

Late returns may attract additional charges.
Reply *DONE* once returned.
`.trim();

// ============= WEEKLY PAYMENT PRE-DUE REMINDERS =============

export const weeklyPaymentReminder72h = (data: WhatsAppTemplateData): string => `
👋 *Friendly Reminder – Rentmaikar*

Hi ${data.firstName}, this is a quick heads-up that your weekly rental payment is due in 3 days.

🚗 Vehicle: ${data.vehicleName}
💰 Amount due: ${formatAmount(data.amount || 0, data.currency || 'USD')}
📅 Due date: ${data.dueDate}

You can pay early anytime to stay uninterrupted.
Reply *PAY* to make payment now.
`.trim();

export const weeklyPaymentReminder60h = (data: WhatsAppTemplateData): string => `
⏰ *Rentmaikar Reminder*

Your weekly rental payment is due soon.

⏳ Time remaining: about 2½ days
💰 Amount: ${formatAmount(data.amount || 0, data.currency || 'USD')}

Pay early to avoid last-minute issues.
Reply *PAY* to continue.
`.trim();

export const weeklyPaymentReminder48h = (data: WhatsAppTemplateData): string => `
📅 *Payment Reminder – 2 Days Left*

Hi ${data.firstName}, your weekly Rentmaikar payment is due in 2 days.

Vehicle: ${data.vehicleName}
Amount: ${formatAmount(data.amount || 0, data.currency || 'USD')}

Early payment keeps your ride uninterrupted.
Reply *PAY* to make payment.
`.trim();

export const weeklyPaymentReminder36h = (data: WhatsAppTemplateData): string => `
⚠️ *Important Reminder*

Your weekly payment is due in about 36 hours.

Please ensure payment is completed on or before the due date to avoid service interruption.

Reply *PAY* to pay now.
`.trim();

export const weeklyPaymentReminder24h = (data: WhatsAppTemplateData): string => `
🚨 *Due Tomorrow – Rentmaikar*

This is a reminder that your weekly rental payment is due tomorrow.

💰 Amount: ${formatAmount(data.amount || 0, data.currency || 'USD')}
📅 Due date: ${data.dueDate}

Paying today helps you avoid any disruption.
Reply *PAY* to continue.
`.trim();

export const weeklyPaymentReminder12h = (data: WhatsAppTemplateData): string => `
⏳ *Final Reminder – Payment Due Today*

Hi ${data.firstName}, your weekly Rentmaikar payment is due today.

💰 Amount due: ${formatAmount(data.amount || 0, data.currency || 'USD')}

Please make payment before the due time to keep your rental active.
Reply *PAY* to pay now.
`.trim();

// ============= OVERDUE / LOCKDOWN MESSAGES =============

export const dailyPaymentOverdue8h = (data: WhatsAppTemplateData): string => `
⚠️ *Payment Reminder – Rentmaikar*

Hi ${data.firstName}, your daily rental payment is overdue.

⏰ Overdue by: 8 hours
Vehicle: ${data.vehicleName}

Please make payment immediately to avoid vehicle restriction.

Need help? Reply *PAYMENT*
`.trim();

export const dailyPaymentOverdue16h = (data: WhatsAppTemplateData): string => `
🚨 *Second Reminder – Action Required*

Your Rentmaikar daily payment is now 16 hours overdue.

⚠️ Vehicle restriction may occur if payment is not made within the next 8 hours.

Vehicle: ${data.vehicleName}

Reply *PAY* after completing payment.
`.trim();

export const dailyPaymentOverdue24h = (data: WhatsAppTemplateData): string => `
⛔ *FINAL NOTICE – Vehicle Lockdown Imminent*

Your daily payment is now 24 hours overdue.

Vehicle: ${data.vehicleName}

If payment is not received immediately, your vehicle may be locked remotely.

Please check your email for full details.
`.trim();

export const weeklyPaymentOverdue12h = (data: WhatsAppTemplateData): string => `
⚠️ *Payment Reminder – Weekly Plan*

Hi ${data.firstName}, your weekly Rentmaikar payment is overdue.

⏰ Overdue by: 12 hours
Vehicle: ${data.vehicleName}

Please make payment to avoid plan downgrade or vehicle restriction.
`.trim();

export const weeklyPaymentOverdue24h = (data: WhatsAppTemplateData): string => `
🚨 *Important Notice – Plan Downgrade Warning*

Your weekly payment is now 24 hours overdue.

⚠️ If payment is not received within 12 hours:
• Your plan will be downgraded to DAILY
• Higher daily charges will apply

Vehicle: ${data.vehicleName}
`.trim();

export const weeklyPaymentOverdue36h = (data: WhatsAppTemplateData): string => `
⛔ *FINAL NOTICE – Plan Downgrade & Lockdown Risk*

Your weekly Rentmaikar payment is now 36 hours overdue.

Your plan will be downgraded to DAILY immediately.
Vehicle restriction may follow if daily payments are missed.

Please check your email for full breakdown.
`.trim();

export const vehicleLockedMessage = (data: WhatsAppTemplateData): string => `
🔒 *Vehicle Locked – Rentmaikar*

Your rented vehicle ${data.vehicleName} has been restricted due to non-payment.

To restore access:
1️⃣ Complete outstanding payment
2️⃣ Contact Rentmaikar support

Email details have been sent.
`.trim();

export const vehicleUnlockedMessage = (data: WhatsAppTemplateData): string => `
✅ *Vehicle Restored*

Your payment has been received.
Vehicle access has been restored.

Thank you for resolving this promptly.
`.trim();

export const planDowngradedMessage = (data: WhatsAppTemplateData): string => `
🔁 *Plan Updated – Rentmaikar*

Your rental plan has been changed from WEEKLY to DAILY due to non-payment.

Daily payments now apply.
Please ensure timely payment to avoid vehicle restriction.
`.trim();

// ============= SELF-SERVICE PAYMENT =============

export const selfServicePaymentRequest = (data: WhatsAppTemplateData): string => `
💳 *Payment Link Ready*

Hi ${data.firstName}, here's your secure payment link:

${data.paymentUrl}

Amount: ${formatAmount(data.amount || 0, data.currency || 'USD')}
Vehicle: ${data.vehicleName}

This link expires in 24 hours.
`.trim();

export const paymentConfirmedMessage = (data: WhatsAppTemplateData): string => `
✅ *Payment Successful*

We've received your payment of ${formatAmount(data.amount || 0, data.currency || 'USD')}.

Your booking is active.
Official receipt has been sent to your email.
`.trim();

// ============= SUPPORT =============

export const supportHelpMessage = (): string => `
🛠 *Rentmaikar Support*

What do you need help with?

Reply with:
1️⃣ - Booking issue
2️⃣ - Payment issue
3️⃣ - Vehicle issue
4️⃣ - Talk to human
`.trim();

// Export template map
export const WHATSAPP_TEMPLATES = {
  booking_confirmed: bookingConfirmedMessage,
  owner_vehicle_booked: ownerVehicleBookedMessage,
  pickup_reminder: pickupReminderMessage,
  return_reminder: returnReminderMessage,
  weekly_reminder_72h: weeklyPaymentReminder72h,
  weekly_reminder_60h: weeklyPaymentReminder60h,
  weekly_reminder_48h: weeklyPaymentReminder48h,
  weekly_reminder_36h: weeklyPaymentReminder36h,
  weekly_reminder_24h: weeklyPaymentReminder24h,
  weekly_reminder_12h: weeklyPaymentReminder12h,
  daily_overdue_8h: dailyPaymentOverdue8h,
  daily_overdue_16h: dailyPaymentOverdue16h,
  daily_overdue_24h: dailyPaymentOverdue24h,
  weekly_overdue_12h: weeklyPaymentOverdue12h,
  weekly_overdue_24h: weeklyPaymentOverdue24h,
  weekly_overdue_36h: weeklyPaymentOverdue36h,
  vehicle_locked: vehicleLockedMessage,
  vehicle_unlocked: vehicleUnlockedMessage,
  plan_downgraded: planDowngradedMessage,
  self_service_payment: selfServicePaymentRequest,
  payment_confirmed: paymentConfirmedMessage,
  support_help: supportHelpMessage,
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;
