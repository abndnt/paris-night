import crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
}

export class EncryptionService {
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;


  private encryptionKey: Buffer;

  constructor(encryptionKey?: string) {
    if (encryptionKey) {
      // If key is provided, derive a proper 32-byte key from it
      this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', EncryptionService.KEY_LENGTH);
    } else {
      // Generate a key from environment variable or use default for development
      const keyString = process.env['ENCRYPTION_KEY'] || 'dev-key-32-chars-long-for-testing';
      this.encryptionKey = crypto.scryptSync(keyString, 'salt', EncryptionService.KEY_LENGTH);
    }
  }

  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(EncryptionService.IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const result = {
        iv: iv.toString('hex'),
        data: encrypted
      };
      
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const combined = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      const iv = Buffer.from(combined.iv, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let decrypted = decipher.update(combined.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  encryptCredentials(credentials: Record<string, any>): string {
    const credentialsString = JSON.stringify(credentials);
    return this.encrypt(credentialsString);
  }

  decryptCredentials(encryptedCredentials: string): Record<string, any> {
    try {
      const decryptedString = this.decrypt(encryptedCredentials);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static generateKey(): string {
    return crypto.randomBytes(EncryptionService.KEY_LENGTH).toString('hex');
  }
}