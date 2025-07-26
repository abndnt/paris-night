import { Pool } from 'pg';
import { PaymentReceipt, PaymentTransaction, PaymentIntent } from '../models/Payment';
import { Booking } from '../models/Booking';

export interface ReceiptGenerationOptions {
  includeFlightDetails?: boolean;
  includePassengerInfo?: boolean;
  format?: 'pdf' | 'html' | 'json';
  language?: 'en' | 'es' | 'fr' | 'de';
}

export interface ReceiptEmailOptions {
  recipientEmail: string;
  recipientName: string;
  subject?: string;
  includeAttachment?: boolean;
}

export class ReceiptService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Generate a payment receipt
   */
  async generateReceipt(
    transaction: PaymentTransaction, 
    paymentIntent: PaymentIntent,
    booking?: Booking,
    options: ReceiptGenerationOptions = {}
  ): Promise<PaymentReceipt> {
    try {
      const receiptNumber = this.generateReceiptNumber();
      
      // Calculate payment breakdown
      const paymentBreakdown = await this.calculatePaymentBreakdown(transaction, booking);

      const receipt: PaymentReceipt = {
        id: this.generateReceiptId(),
        paymentIntentId: paymentIntent.id,
        bookingId: transaction.bookingId,
        userId: transaction.userId,
        receiptNumber: receiptNumber,
        totalAmount: transaction.amount,
        currency: transaction.currency,
        paymentBreakdown: paymentBreakdown,
        paymentMethod: paymentIntent.paymentMethod,
        issuedAt: new Date()
      };

      // Generate receipt content based on format
      if (options.format) {
        receipt.receiptUrl = await this.generateReceiptContent(receipt, booking, options);
      }

      // Save receipt to database
      await this.saveReceipt(receipt);

      return receipt;
    } catch (error) {
      throw new Error(`Failed to generate receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<PaymentReceipt | null> {
    try {
      const query = `
        SELECT id, payment_intent_id, booking_id, user_id, receipt_number,
               total_amount, currency, payment_breakdown, payment_method,
               issued_at, receipt_url
        FROM payment_receipts
        WHERE id = $1
      `;

      const result = await this.db.query(query, [receiptId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        paymentIntentId: row.payment_intent_id,
        bookingId: row.booking_id,
        userId: row.user_id,
        receiptNumber: row.receipt_number,
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
        paymentBreakdown: row.payment_breakdown,
        paymentMethod: row.payment_method,
        issuedAt: new Date(row.issued_at),
        receiptUrl: row.receipt_url
      };
    } catch (error) {
      throw new Error(`Failed to get receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get receipt by receipt number
   */
  async getReceiptByNumber(receiptNumber: string): Promise<PaymentReceipt | null> {
    try {
      const query = `
        SELECT id, payment_intent_id, booking_id, user_id, receipt_number,
               total_amount, currency, payment_breakdown, payment_method,
               issued_at, receipt_url
        FROM payment_receipts
        WHERE receipt_number = $1
      `;

      const result = await this.db.query(query, [receiptNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        paymentIntentId: row.payment_intent_id,
        bookingId: row.booking_id,
        userId: row.user_id,
        receiptNumber: row.receipt_number,
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
        paymentBreakdown: row.payment_breakdown,
        paymentMethod: row.payment_method,
        issuedAt: new Date(row.issued_at),
        receiptUrl: row.receipt_url
      };
    } catch (error) {
      throw new Error(`Failed to get receipt by number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user receipts
   */
  async getUserReceipts(userId: string, limit: number = 20, offset: number = 0): Promise<PaymentReceipt[]> {
    try {
      const query = `
        SELECT id, payment_intent_id, booking_id, user_id, receipt_number,
               total_amount, currency, payment_breakdown, payment_method,
               issued_at, receipt_url
        FROM payment_receipts
        WHERE user_id = $1
        ORDER BY issued_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => ({
        id: row.id,
        paymentIntentId: row.payment_intent_id,
        bookingId: row.booking_id,
        userId: row.user_id,
        receiptNumber: row.receipt_number,
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
        paymentBreakdown: row.payment_breakdown,
        paymentMethod: row.payment_method,
        issuedAt: new Date(row.issued_at),
        receiptUrl: row.receipt_url
      }));
    } catch (error) {
      throw new Error(`Failed to get user receipts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send receipt via email
   */
  async sendReceiptEmail(
    receiptId: string, 
    emailOptions: ReceiptEmailOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const receipt = await this.getReceipt(receiptId);
      if (!receipt) {
        return { success: false, error: 'Receipt not found' };
      }

      // Generate email content
      const emailContent = await this.generateReceiptEmailContent(receipt, emailOptions);

      // Send email (mock implementation - would integrate with email service)
      const emailSent = await this.sendEmail({
        to: emailOptions.recipientEmail,
        subject: emailOptions.subject || `Payment Receipt ${receipt.receiptNumber}`,
        html: emailContent.html,
        text: emailContent.text,
        attachments: emailOptions.includeAttachment ? [
          {
            filename: `receipt-${receipt.receiptNumber}.pdf`,
            content: await this.generatePDFReceipt(receipt)
          }
        ] : undefined
      });

      return { success: emailSent };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  /**
   * Calculate payment breakdown
   */
  private async calculatePaymentBreakdown(
    transaction: PaymentTransaction, 
    booking?: Booking
  ): Promise<PaymentReceipt['paymentBreakdown']> {
    const breakdown: PaymentReceipt['paymentBreakdown'] = {
      taxes: 0,
      fees: 0
    };

    // Add cash amount for credit card payments
    if (transaction.type === 'charge' && !transaction.pointsTransaction) {
      breakdown.cashAmount = transaction.amount;
    }

    // Add points information for points payments
    if (transaction.pointsTransaction) {
      breakdown.pointsUsed = transaction.pointsTransaction.pointsUsed;
      breakdown.pointsValue = transaction.pointsTransaction.pointsValue;
    }

    // Calculate taxes and fees from booking if available
    if (booking) {
      breakdown.taxes = booking.totalCost.taxes;
      breakdown.fees = booking.totalCost.fees;
    }

    return breakdown;
  }

  /**
   * Generate receipt content
   */
  private async generateReceiptContent(
    receipt: PaymentReceipt, 
    booking?: Booking,
    options: ReceiptGenerationOptions = {}
  ): Promise<string> {
    try {
      switch (options.format) {
        case 'pdf':
          return await this.generatePDFReceipt(receipt, booking, options);
        case 'html':
          return await this.generateHTMLReceipt(receipt, booking, options);
        case 'json':
        default:
          return JSON.stringify(receipt, null, 2);
      }
    } catch (error) {
      throw new Error(`Failed to generate receipt content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HTML receipt
   */
  private async generateHTMLReceipt(
    receipt: PaymentReceipt, 
    booking?: Booking,
    options: ReceiptGenerationOptions = {}
  ): Promise<string> {
    const language = options.language || 'en';
    const translations = this.getTranslations(language);

    let html = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${translations.receiptTitle} ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .payment-details { margin-bottom: 30px; }
          .breakdown { border-top: 1px solid #ccc; padding-top: 20px; }
          .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
          .flight-details { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Flight Search SaaS</h1>
          <h2>${translations.receiptTitle}</h2>
        </div>
        
        <div class="receipt-info">
          <div>
            <strong>${translations.receiptNumber}:</strong> ${receipt.receiptNumber}<br>
            <strong>${translations.issueDate}:</strong> ${receipt.issuedAt.toLocaleDateString(language)}
          </div>
          <div>
            <strong>${translations.bookingId}:</strong> ${receipt.bookingId}
          </div>
        </div>

        <div class="payment-details">
          <h3>${translations.paymentDetails}</h3>
          <p><strong>${translations.paymentMethod}:</strong> ${this.formatPaymentMethod(receipt.paymentMethod, language)}</p>
        </div>

        <div class="breakdown">
          <h3>${translations.paymentBreakdown}</h3>
    `;

    // Add payment breakdown details
    if (receipt.paymentBreakdown.cashAmount) {
      html += `<p>${translations.cashAmount}: ${this.formatCurrency(receipt.paymentBreakdown.cashAmount, receipt.currency)}</p>`;
    }

    if (receipt.paymentBreakdown.pointsUsed) {
      html += `<p>${translations.pointsUsed}: ${receipt.paymentBreakdown.pointsUsed.toLocaleString()}</p>`;
      if (receipt.paymentBreakdown.pointsValue) {
        html += `<p>${translations.pointsValue}: ${this.formatCurrency(receipt.paymentBreakdown.pointsValue, receipt.currency)}</p>`;
      }
    }

    if (receipt.paymentBreakdown.taxes > 0) {
      html += `<p>${translations.taxes}: ${this.formatCurrency(receipt.paymentBreakdown.taxes, receipt.currency)}</p>`;
    }

    if (receipt.paymentBreakdown.fees > 0) {
      html += `<p>${translations.fees}: ${this.formatCurrency(receipt.paymentBreakdown.fees, receipt.currency)}</p>`;
    }

    html += `
          <div class="total">
            <p>${translations.totalAmount}: ${this.formatCurrency(receipt.totalAmount, receipt.currency)}</p>
          </div>
        </div>
    `;

    // Add flight details if requested and booking is available
    if (options.includeFlightDetails && booking) {
      html += `
        <div class="flight-details">
          <h3>${translations.flightDetails}</h3>
          <p><strong>${translations.airline}:</strong> ${booking.flightDetails.airline}</p>
          <p><strong>${translations.flightNumber}:</strong> ${booking.flightDetails.flightNumber}</p>
          <p><strong>${translations.travelDate}:</strong> ${booking.travelDate.toLocaleDateString(language)}</p>
        </div>
      `;
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate PDF receipt (mock implementation)
   */
  private async generatePDFReceipt(
    receipt: PaymentReceipt, 
    booking?: Booking,
    options: ReceiptGenerationOptions = {}
  ): Promise<string> {
    // In a real implementation, this would use a PDF generation library like Puppeteer or PDFKit
    // For now, return a mock PDF URL
    // const htmlContent = await this.generateHTMLReceipt(receipt, booking, options); // Unused variable
    
    // Mock PDF generation - would convert HTML to PDF
    const pdfUrl = `https://receipts.flightsearch.com/pdf/${receipt.receiptNumber}.pdf`;
    
    return pdfUrl;
  }

  /**
   * Generate email content
   */
  private async generateReceiptEmailContent(
    receipt: PaymentReceipt, 
    emailOptions: ReceiptEmailOptions
  ): Promise<{ html: string; text: string }> {
    const html = `
      <h2>Payment Receipt</h2>
      <p>Dear ${emailOptions.recipientName},</p>
      <p>Thank you for your payment. Please find your receipt details below:</p>
      
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Receipt Number:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${receipt.receiptNumber}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Amount:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(receipt.totalAmount, receipt.currency)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Date:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${receipt.issuedAt.toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Booking ID:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${receipt.bookingId}</td>
        </tr>
      </table>
      
      <p>If you have any questions about this receipt, please contact our support team.</p>
      <p>Best regards,<br>Flight Search SaaS Team</p>
    `;

    const text = `
      Payment Receipt
      
      Dear ${emailOptions.recipientName},
      
      Thank you for your payment. Please find your receipt details below:
      
      Receipt Number: ${receipt.receiptNumber}
      Amount: ${this.formatCurrency(receipt.totalAmount, receipt.currency)}
      Date: ${receipt.issuedAt.toLocaleDateString()}
      Booking ID: ${receipt.bookingId}
      
      If you have any questions about this receipt, please contact our support team.
      
      Best regards,
      Flight Search SaaS Team
    `;

    return { html, text };
  }

  /**
   * Send email (mock implementation)
   */
  private async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{ filename: string; content: string }>;
  }): Promise<boolean> {
    // Mock email sending - would integrate with email service like SendGrid, AWS SES, etc.
    console.log('Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length
    });
    
    return true; // Mock success
  }

  /**
   * Save receipt to database
   */
  private async saveReceipt(receipt: PaymentReceipt): Promise<void> {
    const query = `
      INSERT INTO payment_receipts (
        id, payment_intent_id, booking_id, user_id, receipt_number,
        total_amount, currency, payment_breakdown, payment_method,
        issued_at, receipt_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        receipt_url = EXCLUDED.receipt_url,
        payment_breakdown = EXCLUDED.payment_breakdown
    `;

    const values = [
      receipt.id,
      receipt.paymentIntentId,
      receipt.bookingId,
      receipt.userId,
      receipt.receiptNumber,
      receipt.totalAmount,
      receipt.currency,
      JSON.stringify(receipt.paymentBreakdown),
      JSON.stringify(receipt.paymentMethod),
      receipt.issuedAt,
      receipt.receiptUrl
    ];

    await this.db.query(query, values);
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(paymentMethod: PaymentReceipt['paymentMethod'], _language: string = 'en'): string {
    switch (paymentMethod.type) {
      case 'credit_card':
        return `Credit Card ending in ${paymentMethod.creditCard?.last4 || '****'}`;
      case 'points':
        return `Points Redemption`;
      case 'mixed':
        return `Mixed Payment (Card + Points)`;
      default:
        return 'Unknown Payment Method';
    }
  }

  /**
   * Get translations for different languages
   */
  private getTranslations(language: string): Record<string, string> {
    const translations: Record<string, Record<string, string>> = {
      en: {
        receiptTitle: 'Payment Receipt',
        receiptNumber: 'Receipt Number',
        issueDate: 'Issue Date',
        bookingId: 'Booking ID',
        paymentDetails: 'Payment Details',
        paymentMethod: 'Payment Method',
        paymentBreakdown: 'Payment Breakdown',
        cashAmount: 'Cash Amount',
        pointsUsed: 'Points Used',
        pointsValue: 'Points Value',
        taxes: 'Taxes',
        fees: 'Fees',
        totalAmount: 'Total Amount',
        flightDetails: 'Flight Details',
        airline: 'Airline',
        flightNumber: 'Flight Number',
        travelDate: 'Travel Date'
      },
      es: {
        receiptTitle: 'Recibo de Pago',
        receiptNumber: 'Número de Recibo',
        issueDate: 'Fecha de Emisión',
        bookingId: 'ID de Reserva',
        paymentDetails: 'Detalles del Pago',
        paymentMethod: 'Método de Pago',
        paymentBreakdown: 'Desglose del Pago',
        cashAmount: 'Cantidad en Efectivo',
        pointsUsed: 'Puntos Utilizados',
        pointsValue: 'Valor de Puntos',
        taxes: 'Impuestos',
        fees: 'Tarifas',
        totalAmount: 'Cantidad Total',
        flightDetails: 'Detalles del Vuelo',
        airline: 'Aerolínea',
        flightNumber: 'Número de Vuelo',
        travelDate: 'Fecha de Viaje'
      }
    };

    return translations[language] || translations.en;
  }

  /**
   * Generate receipt ID
   */
  private generateReceiptId(): string {
    return `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate receipt number
   */
  private generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    return `RCP-${year}${month}${day}-${random}`;
  }
}