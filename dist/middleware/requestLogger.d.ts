import { Request, Response, NextFunction } from 'express';
export declare const requestLoggerMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiPerformanceMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
export declare const apiPerformanceFinishMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestLogger.d.ts.map