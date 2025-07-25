import { Request, Response, NextFunction } from 'express';
export declare const securityHeadersMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const noClickjackingMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const noSniffMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const xssProtectionMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const httpsEnforcementMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const referrerPolicyMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const permissionsPolicyMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const noCacheMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const suspiciousRequestDetection: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=securityHeaders.d.ts.map