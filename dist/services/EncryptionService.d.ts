export interface EncryptionResult {
    encryptedData: string;
    iv: string;
}
export declare class EncryptionService {
    private static readonly KEY_LENGTH;
    private static readonly IV_LENGTH;
    private encryptionKey;
    constructor(encryptionKey?: string);
    encrypt(data: string): string;
    decrypt(encryptedData: string): string;
    encryptCredentials(credentials: Record<string, any>): string;
    decryptCredentials(encryptedCredentials: string): Record<string, any>;
    static generateKey(): string;
}
//# sourceMappingURL=EncryptionService.d.ts.map