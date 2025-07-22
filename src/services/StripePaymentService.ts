import Stripe from 'stripe';
import { 
  PaymentIntent, 
  PaymentTransaction, 
  PaymentStatus,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundPaymentRequest
} from '../models/Payment';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
}

export interface StripePaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  transaction?: PaymentTransaction;
  error?: string;
  stripeError?: Stripe.StripeError;
}

export class StripePaymentService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion as Stripe.LatestApiVersion
    });
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Create a Stripe payment intent
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<StripePaymentResult> {
    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(request.amount * 100);

      const stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: request.currency.toLowerCase(),
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
          ...request.metadata
        },
        automatic_payment_methods: {
          enabled: true
        },
        capture_method: 'automatic',
        confirmation_method: 'automatic'
      });

      const paymentIntent: PaymentIntent = {
        id: this.generatePaymentIntentId(),
        bookingId: request.bookingId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: {
          ...request.paymentMethod,
          id: this.generatePaymentMethodId(),
          provider: 'stripe',
          providerPaymentMethodId: stripePaymentIntent.id
        },
        status: this.mapStripeStatusToPaymentStatus(stripePaymentIntent.status),
        providerIntentId: stripePaymentIntent.id,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      return this.handleStripeError(error);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(request: ConfirmPaymentRequest, paymentIntent: PaymentIntent): Promise<StripePaymentResult> {
    try {
      if (!paymentIntent.providerIntentId) {
        throw new Error('No Stripe payment intent ID found');
      }

      const confirmParams: Stripe.PaymentIntentConfirmParams = {};

      // Add payment method if provided
      if (request.paymentMethodDetails?.stripePaymentMethodId) {
        confirmParams.payment_method = request.paymentMethodDetails.stripePaymentMethodId;
      }

      const stripePaymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntent.providerIntentId,
        confirmParams
      );

      const updatedPaymentIntent: PaymentIntent = {
        ...paymentIntent,
        status: this.mapStripeStatusToPaymentStatus(stripePaymentIntent.status),
        updatedAt: new Date()
      };

      // Create transaction record if payment succeeded
      let transaction: PaymentTransaction | undefined;
      if (stripePaymentIntent.status === 'succeeded') {
        transaction = {
          id: this.generateTransactionId(),
          paymentIntentId: paymentIntent.id,
          bookingId: paymentIntent.bookingId,
          userId: paymentIntent.userId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          type: 'charge',
          status: 'completed',
          provider: 'stripe',
          providerTransactionId: stripePaymentIntent.id,
          processedAt: new Date(),
          createdAt: new Date()
        };
      }

      return {
        success: true,
        paymentIntent: updatedPaymentIntent,
        transaction
      };
    } catch (error) {
      return this.handleStripeError(error);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(request: RefundPaymentRequest, paymentIntent: PaymentIntent): Promise<StripePaymentResult> {
    try {
      if (!paymentIntent.providerIntentId) {
        throw new Error('No Stripe payment intent ID found');
      }

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntent.providerIntentId
      };

      // Add amount if partial refund
      if (request.amount && request.amount < paymentIntent.amount) {
        refundParams.amount = Math.round(request.amount * 100); // Convert to cents
      }

      // Add reason if provided
      if (request.reason) {
        refundParams.reason = 'requested_by_customer';
        refundParams.metadata = {
          reason: request.reason
        };
      }

      const stripeRefund = await this.stripe.refunds.create(refundParams);

      const transaction: PaymentTransaction = {
        id: this.generateTransactionId(),
        paymentIntentId: paymentIntent.id,
        bookingId: paymentIntent.bookingId,
        userId: paymentIntent.userId,
        amount: request.amount || paymentIntent.amount,
        currency: paymentIntent.currency,
        type: 'refund',
        status: this.mapStripeRefundStatusToPaymentStatus(stripeRefund.status),
        provider: 'stripe',
        providerTransactionId: stripeRefund.id,
        processedAt: stripeRefund.status === 'succeeded' ? new Date() : undefined,
        createdAt: new Date()
      };

      return {
        success: true,
        transaction
      };
    } catch (error) {
      return this.handleStripeError(error);
    }
  }

  /**
   * Retrieve payment intent from Stripe
   */
  async retrievePaymentIntent(stripePaymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(stripePaymentIntentId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(payload: string, signature: string): Promise<{ success: boolean; event?: Stripe.Event; error?: string }> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      
      // Process different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
          // These events would trigger updates to our payment records
          break;
        case 'charge.dispute.created':
          // Handle chargebacks
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { success: true, event };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown webhook error' 
      };
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return await this.stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true
      }
    });
  }

  /**
   * Create or retrieve Stripe customer
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    // First try to find existing customer
    const existingCustomers = await this.stripe.customers.list({
      email: email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]!;
    }

    // Create new customer
    return await this.stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId
      }
    });
  }

  /**
   * List customer payment methods
   */
  async listCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data;
  }

  /**
   * Map Stripe payment intent status to our payment status
   */
  private mapStripeStatusToPaymentStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'canceled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  /**
   * Map Stripe refund status to our payment status
   */
  private mapStripeRefundStatusToPaymentStatus(stripeStatus: Stripe.Refund.Status): PaymentStatus {
    switch (stripeStatus) {
      case 'pending':
        return 'processing';
      case 'succeeded':
        return 'refunded';
      case 'failed':
        return 'failed';
      case 'canceled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  /**
   * Handle Stripe errors
   */
  private handleStripeError(error: any): StripePaymentResult {
    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: error.message,
        stripeError: error
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Stripe error'
    };
  }

  /**
   * Generate payment intent ID
   */
  private generatePaymentIntentId(): string {
    return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate payment method ID
   */
  private generatePaymentMethodId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}