import { Pool } from 'pg';
import { PaymentService, PaymentServiceConfig } from '../services/PaymentService';
import { CreatePaymentIntentRequest, ConfirmPaymentRequest } from '../models/Payment';

/**
 * Example demonstrating payment processing workflow
 */
export class PaymentExample {
  private paymentService: PaymentService;

  constructor(database: Pool, config: PaymentServiceConfig) {
    this.paymentService = new PaymentService(database, config);
  }

  /**
   * Example: Process a credit card payment
   */
  async processCreditCardPayment(): Promise<void> {
    console.log('=== Credit Card Payment Example ===');

    try {
      // Step 1: Create payment intent
      const createRequest: CreatePaymentIntentRequest = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 299.99,
        currency: 'USD',
        paymentMethod: {
          type: 'credit_card',
          creditCard: {
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            holderName: 'John Doe'
          },
          totalAmount: 299.99,
          currency: 'USD'
        },
        metadata: {
          flightNumber: 'AA123',
          passengerCount: 2
        }
      };

      console.log('Creating payment intent...');
      const createResult = await this.paymentService.createPaymentIntent(createRequest);

      if (!createResult.success) {
        console.error('Failed to create payment intent:', createResult.error);
        return;
      }

      console.log('Payment intent created:', createResult.paymentIntent?.id);

      // Step 2: Confirm payment
      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: createResult.paymentIntent!.id,
        paymentMethodDetails: {
          stripePaymentMethodId: 'pm_card_visa'
        }
      };

      console.log('Confirming payment...');
      const confirmResult = await this.paymentService.confirmPayment(confirmRequest);

      if (!confirmResult.success) {
        console.error('Failed to confirm payment:', confirmResult.error);
        return;
      }

      console.log('Payment confirmed successfully!');
      console.log('Transaction ID:', confirmResult.transaction?.id);
      console.log('Receipt Number:', confirmResult.receipt?.receiptNumber);

    } catch (error) {
      console.error('Payment processing error:', error);
    }
  }

  /**
   * Example: Process a points-based payment
   */
  async processPointsPayment(): Promise<void> {
    console.log('\n=== Points Payment Example ===');

    try {
      // Step 1: Create points payment intent
      const createRequest: CreatePaymentIntentRequest = {
        bookingId: '123e4567-e89b-12d3-a456-426614174002',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 299.99,
        currency: 'USD',
        paymentMethod: {
          type: 'points',
          pointsUsed: {
            program: 'Chase Ultimate Rewards',
            points: 29999,
            cashComponent: 0
          },
          totalAmount: 299.99,
          currency: 'USD'
        }
      };

      console.log('Creating points payment intent...');
      const createResult = await this.paymentService.createPaymentIntent(createRequest);

      if (!createResult.success) {
        console.error('Failed to create points payment intent:', createResult.error);
        return;
      }

      console.log('Points payment intent created:', createResult.paymentIntent?.id);

      // Step 2: Confirm points payment
      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: createResult.paymentIntent!.id,
        paymentMethodDetails: {
          pointsAccountId: 'acc_chase_ur_123'
        }
      };

      console.log('Confirming points payment...');
      const confirmResult = await this.paymentService.confirmPayment(confirmRequest);

      if (!confirmResult.success) {
        console.error('Failed to confirm points payment:', confirmResult.error);
        return;
      }

      console.log('Points payment confirmed successfully!');
      console.log('Points used:', confirmResult.transaction?.pointsTransaction?.pointsUsed);
      console.log('Points value:', confirmResult.transaction?.pointsTransaction?.pointsValue);

    } catch (error) {
      console.error('Points payment processing error:', error);
    }
  }

  /**
   * Example: Process a mixed payment (credit card + points)
   */
  async processMixedPayment(): Promise<void> {
    console.log('\n=== Mixed Payment Example ===');

    try {
      // Step 1: Create mixed payment intent
      const createRequest: CreatePaymentIntentRequest = {
        bookingId: '123e4567-e89b-12d3-a456-426614174003',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 299.99,
        currency: 'USD',
        paymentMethod: {
          type: 'mixed',
          creditCard: {
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            holderName: 'John Doe'
          },
          pointsUsed: {
            program: 'Chase Ultimate Rewards',
            points: 15000,
            cashComponent: 150.00
          },
          totalAmount: 299.99,
          currency: 'USD'
        }
      };

      console.log('Creating mixed payment intent...');
      const createResult = await this.paymentService.createPaymentIntent(createRequest);

      if (!createResult.success) {
        console.error('Failed to create mixed payment intent:', createResult.error);
        return;
      }

      console.log('Mixed payment intent created:', createResult.paymentIntent?.id);

      // Step 2: Confirm mixed payment
      const confirmRequest: ConfirmPaymentRequest = {
        paymentIntentId: createResult.paymentIntent!.id,
        paymentMethodDetails: {
          stripePaymentMethodId: 'pm_card_visa',
          pointsAccountId: 'acc_chase_ur_123'
        }
      };

      console.log('Confirming mixed payment...');
      const confirmResult = await this.paymentService.confirmPayment(confirmRequest);

      if (!confirmResult.success) {
        console.error('Failed to confirm mixed payment:', confirmResult.error);
        return;
      }

      console.log('Mixed payment confirmed successfully!');
      console.log('Total amount:', confirmResult.paymentIntent?.amount);

    } catch (error) {
      console.error('Mixed payment processing error:', error);
    }
  }

  /**
   * Example: Process a refund
   */
  async processRefund(paymentIntentId: string): Promise<void> {
    console.log('\n=== Refund Example ===');

    try {
      const refundResult = await this.paymentService.refundPayment({
        paymentIntentId: paymentIntentId,
        amount: 100.00, // Partial refund
        reason: 'Customer requested partial refund'
      });

      if (!refundResult.success) {
        console.error('Failed to process refund:', refundResult.error);
        return;
      }

      console.log('Refund processed successfully!');
      console.log('Refund transaction ID:', refundResult.transaction?.id);
      console.log('Refund amount:', refundResult.transaction?.amount);

    } catch (error) {
      console.error('Refund processing error:', error);
    }
  }

  /**
   * Example: Get payment transactions for a booking
   */
  async getBookingTransactions(bookingId: string): Promise<void> {
    console.log('\n=== Get Booking Transactions Example ===');

    try {
      const transactions = await this.paymentService.getPaymentTransactions(bookingId);

      console.log(`Found ${transactions.length} transactions for booking ${bookingId}:`);
      
      transactions.forEach((transaction, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log('  ID:', transaction.id);
        console.log('  Type:', transaction.type);
        console.log('  Status:', transaction.status);
        console.log('  Amount:', transaction.amount, transaction.currency);
        console.log('  Provider:', transaction.provider);
        
        if (transaction.pointsTransaction) {
          console.log('  Points Used:', transaction.pointsTransaction.pointsUsed);
          console.log('  Points Program:', transaction.pointsTransaction.program);
        }
        
        console.log('  Created:', transaction.createdAt.toISOString());
      });

    } catch (error) {
      console.error('Error getting booking transactions:', error);
    }
  }

  /**
   * Run all payment examples
   */
  async runAllExamples(): Promise<void> {
    console.log('Starting Payment Processing Examples...\n');

    await this.processCreditCardPayment();
    await this.processPointsPayment();
    await this.processMixedPayment();
    
    // Example of getting transactions for a booking
    await this.getBookingTransactions('123e4567-e89b-12d3-a456-426614174000');

    console.log('\nPayment Processing Examples Complete!');
  }
}

/**
 * Usage example (would be called from a main function or test)
 */
export async function runPaymentExamples(): Promise<void> {
  // Mock database and configuration
  const mockDb = {} as Pool;
  const config: PaymentServiceConfig = {
    stripe: {
      secretKey: 'sk_test_example',
      webhookSecret: 'whsec_example',
      apiVersion: '2023-10-16'
    }
  };

  const paymentExample = new PaymentExample(mockDb, config);
  await paymentExample.runAllExamples();
}

// Export for use in other files
export default PaymentExample;