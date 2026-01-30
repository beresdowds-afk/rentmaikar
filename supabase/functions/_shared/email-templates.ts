/**
 * Rentmaikar Email Templates Library
 * Production-ready HTML email templates for all transactional emails
 */

import { EMAIL_CONFIG, formatSenderEmail } from "./email-config.ts";

// Base email wrapper with consistent styling
const emailWrapper = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Rentmaikar</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 20px;
    }
    h2 {
      color: #1e293b;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .secondary-button {
      display: inline-block;
      background: #10b981;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
    }
    .info-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .success-box {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .error-box {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #2563eb;
      text-align: center;
      padding: 20px;
      background: #eff6ff;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-label {
      color: #64748b;
      font-weight: 500;
    }
    .detail-value {
      color: #1e293b;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 13px;
    }
    .amount {
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Rentmaikar</div>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Rentmaikar. All rights reserved.</p>
      <p>Email: ${EMAIL_CONFIG.support}</p>
    </div>
  </div>
</body>
</html>
`;

// Escape HTML to prevent XSS
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Format currency based on region
const formatCurrency = (amount: number, currency: 'USD' | 'NGN'): string => {
  const symbol = currency === 'NGN' ? '₦' : '$';
  return `${symbol}${amount.toLocaleString()}`;
};

// ==================== EMAIL TEMPLATES ====================

/**
 * Welcome Email - Sent when user signs up
 */
export const welcomeEmail = (data: {
  firstName: string;
  userType: 'driver' | 'owner';
  dashboardUrl: string;
}) => {
  const content = `
    <h1>Welcome to Rentmaikar, ${escapeHtml(data.firstName)}! 👋</h1>
    
    <p>You're now part of a smarter way to ${data.userType === 'driver' ? 'rent vehicles' : 'earn from your car'}.</p>
    
    <div class="info-box">
      <h2>Next Steps:</h2>
      <ul>
        <li>✔ Complete your profile</li>
        <li>✔ Verify your documents</li>
        <li>✔ ${data.userType === 'driver' ? 'Start renting' : 'List your vehicle'}</li>
      </ul>
    </div>
    
    <a href="${data.dashboardUrl}" class="cta-button">
      Go to Dashboard →
    </a>
    
    <p style="color: #64748b; font-size: 14px;">
      Need help getting started? Reply to this email or contact our support team.
    </p>
  `;
  
  return {
    subject: `Welcome to Rentmaikar 🚗`,
    html: emailWrapper(content, 'Welcome'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * OTP Verification Email
 */
export const otpEmail = (data: {
  firstName: string;
  otp: string;
  expiryMinutes: number;
}) => {
  const content = `
    <h1>Your Verification Code</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, use this code to continue:</p>
    
    <div class="otp-code">${escapeHtml(data.otp)}</div>
    
    <div class="warning-box">
      ⏰ This code expires in ${data.expiryMinutes} minutes.
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      If you didn't request this code, please ignore this email.
    </p>
  `;
  
  return {
    subject: `Your Rentmaikar verification code`,
    html: emailWrapper(content, 'Verification Code'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Booking Confirmation Email - Sent to Driver
 */
export const bookingConfirmationEmail = (data: {
  firstName: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  amount: number;
  currency: 'USD' | 'NGN';
  bookingId: string;
}) => {
  const content = `
    <div class="success-box">
      ✅ Booking Confirmed
    </div>
    
    <h1>Your Booking is Confirmed! 🚘</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, your vehicle rental has been confirmed.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Booking ID</span>
        <span class="detail-value">${escapeHtml(data.bookingId)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Pickup</span>
        <span class="detail-value">${escapeHtml(data.pickupDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Return</span>
        <span class="detail-value">${escapeHtml(data.returnDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(data.pickupLocation)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Amount</span>
        <span class="detail-value amount">${formatCurrency(data.amount, data.currency)}</span>
      </div>
    </div>
    
    <p>Please arrive with your valid ID at the pickup location.</p>
  `;
  
  return {
    subject: `Booking Confirmed – ${data.vehicleName}`,
    html: emailWrapper(content, 'Booking Confirmation'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Owner Vehicle Booked Notification
 */
export const ownerBookingNotificationEmail = (data: {
  firstName: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  estimatedEarnings: number;
  currency: 'USD' | 'NGN';
}) => {
  const content = `
    <div class="success-box">
      🎉 Great News!
    </div>
    
    <h1>Your Vehicle Has Been Booked!</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, your vehicle has just been rented.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Rental Period</span>
        <span class="detail-value">${escapeHtml(data.pickupDate)} → ${escapeHtml(data.returnDate)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Estimated Earnings</span>
        <span class="detail-value amount">${formatCurrency(data.estimatedEarnings, data.currency)}</span>
      </div>
    </div>
    
    <p>You'll be notified once the pickup happens.</p>
  `;
  
  return {
    subject: `🎉 Your vehicle ${data.vehicleName} has been booked!`,
    html: emailWrapper(content, 'Vehicle Booked'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Payment Receipt Email
 */
export const paymentReceiptEmail = (data: {
  firstName: string;
  amount: number;
  currency: 'USD' | 'NGN';
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  vehicleName: string;
  periodStart: string;
  periodEnd: string;
}) => {
  const content = `
    <div class="success-box">
      ✅ Payment Received
    </div>
    
    <h1>Payment Receipt</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, we've received your payment.</p>
    
    <div class="info-box">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="amount">${formatCurrency(data.amount, data.currency)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Transaction ID</span>
        <span class="detail-value">${escapeHtml(data.transactionId)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Date</span>
        <span class="detail-value">${escapeHtml(data.paymentDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Method</span>
        <span class="detail-value">${escapeHtml(data.paymentMethod)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Rental Period</span>
        <span class="detail-value">${escapeHtml(data.periodStart)} - ${escapeHtml(data.periodEnd)}</span>
      </div>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Keep this email as your official receipt for accounting purposes.
    </p>
  `;
  
  return {
    subject: `Payment Receipt – ${formatCurrency(data.amount, data.currency)}`,
    html: emailWrapper(content, 'Payment Receipt'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Payment Reminder Email (Pre-due)
 */
export const paymentReminderEmail = (data: {
  firstName: string;
  amount: number;
  currency: 'USD' | 'NGN';
  dueDate: string;
  hoursRemaining: number;
  vehicleName: string;
  paymentUrl: string;
}) => {
  const urgency = data.hoursRemaining <= 24 ? 'error-box' : data.hoursRemaining <= 48 ? 'warning-box' : 'info-box';
  const urgencyText = data.hoursRemaining <= 24 
    ? '⚠️ Payment Due Tomorrow' 
    : data.hoursRemaining <= 48 
      ? '⏰ Payment Due Soon' 
      : '📅 Upcoming Payment';
  
  const content = `
    <div class="${urgency}">
      ${urgencyText}
    </div>
    
    <h1>Payment Reminder</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, this is a reminder about your upcoming rental payment.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Amount Due</span>
        <span class="detail-value amount">${formatCurrency(data.amount, data.currency)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${escapeHtml(data.dueDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time Remaining</span>
        <span class="detail-value">${data.hoursRemaining} hours</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
    </div>
    
    <a href="${data.paymentUrl}" class="cta-button">
      Pay Now →
    </a>
    
    <p style="color: #64748b; font-size: 14px;">
      Early payment helps you avoid any service interruption.
    </p>
  `;
  
  return {
    subject: data.hoursRemaining <= 24 
      ? `⚠️ Payment Due Tomorrow – ${formatCurrency(data.amount, data.currency)}`
      : `📅 Payment Reminder – Due ${data.dueDate}`,
    html: emailWrapper(content, 'Payment Reminder'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Payment Overdue Warning Email
 */
export const paymentOverdueEmail = (data: {
  firstName: string;
  amount: number;
  currency: 'USD' | 'NGN';
  hoursOverdue: number;
  vehicleName: string;
  paymentUrl: string;
  isWeeklyPlan: boolean;
  lockdownHours: number;
}) => {
  const isUrgent = data.hoursOverdue >= data.lockdownHours - 8;
  
  const content = `
    <div class="error-box">
      🚨 Payment Overdue
    </div>
    
    <h1>Urgent: Payment Required</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, your rental payment is ${data.hoursOverdue} hours overdue.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Amount Due</span>
        <span class="detail-value amount">${formatCurrency(data.amount, data.currency)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Overdue By</span>
        <span class="detail-value" style="color: #ef4444;">${data.hoursOverdue} hours</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
    </div>
    
    ${isUrgent ? `
    <div class="error-box">
      <strong>⛔ Final Warning:</strong> If payment is not received within the next ${data.lockdownHours - data.hoursOverdue} hours, 
      your vehicle access may be restricted.
      ${data.isWeeklyPlan ? ' Your plan will also be downgraded to daily payment.' : ''}
    </div>
    ` : `
    <div class="warning-box">
      Please make payment immediately to avoid service interruption.
      ${data.isWeeklyPlan ? ' Continued non-payment may result in plan downgrade to daily payment.' : ''}
    </div>
    `}
    
    <a href="${data.paymentUrl}" class="cta-button">
      Pay Now →
    </a>
  `;
  
  return {
    subject: `🚨 URGENT: Payment Overdue – ${formatCurrency(data.amount, data.currency)}`,
    html: emailWrapper(content, 'Payment Overdue'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Vehicle Lockdown Notification Email
 */
export const vehicleLockdownEmail = (data: {
  firstName: string;
  vehicleName: string;
  amountDue: number;
  currency: 'USD' | 'NGN';
  lockdownTime: string;
  reason: string;
  paymentUrl: string;
}) => {
  const content = `
    <div class="error-box">
      🔒 Vehicle Restricted
    </div>
    
    <h1>Vehicle Access Restricted</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, your rented vehicle has been temporarily restricted due to non-payment.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount Due</span>
        <span class="detail-value amount">${formatCurrency(data.amountDue, data.currency)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Restriction Time</span>
        <span class="detail-value">${escapeHtml(data.lockdownTime)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Reason</span>
        <span class="detail-value">${escapeHtml(data.reason)}</span>
      </div>
    </div>
    
    <h2>To Restore Access:</h2>
    <ol>
      <li>Complete the outstanding payment</li>
      <li>Vehicle access will be restored within 30 seconds of payment confirmation</li>
    </ol>
    
    <a href="${data.paymentUrl}" class="cta-button">
      Pay Now to Restore Access →
    </a>
    
    <p style="color: #64748b; font-size: 14px;">
      If you believe this is an error, please contact our support team immediately.
    </p>
  `;
  
  return {
    subject: `🔒 Vehicle Restricted – Action Required`,
    html: emailWrapper(content, 'Vehicle Restricted'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Vehicle Unlocked Notification Email
 */
export const vehicleUnlockedEmail = (data: {
  firstName: string;
  vehicleName: string;
  unlockTime: string;
}) => {
  const content = `
    <div class="success-box">
      ✅ Vehicle Restored
    </div>
    
    <h1>Vehicle Access Restored</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, great news! Your vehicle access has been restored.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Restored At</span>
        <span class="detail-value">${escapeHtml(data.unlockTime)}</span>
      </div>
    </div>
    
    <p>Thank you for resolving this promptly. Please ensure timely payments going forward to avoid any future interruptions.</p>
  `;
  
  return {
    subject: `✅ Vehicle Access Restored`,
    html: emailWrapper(content, 'Vehicle Restored'),
    from: formatSenderEmail('noreply'),
  };
};

/**
 * Plan Downgrade Notification Email
 */
export const planDowngradeEmail = (data: {
  firstName: string;
  vehicleName: string;
  previousPlan: string;
  newPlan: string;
  reason: string;
}) => {
  const content = `
    <div class="warning-box">
      🔁 Plan Updated
    </div>
    
    <h1>Your Rental Plan Has Changed</h1>
    
    <p>Hi ${escapeHtml(data.firstName)}, your rental plan has been updated.</p>
    
    <div class="info-box">
      <div class="detail-row">
        <span class="detail-label">Vehicle</span>
        <span class="detail-value">${escapeHtml(data.vehicleName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Previous Plan</span>
        <span class="detail-value">${escapeHtml(data.previousPlan)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">New Plan</span>
        <span class="detail-value">${escapeHtml(data.newPlan)}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Reason</span>
        <span class="detail-value">${escapeHtml(data.reason)}</span>
      </div>
    </div>
    
    <div class="warning-box">
      <strong>Important:</strong> Daily payments now apply. Higher daily charges will be in effect.
      Please ensure timely payment to avoid vehicle restriction.
    </div>
    
    <p>If you have questions about your new plan, please contact our support team.</p>
  `;
  
  return {
    subject: `🔁 Rental Plan Updated – Action Required`,
    html: emailWrapper(content, 'Plan Updated'),
    from: formatSenderEmail('noreply'),
  };
};

export type EmailTemplate = 
  | 'welcome'
  | 'otp'
  | 'booking_confirmation'
  | 'owner_booking_notification'
  | 'payment_receipt'
  | 'payment_reminder'
  | 'payment_overdue'
  | 'vehicle_lockdown'
  | 'vehicle_unlocked'
  | 'plan_downgrade';
