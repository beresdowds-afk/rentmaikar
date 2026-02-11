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
  
  // Legal inquiries
  legal: "legal@rentmaikar.com",
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
 * Format email with display name for Resend API
 * @example formatSenderEmail('support') => "Rentmaikar Support <support@rentmaikar.com>"
 */
export const formatSenderEmail = (type: keyof typeof EMAIL_CONFIG): string => {
  const email = EMAIL_CONFIG[type];
  const name = EMAIL_SENDER_NAMES[type as keyof typeof EMAIL_SENDER_NAMES] || "Rentmaikar";
  return `${name} <${email}>`;
};

export type EmailType = keyof typeof EMAIL_CONFIG;
