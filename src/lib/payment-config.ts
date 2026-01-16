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
  DAILY_PAYMENT_FINE_PERCENT: 10, // 10% fine for daily payment option
  
  // Payment frequency settings
  MINIMUM_DOWN_PAYMENT_DAYS: 2, // Minimum 2 days down payment required
  
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
  
  // Payment methods
  PAYMENT_METHODS: {
    USA: ['paypal', 'bank_transfer'] as const,
    NIGERIA: ['paystack', 'bank_transfer'] as const,
  },
  
  // Bank details for manual transfers
  BANK_ACCOUNTS: {
    USA: {
      bankName: 'Chase Bank',
      accountName: 'RideShare Platform LLC',
      accountNumber: 'XXXX-XXXX-1234',
      routingNumber: '021000021',
      accountType: 'Business Checking',
    },
    NIGERIA: {
      bankName: 'GTBank',
      accountName: 'RideShare Nigeria Ltd',
      accountNumber: '0123456789',
      bankCode: '058',
    },
  },
} as const;

export type PaymentMethod = 'paypal' | 'paystack' | 'bank_transfer';
export type PaymentFrequency = 'daily' | 'weekly';

export interface PaymentBreakdown {
  baseAmount: number;
  adminFee: number;
  driverTotal: number;
  managementFee: number;
  ownerPayout: number;
  platformEarnings: number;
  currency: 'USD' | 'NGN';
  // Extended breakdown for daily payments
  dailyRate?: number;
  dailyFine?: number;
  effectiveDailyRate?: number;
  frequency?: PaymentFrequency;
  downPaymentAmount?: number;
  downPaymentDays?: number;
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
  currency: 'USD' | 'NGN',
  frequency: PaymentFrequency = 'weekly',
  downPaymentDays: number = PAYMENT_CONFIG.MINIMUM_DOWN_PAYMENT_DAYS
): PaymentBreakdown {
  const adminFee = baseAmount * (PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  const managementFee = baseAmount * (PAYMENT_CONFIG.MANAGEMENT_FEE_PERCENT / 100);
  
  // Calculate daily rates
  const dailyRate = baseAmount / 7;
  const dailyFine = frequency === 'daily' 
    ? dailyRate * (PAYMENT_CONFIG.DAILY_PAYMENT_FINE_PERCENT / 100)
    : 0;
  const effectiveDailyRate = dailyRate + dailyFine;
  
  // Calculate totals based on frequency
  const weeklyWithFine = effectiveDailyRate * 7;
  const driverBase = frequency === 'daily' ? weeklyWithFine : baseAmount;
  const driverAdminFee = driverBase * (PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  
  // Down payment calculation
  const downPaymentBase = effectiveDailyRate * downPaymentDays;
  const downPaymentAmount = downPaymentBase * (1 + PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  
  return {
    baseAmount,
    adminFee,
    driverTotal: driverBase + driverAdminFee,
    managementFee,
    ownerPayout: baseAmount - managementFee,
    platformEarnings: driverAdminFee + managementFee,
    currency,
    dailyRate,
    dailyFine,
    effectiveDailyRate,
    frequency,
    downPaymentAmount: frequency === 'daily' ? downPaymentAmount : undefined,
    downPaymentDays: frequency === 'daily' ? downPaymentDays : undefined,
  };
}

/**
 * Calculate payment breakdown for a specific number of days
 */
export function calculateDailyPaymentBreakdown(
  weeklyBaseAmount: number,
  currency: 'USD' | 'NGN',
  days: number
): { dailyRate: number; fine: number; total: number; withAdminFee: number } {
  const dailyRate = weeklyBaseAmount / 7;
  const fine = dailyRate * (PAYMENT_CONFIG.DAILY_PAYMENT_FINE_PERCENT / 100);
  const effectiveRate = dailyRate + fine;
  const total = effectiveRate * days;
  const withAdminFee = total * (1 + PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  
  return { dailyRate, fine: fine * days, total, withAdminFee };
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
