// Simplified error tracking for development/testing
// This replaces the complex Sentry integration for initial testing

export const initializeErrorTracking = () => {
  console.log('📊 Error tracking initialized (simplified mode)');
};

export const captureException = (error: Error, context?: any) => {
  console.error('🚨 Exception captured:', error.message, context);
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  console.log(`📝 [${level.toUpperCase()}] ${message}`);
};

export const addBreadcrumb = (message: string, category: string = 'general', data?: any) => {
  console.log(`🍞 Breadcrumb: [${category}] ${message}`, data);
};

export const setUser = (user: any) => {
  console.log('👤 User set:', user);
};

export const setTag = (key: string, value: string) => {
  console.log(`🏷️  Tag set: ${key} = ${value}`);
};

export const setContext = (key: string, context: any) => {
  console.log(`📋 Context set: ${key}`, context);
};

export const startTransaction = (name: string, operation: string = 'http') => {
  console.log(`🚀 Transaction started: ${name} (${operation})`);
  return {
    setStatus: (status: string) => console.log(`📊 Transaction status: ${status}`),
    finish: () => console.log(`✅ Transaction finished: ${name}`)
  };
};

export const withErrorTracking = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  console.log(`🔄 Starting operation: ${operation}`);
  try {
    const result = await fn();
    console.log(`✅ Operation completed: ${operation}`);
    return result;
  } catch (error) {
    console.error(`❌ Operation failed: ${operation}`, error);
    throw error;
  }
};

export const testErrorTracking = async () => {
  console.log('🧪 Error tracking test completed (simplified mode)');
  return { status: 'ok', message: 'Simplified error tracking is working' };
};

// Mock middleware functions
export const sentryErrorHandler = (error: any, _req: any, _res: any, next: any) => {
  console.error('🚨 Error handler:', error.message);
  next(error);
};

export const sentryRequestHandler = (_req: any, _res: any, next: any) => {
  next();
};

export const sentryTracingHandler = () => (_req: any, _res: any, next: any) => {
  next();
};

export const setupErrorTrackingForUser = (user: any) => {
  console.log('👤 Error tracking setup for user:', user);
};