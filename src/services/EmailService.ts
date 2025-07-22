import { Pool } from 'pg';
import { EmailNotificationData } from '../models/Notification';
import { logger } from '../utils/logger';

interface BasicEmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private db?: Pool;

  constructor(db?: Pool) {
    this.db = db;
  }

  /**
   * Send templated email using database templates
   */
  async sendTemplatedEmail(emailData: EmailNotificationData): Promise<void> {
    try {
      if (!this.db) {
        logger.warn('Database not available for email templates');
        return this.sendBasicEmail({
          to: emailData.to,
          subject: emailData.subject,
          text: JSON.stringify(emailData.data)
        });
      }

      // Get template from database
      const templateQuery = `
        SELECT subject, html_content, text_content, variables
        FROM email_templates 
        WHERE name = $1 AND is_active = true
      `;

      const templateResult = await this.db.query(templateQuery, [emailData.template]);
      
      if (templateResult.rows.length === 0) {
        throw new Error(`Email template not found: ${emailData.template}`);
      }

      const template = templateResult.rows[0];

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, emailData.data);
      const htmlContent = this.replaceVariables(template.html_content, emailData.data);
      const textContent = template.text_content ? 
        this.replaceVariables(template.text_content, emailData.data) : undefined;

      // Send email
      await this.sendBasicEmail({
        to: emailData.to,
        subject,
        html: htmlContent,
        text: textContent
      });

      logger.info(`Templated email sent to ${emailData.to} using template ${emailData.template}`);

    } catch (error) {
      logger.error('Error sending templated email:', error);
      throw error;
    }
  }

  /**
   * Send basic email (mock implementation for development)
   */
  async sendBasicEmail(emailData: BasicEmailData): Promise<void> {
    try {
      // In a real implementation, this would integrate with an email service
      // like SendGrid, AWS SES, Mailgun, etc.
      
      // For development, we'll just log the email
      logger.info('📧 Email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
        hasHtml: !!emailData.html,
        hasText: !!emailData.text
      });

      // Mock email content for development
      console.log('\n=== EMAIL CONTENT ===');
      console.log(`To: ${emailData.to}`);
      console.log(`Subject: ${emailData.subject}`);
      console.log('---');
      if (emailData.text) {
        console.log('Text Content:');
        console.log(emailData.text);
      }
      if (emailData.html) {
        console.log('HTML Content:');
        console.log(emailData.html);
      }
      console.log('===================\n');

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      logger.error('Error sending basic email:', error);
      throw error;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(data[key] || ''));
    });

    return result;
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send bulk emails (for future use)
   */
  async sendBulkEmails(emails: BasicEmailData[]): Promise<void> {
    try {
      const promises = emails.map(email => this.sendBasicEmail(email));
      await Promise.all(promises);
      logger.info(`Bulk email sent to ${emails.length} recipients`);
    } catch (error) {
      logger.error('Error sending bulk emails:', error);
      throw error;
    }
  }
}