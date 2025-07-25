import * as winston from 'winston';
export declare const logger: winston.Logger;
export declare const loggers: {
    request: (req: any, res: any, duration?: number) => void;
    error: (message: string, error: Error, context?: Record<string, any>) => void;
    business: (event: string, data: Record<string, any>) => void;
    performance: (operation: string, duration: number, metadata?: Record<string, any>) => void;
    security: (event: string, data: Record<string, any>) => void;
    database: (operation: string, table?: string, duration?: number, error?: Error) => void;
    externalApi: (service: string, operation: string, duration?: number, error?: Error) => void;
};
//# sourceMappingURL=logger.d.ts.map