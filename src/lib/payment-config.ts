// Payment Fee Structure Configuration
// Based on 40% platform fee model:
// - Drivers pay: base + 20% (admin fee)
// - Owners receive: base - 20% (management fee)
// - Platform earns: 40% total

export const PAYMENT_CONFIG = {
  // Fee percentages
  ADMIN_FEE_PERCENT: 20, // Driver pays base + 20%
  MANAGEMENT_FEE_PERCENT: 20, // Owner receives base - 20%
  PLATFORM_FEE_PERCENT: 40, // Total platform earnings
  
  // Payment schedule
  DAILY_DEBIT_TIME: '00:01', // 12:01 AM
  WEEKLY_PAYOUT_DAY: 5, // Friday (0 = Sunday)
  
  // Default sequence
  DEFAULT_GRACE_PERIOD_DAYS: 3,
  NOTIFICATION_DAYS: [1, 2, 3],
  
  // Currency settings
  CURRENCIES: {
    USD: { symbol: '$', decimals: 2, minAmount: 1 },
    NGN: { symbol: '₦', decimals: 2, minAmount: 100 },
  },
} as const;

export interface PaymentBreakdown {
  baseAmount: number;
  adminFee: number;
  driverTotal: number;
  managementFee: number;
  ownerPayout: number;
  platformEarnings: number;
  currency: 'USD' | 'NGN';
}

export interface PaymentTransaction {
  id: string;
  type: 'rental_payment' | 'owner_payout' | 'refund';
  amount: number;
  currency: 'USD' | 'NGN';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  gateway: 'paypal' | 'paystack';
  gatewayTransactionId?: string;
  driverId?: string;
  ownerId?: string;
  vehicleId?: string;
  rentalId?: string;
  breakdown?: PaymentBreakdown;
  createdAt: Date;
  processedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PaymentDefault {
  id: string;
  driverId: string;
  vehicleId: string;
  rentalId: string;
  amountDue: number;
  currency: 'USD' | 'NGN';
  daysOverdue: number;
  notificationsSent: number;
  lastNotificationAt?: Date;
  deactivationEligible: boolean;
  status: 'active' | 'resolved' | 'deactivated';
  createdAt: Date;
}

/**
 * Calculate payment breakdown based on base rental amount
 */
export function calculatePaymentBreakdown(
  baseAmount: number,
  currency: 'USD' | 'NGN'
): PaymentBreakdown {
  const adminFee = baseAmount * (PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  const managementFee = baseAmount * (PAYMENT_CONFIG.MANAGEMENT_FEE_PERCENT / 100);
  
  return {
    baseAmount,
    adminFee,
    driverTotal: baseAmount + adminFee,
    managementFee,
    ownerPayout: baseAmount - managementFee,
    platformEarnings: adminFee + managementFee,
    currency,
  };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: 'USD' | 'NGN'): string {
  const config = PAYMENT_CONFIG.CURRENCIES[currency];
  return `${config.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })}`;
}

/**
 * Check if it's time for daily auto-debit (12:01 AM)
 */
export function isDailyDebitTime(): boolean {
  const now = new Date();
  const [hours, minutes] = PAYMENT_CONFIG.DAILY_DEBIT_TIME.split(':').map(Number);
  return now.getHours() === hours && now.getMinutes() === minutes;
}

/**
 * Check if today is weekly payout day (Friday)
 */
export function isWeeklyPayoutDay(): boolean {
  return new Date().getDay() === PAYMENT_CONFIG.WEEKLY_PAYOUT_DAY;
}

/**
 * Check if deactivation is allowed based on payment default status
 */
export function isDeactivationAllowed(paymentDefault: PaymentDefault): boolean {
  return (
    paymentDefault.daysOverdue >= PAYMENT_CONFIG.DEFAULT_GRACE_PERIOD_DAYS &&
    paymentDefault.notificationsSent >= PAYMENT_CONFIG.NOTIFICATION_DAYS.length
  );
}

/**
 * Get next notification day for payment default
 */
export function getNextNotificationDay(notificationsSent: number): number | null {
  if (notificationsSent >= PAYMENT_CONFIG.NOTIFICATION_DAYS.length) {
    return null;
  }
  return PAYMENT_CONFIG.NOTIFICATION_DAYS[notificationsSent];
}
