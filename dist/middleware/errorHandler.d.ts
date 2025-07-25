import { Request, Response, NextFunction } from 'express';
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorHandler: (error: Error, req: Request, res: Response, _next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validationErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const databaseErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const rateLimitHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.d.ts.map