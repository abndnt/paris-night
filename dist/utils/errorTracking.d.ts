export declare const initializeErrorTracking: () => void;
export declare const errorTracker: {
    captureException: (error: Error, context?: Record<string, any>, user?: any) => void;
    captureMessage: (message: string, level?: "info" | "warning" | "error", context?: Record<string, any>) => void;
    addBreadcrumb: (message: string, category: string, data?: Record<string, any>) => void;
    setUser: (user: {
        id: string;
        email?: string;
        username?: string;
        role?: string;
    }) => void;
    clearUser: () => void;
    setTag: (key: string, value: string) => void;
    setContext: (name: string, context: Record<string, any>) => void;
    startTransaction: (name: string, operation: string) => any;
    finishTransaction: (transaction: any) => void;
    startSpan: (transaction: any, name: string, operation: string) => any;
    captureErrorWithRecovery: (error: Error, recoverySteps: string[], context?: Record<string, any>, user?: any) => void;
    healthCheck: () => Promise<{
        status: string;
        details?: Record<string, any>;
    }>;
};
export declare const sentryErrorHandler: (error: any, req: any, res: any, next: any) => void;
export declare const sentryRequestHandler: (req: any, res: any, next: any) => void;
export declare const sentryRequestIdMiddleware: (req: any, _res: any, next: Function) => void;
//# sourceMappingURL=errorTracking.d.ts.map