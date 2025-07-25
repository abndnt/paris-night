import { Pool } from 'pg';
import { EmailNotificationData } from '../models/Notification';
interface BasicEmailData {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}
export declare class EmailService {
    private db?;
    constructor(db?: Pool);
    sendTemplatedEmail(emailData: EmailNotificationData): Promise<void>;
    sendBasicEmail(emailData: BasicEmailData): Promise<void>;
    private replaceVariables;
    private isValidEmail;
    sendBulkEmails(emails: BasicEmailData[]): Promise<void>;
}
export {};
//# sourceMappingURL=EmailService.d.ts.map