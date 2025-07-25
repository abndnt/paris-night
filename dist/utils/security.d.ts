export declare const sanitizeInput: (input: any) => any;
export declare const sanitizeEmail: (email: string) => string | null;
export declare const sanitizeUrl: (url: string, allowedDomains?: string[]) => string | null;
export declare const generateSecureToken: (length?: number) => string;
export declare const hashPassword: (password: string) => string;
export declare const verifyPassword: (password: string, hashedPassword: string) => boolean;
export declare const hashValue: (value: string) => string;
export declare const maskSensitiveData: (data: Record<string, any>, fieldsToMask?: string[]) => Record<string, any>;
export declare const validatePasswordStrength: (password: string) => {
    valid: boolean;
    score: number;
    feedback: string[];
};
export declare const generateCSP: () => string;
export declare const securityHeaders: () => Record<string, string>;
export declare const isSuspiciousIP: (ip: string) => Promise<boolean>;
export declare const validatePhoneNumber: (phoneNumber: string) => string | null;
export declare const encryptData: (data: string, key: string) => string;
export declare const decryptData: (encryptedData: string, key: string) => string;
//# sourceMappingURL=security.d.ts.map