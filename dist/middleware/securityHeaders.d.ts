import { Request, Response, NextFunction } from 'express';
export declare const securityHeadersMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const noClickjackingMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const noSniffMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const xssProtectionMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const httpsEnforcementMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const referrerPolicyMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const permissionsPolicyMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const noCacheMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
export declare const suspiciousRequestDetection: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=securityHeaders.d.ts.map