"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const logger_1 = require("../utils/logger");
class EmailService {
    constructor(db) {
        this.db = db;
    }
    async sendTemplatedEmail(emailData) {
        try {
            if (!this.db) {
                logger_1.logger.warn('Database not available for email templates');
                return this.sendBasicEmail({
                    to: emailData.to,
                    subject: emailData.subject,
                    text: JSON.stringify(emailData.data)
                });
            }
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
            const subject = this.replaceVariables(template.subject, emailData.data);
            const htmlContent = this.replaceVariables(template.html_content, emailData.data);
            const textContent = template.text_content ?
                this.replaceVariables(template.text_content, emailData.data) : undefined;
            await this.sendBasicEmail({
                to: emailData.to,
                subject,
                html: htmlContent,
                text: textContent
            });
            logger_1.logger.info(`Templated email sent to ${emailData.to} using template ${emailData.template}`);
        }
        catch (error) {
            logger_1.logger.error('Error sending templated email:', error);
            throw error;
        }
    }
    async sendBasicEmail(emailData) {
        try {
            logger_1.logger.info('📧 Email would be sent:', {
                to: emailData.to,
                subject: emailData.subject,
                hasHtml: !!emailData.html,
                hasText: !!emailData.text
            });
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
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        catch (error) {
            logger_1.logger.error('Error sending basic email:', error);
            throw error;
        }
    }
    replaceVariables(template, data) {
        let result = template;
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, String(data[key] || ''));
        });
        return result;
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async sendBulkEmails(emails) {
        try {
            const promises = emails.map(email => this.sendBasicEmail(email));
            await Promise.all(promises);
            logger_1.logger.info(`Bulk email sent to ${emails.length} recipients`);
        }
        catch (error) {
            logger_1.logger.error('Error sending bulk emails:', error);
            throw error;
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map