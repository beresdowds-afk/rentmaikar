import { getRegionById, type Region } from './regions';
import { 
  type PaymentBreakdown, 
  type PaymentTransaction, 
  calculatePaymentBreakdown,
  formatCurrency 
} from './payment-config';

// PayPal types
export interface PayPalConfig {
  clientId: string;
  mode: 'sandbox' | 'live';
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links: { href: string; rel: string; method: string }[];
}

// Paystack types
export interface PaystackConfig {
  publicKey: string;
  mode: 'test' | 'live';
}

export interface PaystackTransaction {
  reference: string;
  access_code: string;
  authorization_url: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  gatewayResponse?: unknown;
  error?: string;
  redirectUrl?: string;
}

/**
 * Payment Gateway Manager
 * Handles PayPal (USA) and Paystack (Nigeria) integrations
 */
export class PaymentGateway {
  private region: Region;

  constructor(regionId: string) {
    const region = getRegionById(regionId);
    if (!region) {
      throw new Error(`Invalid region: ${regionId}`);
    }
    this.region = region;
  }

  get gateway(): 'paypal' | 'paystack' {
    return this.region.paymentGateway;
  }

  get currency(): 'USD' | 'NGN' {
    return this.region.currency;
  }

  /**
   * Initialize a payment for driver rental
   */
  async initializePayment(
    baseAmount: number,
    driverId: string,
    vehicleId: string,
    rentalId: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const breakdown = calculatePaymentBreakdown(baseAmount, this.currency);
    
    if (this.gateway === 'paypal') {
      return this.initializePayPalPayment(breakdown, driverId, vehicleId, rentalId, metadata);
    } else {
      return this.initializePaystackPayment(breakdown, driverId, vehicleId, rentalId, metadata);
    }
  }

  /**
   * Initialize PayPal payment (USA)
   */
  private async initializePayPalPayment(
    breakdown: PaymentBreakdown,
    driverId: string,
    vehicleId: string,
    rentalId: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    try {
      // In production, this would call the PayPal API via edge function
      console.log('[PayPal] Initializing payment:', {
        amount: breakdown.driverTotal,
        currency: 'USD',
        driverId,
        vehicleId,
        rentalId,
        breakdown,
      });

      // Mock PayPal order creation
      const mockOrderId = `PAYPAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId: mockOrderId,
        redirectUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
        gatewayResponse: {
          id: mockOrderId,
          status: 'CREATED',
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: breakdown.driverTotal.toFixed(2),
              breakdown: {
                item_total: { value: breakdown.baseAmount.toFixed(2), currency_code: 'USD' },
                tax_total: { value: breakdown.adminFee.toFixed(2), currency_code: 'USD' },
              },
            },
            description: `Vehicle Rental - ${formatCurrency(breakdown.baseAmount, 'USD')} + ${formatCurrency(breakdown.adminFee, 'USD')} admin fee`,
            custom_id: rentalId,
          }],
        },
      };
    } catch (error) {
      console.error('[PayPal] Payment initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payment initialization failed',
      };
    }
  }

  /**
   * Initialize Paystack payment (Nigeria)
   */
  private async initializePaystackPayment(
    breakdown: PaymentBreakdown,
    driverId: string,
    vehicleId: string,
    rentalId: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    try {
      // In production, this would call the Paystack API via edge function
      console.log('[Paystack] Initializing payment:', {
        amount: breakdown.driverTotal,
        currency: 'NGN',
        driverId,
        vehicleId,
        rentalId,
        breakdown,
      });

      // Mock Paystack transaction initialization
      const mockReference = `PAYSTACK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const mockAccessCode = `ACCESS-${Math.random().toString(36).substr(2, 12)}`;

      return {
        success: true,
        transactionId: mockReference,
        redirectUrl: `https://checkout.paystack.com/${mockAccessCode}`,
        gatewayResponse: {
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: `https://checkout.paystack.com/${mockAccessCode}`,
            access_code: mockAccessCode,
            reference: mockReference,
          },
        },
      };
    } catch (error) {
      console.error('[Paystack] Payment initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Paystack payment initialization failed',
      };
    }
  }

  /**
   * Verify payment completion
   */
  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    if (this.gateway === 'paypal') {
      return this.verifyPayPalPayment(transactionId);
    } else {
      return this.verifyPaystackPayment(transactionId);
    }
  }

  /**
   * Verify PayPal payment
   */
  private async verifyPayPalPayment(orderId: string): Promise<PaymentResult> {
    try {
      // In production, this would call PayPal's capture/verify API
      console.log('[PayPal] Verifying payment:', orderId);

      // Mock verification
      return {
        success: true,
        transactionId: orderId,
        gatewayResponse: {
          id: orderId,
          status: 'COMPLETED',
          payer: { email_address: 'driver@example.com' },
        },
      };
    } catch (error) {
      console.error('[PayPal] Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payment verification failed',
      };
    }
  }

  /**
   * Verify Paystack payment
   */
  private async verifyPaystackPayment(reference: string): Promise<PaymentResult> {
    try {
      // In production, this would call Paystack's verify API
      console.log('[Paystack] Verifying payment:', reference);

      // Mock verification
      return {
        success: true,
        transactionId: reference,
        gatewayResponse: {
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference,
            amount: 100000, // In kobo
            currency: 'NGN',
          },
        },
      };
    } catch (error) {
      console.error('[Paystack] Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Paystack payment verification failed',
      };
    }
  }

  /**
   * Process owner payout (weekly on Fridays)
   */
  async processOwnerPayout(
    ownerId: string,
    amount: number,
    payoutDetails: { accountNumber?: string; email?: string }
  ): Promise<PaymentResult> {
    if (this.gateway === 'paypal') {
      return this.processPayPalPayout(ownerId, amount, payoutDetails);
    } else {
      return this.processPaystackTransfer(ownerId, amount, payoutDetails);
    }
  }

  /**
   * Process PayPal payout to owner
   */
  private async processPayPalPayout(
    ownerId: string,
    amount: number,
    payoutDetails: { email?: string }
  ): Promise<PaymentResult> {
    try {
      console.log('[PayPal] Processing payout:', { ownerId, amount, payoutDetails });

      const mockPayoutId = `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        transactionId: mockPayoutId,
        gatewayResponse: {
          batch_header: {
            payout_batch_id: mockPayoutId,
            batch_status: 'SUCCESS',
          },
        },
      };
    } catch (error) {
      console.error('[PayPal] Payout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payout failed',
      };
    }
  }

  /**
   * Process Paystack transfer to owner
   */
  private async processPaystackTransfer(
    ownerId: string,
    amount: number,
    payoutDetails: { accountNumber?: string }
  ): Promise<PaymentResult> {
    try {
      console.log('[Paystack] Processing transfer:', { ownerId, amount, payoutDetails });

      const mockTransferId = `TRANSFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        transactionId: mockTransferId,
        gatewayResponse: {
          status: true,
          message: 'Transfer initiated',
          data: {
            id: mockTransferId,
            status: 'success',
            amount: amount * 100, // Kobo
          },
        },
      };
    } catch (error) {
      console.error('[Paystack] Transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Paystack transfer failed',
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    originalTransactionId: string,
    amount: number,
    reason: string
  ): Promise<PaymentResult> {
    try {
      console.log(`[${this.gateway}] Processing refund:`, {
        originalTransactionId,
        amount,
        reason,
      });

      const mockRefundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        transactionId: mockRefundId,
        gatewayResponse: {
          status: 'completed',
          refund_id: mockRefundId,
          amount,
        },
      };
    } catch (error) {
      console.error(`[${this.gateway}] Refund failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}

/**
 * Factory function to create payment gateway for a region
 */
export function createPaymentGateway(regionId: string): PaymentGateway {
  return new PaymentGateway(regionId);
}
