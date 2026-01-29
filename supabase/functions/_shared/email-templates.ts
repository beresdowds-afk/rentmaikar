/**
 * Comprehensive Email Templates for Rentmaikar
 * All transactional email templates using HTML for high deliverability
 */

import { EMAIL_CONFIG } from "./email-config.ts";

// Types
export interface TemplateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  vehicleName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  amount?: number;
  currency?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupTime?: string;
  returnTime?: string;
  dueDate?: string;
  otpCode?: string;
  reason?: string;
  dashboardUrl?: string;
  paymentUrl?: string;
  hoursRemaining?: number;
  planType?: 'daily' | 'weekly';
  bookingId?: string;
  transactionId?: string;
}

// Helpers
const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const formatAmount = (amount: number, currency: string): string => {
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString()}`;
};

const baseStyles = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #0066cc; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .content { padding: 30px 0; }
    .footer { padding: 20px 0; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .btn:hover { background-color: #0052a3; }
    .highlight { background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .warning { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .danger { background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc3545; }
    .success { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745; }
    .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0066cc; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
`;

const wrapTemplate = (content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseStyles}
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Rentmaikar</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Rentmaikar Ltd</p>
      <p>Email: ${EMAIL_CONFIG.support}</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// ============= ONBOARDING TEMPLATES =============

export const welcomeEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: "Welcome to Rentmaikar 🚗 Let's get you started",
  html: wrapTemplate(`
    <h2>Welcome to Rentmaikar, ${data.firstName || 'there'} 👋</h2>
    <p>You're now part of a smarter way to rent and earn from vehicles.</p>
    
    <div class="highlight">
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>✔ Complete your profile</li>
        <li>✔ Verify your documents</li>
        <li>✔ Start renting or earning</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app/auth'}" class="btn">Go to Dashboard</a>
    </p>
    
    <p>Need help getting started? Our support team is here for you.</p>
  `)
});

export const otpVerificationEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: "Your Rentmaikar Verification Code",
  html: wrapTemplate(`
    <h2>Your Verification Code</h2>
    <p>Use this code to complete your verification:</p>
    
    <div class="otp-code">${data.otpCode}</div>
    
    <div class="warning">
      <p><strong>⏰ This code expires in 10 minutes.</strong></p>
      <p>Do not share this code with anyone. Rentmaikar will never ask for your verification code.</p>
    </div>
    
    <p>If you didn't request this code, please ignore this email or contact support.</p>
  `)
});

export const driverApprovedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: "🎉 Your Rentmaikar Driver Account is Approved!",
  html: wrapTemplate(`
    <h2>Congratulations, ${data.firstName}! 🎉</h2>
    <p>Your driver application has been approved. You're now ready to start renting vehicles on Rentmaikar.</p>
    
    <div class="success">
      <p><strong>What's Next:</strong></p>
      <ul>
        <li>✔ Browse available vehicles in your area</li>
        <li>✔ Submit rental requests</li>
        <li>✔ Complete your first booking</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app/driver/dashboard'}" class="btn">View Available Vehicles</a>
    </p>
    
    <p><strong>Pro Tip:</strong> Pin your dashboard to your browser for quick access!</p>
  `)
});

export const driverRejectedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: "Update on Your Rentmaikar Application",
  html: wrapTemplate(`
    <h2>Hi ${data.firstName},</h2>
    <p>Thank you for your interest in Rentmaikar. After reviewing your application, we're unable to approve it at this time.</p>
    
    ${data.reason ? `
    <div class="warning">
      <p><strong>Reason:</strong> ${data.reason}</p>
    </div>
    ` : ''}
    
    <p>You may reapply after addressing the issues above. If you believe this is an error, please contact our support team.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="mailto:${EMAIL_CONFIG.support}" class="btn">Contact Support</a>
    </p>
  `)
});

export const ownerApprovedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: "🎉 Your Rentmaikar Owner Account is Approved!",
  html: wrapTemplate(`
    <h2>Welcome to the Rentmaikar Owner Family, ${data.firstName}! 🎉</h2>
    <p>Your owner application has been approved. You can now start listing your vehicles and earning.</p>
    
    <div class="success">
      <p><strong>Start Earning:</strong></p>
      <ul>
        <li>✔ List your first vehicle</li>
        <li>✔ Set your weekly rates</li>
        <li>✔ Review driver applications</li>
        <li>✔ Collect weekly payments</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app/owner/dashboard'}" class="btn">List Your Vehicle</a>
    </p>
  `)
});

// ============= BOOKING TEMPLATES =============

export const bookingConfirmationEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `Booking Confirmed – ${data.vehicleName || 'Your Vehicle'}`,
  html: wrapTemplate(`
    <h2>Booking Confirmed 🚘</h2>
    <p>Hi ${data.firstName}, your booking has been confirmed!</p>
    
    <div class="highlight">
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName || `${data.vehicleMake} ${data.vehicleModel}`}</li>
        <li><strong>Booking ID:</strong> ${data.bookingId}</li>
        <li><strong>Pickup:</strong> ${data.pickupDate} ${data.pickupTime ? `at ${data.pickupTime}` : ''}</li>
        <li><strong>Return:</strong> ${data.returnDate} ${data.returnTime ? `at ${data.returnTime}` : ''}</li>
        <li><strong>Amount:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
      </ul>
    </div>
    
    <p><strong>📍 Pickup location details are available in your dashboard.</strong></p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app/driver/dashboard'}" class="btn">View Booking Details</a>
    </p>
    
    <p>Please arrive with a valid ID for vehicle pickup.</p>
  `)
});

export const ownerVehicleBookedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `🎉 Your Vehicle Has Been Booked!`,
  html: wrapTemplate(`
    <h2>Good News, ${data.firstName}! 🎉</h2>
    <p>Your vehicle <strong>${data.vehicleName || `${data.vehicleMake} ${data.vehicleModel}`}</strong> has just been booked.</p>
    
    <div class="success">
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Rental Period:</strong> ${data.pickupDate} → ${data.returnDate}</li>
        <li><strong>Estimated Earnings:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
      </ul>
    </div>
    
    <p>You'll be notified once the pickup is completed.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app/owner/dashboard'}" class="btn">View Booking</a>
    </p>
  `)
});

// ============= PAYMENT TEMPLATES =============

export const paymentReceiptEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `Payment Receipt – ${formatAmount(data.amount || 0, data.currency || 'USD')}`,
  html: wrapTemplate(`
    <h2>Payment Received ✅</h2>
    <p>Hi ${data.firstName}, thank you for your payment.</p>
    
    <div class="success">
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li><strong>Amount:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
        <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
        <li><strong>Vehicle:</strong> ${data.vehicleName || `${data.vehicleMake} ${data.vehicleModel}`}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <p>This serves as your official receipt. Please keep it for your records.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://rentmaikar.lovable.app'}" class="btn">View Payment History</a>
    </p>
  `)
});

// ============= PAYMENT REMINDER TEMPLATES (PRE-DUE) =============

export const paymentReminderPreDue72h = (data: TemplateData): { subject: string; html: string } => ({
  subject: `Friendly Reminder – Payment Due in 3 Days`,
  html: wrapTemplate(`
    <h2>👋 Friendly Payment Reminder</h2>
    <p>Hi ${data.firstName}, this is a quick heads-up that your ${data.planType} rental payment is due in 3 days.</p>
    
    <div class="highlight">
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName || `${data.vehicleMake} ${data.vehicleModel}`}</li>
        <li><strong>Amount Due:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
        <li><strong>Due Date:</strong> ${data.dueDate}</li>
      </ul>
    </div>
    
    <p>You can pay early anytime to stay uninterrupted.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl || 'https://rentmaikar.lovable.app'}" class="btn">Make Payment</a>
    </p>
  `)
});

export const paymentReminderPreDue48h = (data: TemplateData): { subject: string; html: string } => ({
  subject: `Payment Reminder – 2 Days Remaining`,
  html: wrapTemplate(`
    <h2>📅 Payment Reminder – 2 Days Left</h2>
    <p>Hi ${data.firstName}, your ${data.planType} Rentmaikar payment is due in 2 days.</p>
    
    <div class="highlight">
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName}</li>
        <li><strong>Amount:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
        <li><strong>Due Date:</strong> ${data.dueDate}</li>
      </ul>
    </div>
    
    <p>Early payment keeps your ride uninterrupted.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Pay Now</a>
    </p>
  `)
});

export const paymentReminderPreDue24h = (data: TemplateData): { subject: string; html: string } => ({
  subject: `🚨 Payment Due Tomorrow`,
  html: wrapTemplate(`
    <h2>🚨 Payment Due Tomorrow</h2>
    <p>Hi ${data.firstName}, this is a reminder that your ${data.planType} rental payment is due tomorrow.</p>
    
    <div class="warning">
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName}</li>
        <li><strong>Amount Due:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
        <li><strong>Due Date:</strong> ${data.dueDate}</li>
      </ul>
    </div>
    
    <p>Paying today helps you avoid any disruption to your rental.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Pay Now</a>
    </p>
  `)
});

export const paymentReminderPreDue12h = (data: TemplateData): { subject: string; html: string } => ({
  subject: `⏳ Final Reminder – Payment Due Today`,
  html: wrapTemplate(`
    <h2>⏳ Final Reminder – Payment Due Today</h2>
    <p>Hi ${data.firstName}, your ${data.planType} Rentmaikar payment is due today.</p>
    
    <div class="warning">
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName}</li>
        <li><strong>Amount Due:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
      </ul>
    </div>
    
    <p>Please make payment before the due time to keep your rental active.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Pay Now</a>
    </p>
  `)
});

// ============= OVERDUE / LOCKDOWN TEMPLATES =============

export const paymentOverdueWarningEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `⚠️ Payment Overdue – Action Required`,
  html: wrapTemplate(`
    <h2>⚠️ Payment Overdue</h2>
    <p>Hi ${data.firstName}, your ${data.planType} rental payment is now overdue.</p>
    
    <div class="warning">
      <ul>
        <li><strong>Vehicle:</strong> ${data.vehicleName}</li>
        <li><strong>Amount Overdue:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</li>
        <li><strong>Hours Remaining:</strong> ${data.hoursRemaining} hours until vehicle restriction</li>
      </ul>
    </div>
    
    <p>Please make payment immediately to avoid service interruption.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Pay Now</a>
    </p>
  `)
});

export const paymentFinalWarningEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `⛔ FINAL NOTICE – Vehicle Lockdown Imminent`,
  html: wrapTemplate(`
    <h2>⛔ FINAL NOTICE</h2>
    <p>Hi ${data.firstName}, your ${data.planType} payment is critically overdue.</p>
    
    <div class="danger">
      <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
      <p><strong>Amount Due:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</p>
      <p><strong>⚠️ Vehicle restriction is now authorized.</strong></p>
      ${data.planType === 'daily' ? '<p>Daily payment plans are now FORBIDDEN for your account.</p>' : ''}
    </div>
    
    <p>Pay immediately to avoid vehicle lockdown.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Pay Immediately</a>
    </p>
    
    <p>If you need assistance, contact our support team immediately.</p>
  `)
});

export const vehicleLockedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `🔒 Vehicle Restricted – Payment Required`,
  html: wrapTemplate(`
    <h2>🔒 Vehicle Restricted</h2>
    <p>Hi ${data.firstName}, your rented vehicle has been restricted due to non-payment.</p>
    
    <div class="danger">
      <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
      <p><strong>Amount Owed:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</p>
    </div>
    
    <p><strong>To restore access:</strong></p>
    <ol>
      <li>Complete your outstanding payment</li>
      <li>Vehicle access will be restored automatically</li>
    </ol>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl || data.dashboardUrl}" class="btn">Complete Payment</a>
    </p>
    
    <p>If you believe this is an error, contact support immediately at ${EMAIL_CONFIG.support}</p>
  `)
});

export const vehicleUnlockedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `✅ Vehicle Access Restored`,
  html: wrapTemplate(`
    <h2>✅ Vehicle Access Restored</h2>
    <p>Hi ${data.firstName}, your payment has been received and vehicle access has been restored.</p>
    
    <div class="success">
      <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
      <p><strong>Payment Received:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</p>
      <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
    </div>
    
    <p>Thank you for resolving this promptly. Your rental continues as normal.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl}" class="btn">View Dashboard</a>
    </p>
  `)
});

export const planDowngradedEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `🔁 Rental Plan Updated – Now on Daily Plan`,
  html: wrapTemplate(`
    <h2>🔁 Plan Updated</h2>
    <p>Hi ${data.firstName}, your rental plan has been changed from WEEKLY to DAILY due to non-payment.</p>
    
    <div class="warning">
      <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
      <p><strong>New Plan:</strong> Daily</p>
      <p>Daily payments now apply. A 10% administrative surcharge has been added.</p>
    </div>
    
    <p>Please ensure timely daily payments to avoid vehicle restriction.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl}" class="btn">View Payment Schedule</a>
    </p>
  `)
});

// ============= SELF-SERVICE PAYMENT TEMPLATES =============

export const selfServicePaymentLinkEmail = (data: TemplateData): { subject: string; html: string } => ({
  subject: `Your Rentmaikar Payment Link`,
  html: wrapTemplate(`
    <h2>Complete Your Payment</h2>
    <p>Hi ${data.firstName}, here's your secure payment link.</p>
    
    <div class="highlight">
      <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
      <p><strong>Amount Due:</strong> ${formatAmount(data.amount || 0, data.currency || 'USD')}</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentUrl}" class="btn">Pay Securely</a>
    </p>
    
    <p>This link expires in 24 hours. If you need a new link, reply PAY on WhatsApp.</p>
  `)
});

// Export template map for dynamic selection
export const EMAIL_TEMPLATES = {
  welcome: welcomeEmail,
  otp_verification: otpVerificationEmail,
  driver_approved: driverApprovedEmail,
  driver_rejected: driverRejectedEmail,
  owner_approved: ownerApprovedEmail,
  booking_confirmation: bookingConfirmationEmail,
  owner_vehicle_booked: ownerVehicleBookedEmail,
  payment_receipt: paymentReceiptEmail,
  payment_reminder_72h: paymentReminderPreDue72h,
  payment_reminder_48h: paymentReminderPreDue48h,
  payment_reminder_24h: paymentReminderPreDue24h,
  payment_reminder_12h: paymentReminderPreDue12h,
  payment_overdue_warning: paymentOverdueWarningEmail,
  payment_final_warning: paymentFinalWarningEmail,
  vehicle_locked: vehicleLockedEmail,
  vehicle_unlocked: vehicleUnlockedEmail,
  plan_downgraded: planDowngradedEmail,
  self_service_payment_link: selfServicePaymentLinkEmail,
} as const;

export type EmailTemplateName = keyof typeof EMAIL_TEMPLATES;
