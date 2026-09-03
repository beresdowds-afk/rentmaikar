/**
 * Centralized Email Configuration
 * All sender and contact email addresses for the platform
 */

export const EMAIL_CONFIG = {
  // Support emails - unified for all regions
  support: "support@rentmaikar.com",
  
  // Transactional/automated notifications
  noreply: "noreply@rentmaikar.com",
  
  // Administrative alerts
  admin: "admin@rentmaikar.com",
  
  // Legal/Privacy inquiries
  privacy: "privacy@rentmaikar.com",
  
  // Data Protection Officer
  dpo: "dpo@rentmaikar.com",
  
  // Payment inquiries
  payments: "payments@rentmaikar.com",

  // Document submissions
  documents: "documents@rentmaikar.com",

  // Legal inquiries
  legal: "legal@rentmaikar.com",

  // Regional inboxes
  nigeria: "nigeria@rentmaikar.com",
  usa: "usa@rentmaikar.com",
} as const;

/**
 * Email display names for sender formatting
 */
export const EMAIL_SENDER_NAMES = {
  support: "Rentmaikar Support",
  noreply: "Rentmaikar",
  admin: "Rentmaikar Admin",
  notifications: "Rentmaikar Notifications",
} as const;

/**
 * Company / Contact Information by Region
 */
export const COMPANY_INFO = {
  USA: {
    companyName: "Inte-Gritty LLC",
    address: "2002 East Marlboro Avenue, Apt 203",
    city: "Hyattsville",
    state: "Maryland",
    country: "United States",
    zip: "20785",
    fullAddress: "2002 East Marlboro Avenue, Apt 203, Hyattsville, Maryland, United States 20785",
    phone: "+1 (608) 384-3932",
    phoneRaw: "+16083843932",
    email: EMAIL_CONFIG.support,
  },
  NIGERIA: {
    companyName: "Rentmaikar Nigeria",
    address: "",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    zip: "",
    fullAddress: "Lagos, Nigeria",
    phone: "+234 706 4916 791",
    phoneRaw: "+2347064916791",
    email: EMAIL_CONFIG.support,
  },
} as const;

/**
 * Format email with display name for Resend API
 * @example formatSenderEmail('support') => "Rentmaikar Support <support@rentmaikar.com>"
 */
export const formatSenderEmail = (type: keyof typeof EMAIL_CONFIG): string => {
  const email = EMAIL_CONFIG[type];
  const name = EMAIL_SENDER_NAMES[type as keyof typeof EMAIL_SENDER_NAMES] || "Rentmaikar";
  return `${name} <${email}>`;
};

export type EmailType = keyof typeof EMAIL_CONFIG;

/**
 * ── Domain topology ──────────────────────────────────────────────────────────
 * Frontend  : rentmaikar.com          (public web app)
 * Backend   : staging.rentmaikar.com  (API gateway / webhooks)
 * Inbound   : backend.rentmaikar.com  (incoming mail / mailbox routing)
 * Outbound  : notify.rentmaikar.com   (Resend verified sending domain)
 */
export const DOMAINS = {
  frontend: "rentmaikar.com",
  backend: "staging.rentmaikar.com",
  incomingMail: "backend.rentmaikar.com",
  outgoingMail: "notify.rentmaikar.com",
} as const;

/** Inbound mailbox addresses — replies and user inquiries land here. */
export const INCOMING_EMAIL_CONFIG = {
  support: `support@${DOMAINS.incomingMail}`,
  payments: `payments@${DOMAINS.incomingMail}`,
  documents: `documents@${DOMAINS.incomingMail}`,
  admin: `admin@${DOMAINS.incomingMail}`,
  legal: `legal@${DOMAINS.incomingMail}`,
  privacy: `privacy@${DOMAINS.incomingMail}`,
  dpo: `dpo@${DOMAINS.incomingMail}`,
  nigeria: `nigeria@${DOMAINS.incomingMail}`,
  usa: `usa@${DOMAINS.incomingMail}`,
  negotiations: `negotiations@${DOMAINS.incomingMail}`,
} as const;

export type IncomingEmailType = keyof typeof INCOMING_EMAIL_CONFIG;

/** Reply-to address for outbound mail so responses reach the inbound domain. */
export const replyToFor = (type: IncomingEmailType = "support"): string =>
  INCOMING_EMAIL_CONFIG[type];
