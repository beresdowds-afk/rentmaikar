import { 
  PAYMENT_CONFIG, 
  type PaymentDefault,
  isDeactivationAllowed,
  getNextNotificationDay,
  formatCurrency
} from './payment-config';

export interface DefaultNotification {
  day: number;
  type: 'sms' | 'whatsapp' | 'email' | 'push';
  message: string;
  sent: boolean;
  sentAt?: Date;
}

export interface DeactivationRequest {
  paymentDefaultId: string;
  vehicleId: string;
  driverId: string;
  reason: string;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  executed: boolean;
  executedAt?: Date;
}

/**
 * Payment Default Handler
 * Manages the 3-day payment default sequence with notifications and vehicle deactivation
 */
export class PaymentDefaultHandler {
  /**
   * Create a new payment default record
   */
  static createDefault(
    driverId: string,
    vehicleId: string,
    rentalId: string,
    amountDue: number,
    currency: 'USD' | 'NGN'
  ): PaymentDefault {
    return {
      id: `DEFAULT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      driverId,
      vehicleId,
      rentalId,
      amountDue,
      currency,
      daysOverdue: 0,
      notificationsSent: 0,
      deactivationEligible: false,
      status: 'active',
      createdAt: new Date(),
    };
  }

  /**
   * Generate notification message for a specific day
   */
  static generateNotificationMessage(
    paymentDefault: PaymentDefault,
    day: number,
    driverName: string
  ): DefaultNotification {
    const amountFormatted = formatCurrency(paymentDefault.amountDue, paymentDefault.currency);
    
    const messages: Record<number, string> = {
      1: `🔔 Payment Reminder (Day 1)

Dear ${driverName},

Your payment of ${amountFormatted} is overdue. Please make payment immediately to avoid service interruption.

⚠️ If payment is not received within 72 hours, your vehicle may be subject to remote deactivation.

Payment Link: [PAYMENT_LINK]

Thank you.`,

      2: `⚠️ URGENT: Payment Overdue (Day 2)

Dear ${driverName},

This is your second reminder. Your payment of ${amountFormatted} remains outstanding.

🚨 You have 48 hours remaining before vehicle deactivation becomes eligible.

Please pay now: [PAYMENT_LINK]

Contact support if you need assistance.`,

      3: `🚨 FINAL NOTICE: Payment Default (Day 3)

Dear ${driverName},

FINAL WARNING: Your payment of ${amountFormatted} is critically overdue.

❌ Vehicle deactivation has been authorized. Your vehicle may be remotely disabled when safely parked.

To avoid deactivation, pay immediately: [PAYMENT_LINK]

This is your last warning.`,
    };

    return {
      day,
      type: day === 3 ? 'whatsapp' : 'sms',
      message: messages[day] || messages[1],
      sent: false,
    };
  }

  /**
   * Process daily payment default check
   * Called at 12:01 AM for each active default
   */
  static processDailyCheck(paymentDefault: PaymentDefault): {
    updated: PaymentDefault;
    notification?: DefaultNotification;
    deactivationEligible: boolean;
  } {
    const updated = { ...paymentDefault };
    updated.daysOverdue += 1;

    const nextNotificationDay = getNextNotificationDay(updated.notificationsSent);
    let notification: DefaultNotification | undefined;

    if (nextNotificationDay !== null && updated.daysOverdue >= nextNotificationDay) {
      notification = this.generateNotificationMessage(
        updated,
        nextNotificationDay,
        'Driver' // Would be actual driver name from DB
      );
      updated.notificationsSent += 1;
      updated.lastNotificationAt = new Date();
    }

    updated.deactivationEligible = isDeactivationAllowed(updated);

    return {
      updated,
      notification,
      deactivationEligible: updated.deactivationEligible,
    };
  }

  /**
   * Create deactivation request after 3rd notification
   */
  static createDeactivationRequest(
    paymentDefault: PaymentDefault,
    reason: string
  ): DeactivationRequest | null {
    if (!isDeactivationAllowed(paymentDefault)) {
      console.warn('[PaymentDefault] Deactivation not allowed yet:', {
        daysOverdue: paymentDefault.daysOverdue,
        notificationsSent: paymentDefault.notificationsSent,
      });
      return null;
    }

    return {
      paymentDefaultId: paymentDefault.id,
      vehicleId: paymentDefault.vehicleId,
      driverId: paymentDefault.driverId,
      reason,
      requestedAt: new Date(),
      executed: false,
    };
  }

  /**
   * Validate that auto-debit should run (12:01 AM check)
   */
  static shouldRunAutoDebit(): boolean {
    const now = new Date();
    const [hours, minutes] = PAYMENT_CONFIG.DAILY_DEBIT_TIME.split(':').map(Number);
    
    // Allow 5-minute window for cron job timing
    const targetMinutes = hours * 60 + minutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return Math.abs(currentMinutes - targetMinutes) <= 5;
  }

  /**
   * Get payment default status summary
   */
  static getStatusSummary(paymentDefault: PaymentDefault): {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: string;
  } {
    const { daysOverdue, notificationsSent, deactivationEligible } = paymentDefault;
    const amountFormatted = formatCurrency(paymentDefault.amountDue, paymentDefault.currency);

    if (deactivationEligible) {
      return {
        severity: 'critical',
        message: `${daysOverdue} days overdue - ${amountFormatted}. Deactivation authorized.`,
        action: 'Initiate vehicle deactivation when safely parked',
      };
    }

    if (daysOverdue >= 2) {
      return {
        severity: 'high',
        message: `${daysOverdue} days overdue - ${amountFormatted}. ${3 - notificationsSent} notification(s) remaining.`,
        action: 'Send urgent notification and prepare deactivation',
      };
    }

    if (daysOverdue >= 1) {
      return {
        severity: 'medium',
        message: `${daysOverdue} day(s) overdue - ${amountFormatted}.`,
        action: 'Send reminder notification',
      };
    }

    return {
      severity: 'low',
      message: `Payment pending - ${amountFormatted}`,
      action: 'Monitor and await payment',
    };
  }
}
