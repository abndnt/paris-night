import { Pool } from 'pg';
import { EmailService } from '../services/EmailService';
import { EmailNotificationData } from '../models/Notification';

// Mock dependencies
jest.mock('../utils/logger');

describe('EmailService', () => {
  let mockDb: jest.Mocked<Pool>;
  let emailService: EmailService;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;

    emailService = new EmailService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTemplatedEmail', () => {
    it('should send templated email successfully', async () => {
      const mockTemplate = {
        subject: 'Booking Confirmation - {{confirmationCode}}',
        html_content: '<h1>Booking Confirmed!</h1><p>Code: {{confirmationCode}}</p>',
        text_content: 'Booking Confirmed! Code: {{confirmationCode}}',
        variables: ['confirmationCode']
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const emailData: EmailNotificationData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'booking_confirmation',
        data: {
          confirmationCode: 'ABC123'
        }
      };

      // Mock console.log to capture email output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.sendTemplatedEmail(emailData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT subject, html_content, text_content, variables'),
        ['booking_confirmation']
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('To: test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Booking Confirmation - ABC123'));

      consoleSpy.mockRestore();
    });

    it('should throw error when template not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const emailData: EmailNotificationData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'nonexistent_template',
        data: {}
      };

      await expect(emailService.sendTemplatedEmail(emailData))
        .rejects.toThrow('Email template not found: nonexistent_template');
    });

    it('should send basic email when database not available', async () => {
      const emailServiceWithoutDb = new EmailService();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emailData: EmailNotificationData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'booking_confirmation',
        data: { test: 'data' }
      };

      await emailServiceWithoutDb.sendTemplatedEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('To: test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Test Subject'));

      consoleSpy.mockRestore();
    });
  });

  describe('sendBasicEmail', () => {
    it('should send basic email with text and HTML content', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
        html: '<p>Test HTML content</p>'
      };

      await emailService.sendBasicEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('To: test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Test Subject'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Text Content:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test text content'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTML Content:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('<p>Test HTML content</p>'));

      consoleSpy.mockRestore();
    });

    it('should send basic email with only text content', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content'
      };

      await emailService.sendBasicEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('To: test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Test Subject'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Text Content:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test text content'));

      consoleSpy.mockRestore();
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Subject 1',
          text: 'Content 1'
        },
        {
          to: 'user2@example.com',
          subject: 'Subject 2',
          text: 'Content 2'
        }
      ];

      await emailService.sendBulkEmails(emails);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user1@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user2@example.com'));

      consoleSpy.mockRestore();
    });

    it('should handle errors in bulk email sending', async () => {
      // Mock sendBasicEmail to throw error
      const originalSendBasicEmail = emailService.sendBasicEmail;
      emailService.sendBasicEmail = jest.fn().mockRejectedValue(new Error('Email error'));

      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Subject 1',
          text: 'Content 1'
        }
      ];

      await expect(emailService.sendBulkEmails(emails))
        .rejects.toThrow('Email error');

      // Restore original method
      emailService.sendBasicEmail = originalSendBasicEmail;
    });
  });

  describe('template variable replacement', () => {
    it('should replace template variables correctly', async () => {
      const mockTemplate = {
        subject: 'Hello {{name}}, your order {{orderId}} is ready!',
        html_content: '<h1>Hello {{name}}!</h1><p>Order: {{orderId}}</p><p>Total: {{total}}</p>',
        text_content: 'Hello {{name}}! Order: {{orderId}}, Total: {{total}}',
        variables: ['name', 'orderId', 'total']
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emailData: EmailNotificationData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'order_confirmation',
        data: {
          name: 'John Doe',
          orderId: '12345',
          total: '$99.99'
        }
      };

      await emailService.sendTemplatedEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Hello John Doe, your order 12345 is ready!'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('<h1>Hello John Doe!</h1>'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Order: 12345'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total: $99.99'));

      consoleSpy.mockRestore();
    });

    it('should handle missing template variables', async () => {
      const mockTemplate = {
        subject: 'Hello {{name}}, your order {{orderId}} is ready!',
        html_content: '<h1>Hello {{name}}!</h1><p>Order: {{orderId}}</p>',
        text_content: 'Hello {{name}}! Order: {{orderId}}',
        variables: ['name', 'orderId']
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const emailData: EmailNotificationData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'order_confirmation',
        data: {
          name: 'John Doe'
          // orderId is missing
        }
      };

      await emailService.sendTemplatedEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subject: Hello John Doe, your order  is ready!'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('<h1>Hello John Doe!</h1>'));

      consoleSpy.mockRestore();
    });
  });
});