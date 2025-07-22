"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class EncryptionService {
    constructor(encryptionKey) {
        if (encryptionKey) {
            this.encryptionKey = crypto_1.default.scryptSync(encryptionKey, 'salt', EncryptionService.KEY_LENGTH);
        }
        else {
            const keyString = process.env['ENCRYPTION_KEY'] || 'dev-key-32-chars-long-for-testing';
            this.encryptionKey = crypto_1.default.scryptSync(keyString, 'salt', EncryptionService.KEY_LENGTH);
        }
    }
    encrypt(data) {
        try {
            const iv = crypto_1.default.randomBytes(EncryptionService.IV_LENGTH);
            const cipher = crypto_1.default.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const result = {
                iv: iv.toString('hex'),
                data: encrypted
            };
            return Buffer.from(JSON.stringify(result)).toString('base64');
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    decrypt(encryptedData) {
        try {
            const combined = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
            const iv = Buffer.from(combined.iv, 'hex');
            const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
            let decrypted = decipher.update(combined.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    encryptCredentials(credentials) {
        const credentialsString = JSON.stringify(credentials);
        return this.encrypt(credentialsString);
    }
    decryptCredentials(encryptedCredentials) {
        try {
            const decryptedString = this.decrypt(encryptedCredentials);
            return JSON.parse(decryptedString);
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static generateKey() {
        return crypto_1.default.randomBytes(EncryptionService.KEY_LENGTH).toString('hex');
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.KEY_LENGTH = 32;
EncryptionService.IV_LENGTH = 16;
//# sourceMappingURL=EncryptionService.js.map