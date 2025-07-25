import { Request, Response, NextFunction } from 'express';
interface AdvancedRateLimitOptions {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    headers?: boolean;
    handler?: (req: Request, res: Response) => void;
    skipFailedRequests?: boolean;
    requestWasSuccessful?: (req: Request, res: Response) => boolean;
    skip?: (req: Request, res: Response) => boolean;
    trustProxy?: boolean;
    blacklist?: string[];
    whitelist?: string[];
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    store?: any;
}
export declare const createAdvancedRateLimit: (options: AdvancedRateLimitOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const defaultAdvancedRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sensitiveOperationRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const ddosProtection: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=advancedRateLimit.d.ts.map