export declare const initializeErrorTracking: () => void;
export declare const captureException: (error: Error, context?: any) => void;
export declare const captureMessage: (message: string, level?: "info" | "warning" | "error") => void;
export declare const addBreadcrumb: (message: string, category?: string, data?: any) => void;
export declare const setUser: (user: any) => void;
export declare const setTag: (key: string, value: string) => void;
export declare const setContext: (key: string, context: any) => void;
export declare const startTransaction: (name: string, operation?: string) => {
    setStatus: (status: string) => void;
    finish: () => void;
};
export declare const withErrorTracking: <T>(operation: string, fn: () => Promise<T>) => Promise<T>;
export declare const testErrorTracking: () => Promise<{
    status: string;
    message: string;
}>;
export declare const sentryErrorHandler: (error: any, req: any, res: any, next: any) => void;
export declare const sentryRequestHandler: (req: any, res: any, next: any) => void;
export declare const sentryTracingHandler: () => (req: any, res: any, next: any) => void;
export declare const setupErrorTrackingForUser: (user: any) => void;
//# sourceMappingURL=errorTracking.simple.d.ts.map