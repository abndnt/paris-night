import * as Sentry from '@sentry/react';

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    requestId?: string;
    timestamp: string;
    recoverySteps?: string[];
    retryable?: boolean;
    supportReference?: string;
  };
}

/**
 * Error handling service for frontend
 */
class ErrorHandlingService {
  private initialized = false;

  /**
   * Initialize error tracking
   */
  public initialize(dsn?: string): void {
    if (this.initialized || !dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      release: process.env.REACT_APP_VERSION || '1.0.0',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event) {
        // Filter out sensitive information
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        // Don't send errors for canceled requests
        if (event.exception?.values?.some(e => 
          e.value?.includes('canceled') || 
          e.value?.includes('aborted')
        )) {
          return null;
        }
        
        return event;
      },
    });

    this.initialized = true;
  }

  /**
   * Capture exception with context
   */
  public captureException(error: Error, context?: Record<string, any>, user?: any): void {
    if (!this.initialized) {
      console.error('Error tracking not initialized:', error);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }
      
      if (user) {
        scope.setUser({
          id: user.id,
          email: user.email,
          username: user.username,
        });
      }
      
      Sentry.captureException(error);
    });
  }

  /**
   * Set user context for error tracking
   */
  public setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (!this.initialized) return;
    
    Sentry.setUser(user);
  }

  /**
   * Handle API error response
   */
  public handleApiError(error: any): ApiErrorResponse {
    // Extract error response if it exists
    const errorResponse = error.response?.data as ApiErrorResponse;
    
    if (errorResponse?.error) {
      // Log to error tracking service if it's a server error
      if (error.response?.status >= 500) {
        this.captureException(new Error(errorResponse.error.message), {
          apiError: errorResponse.error,
          status: error.response.status,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
      
      return errorResponse;
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      return {
        error: {
          message: 'Unable to connect to the server. Please check your internet connection.',
          code: 'NetworkError',
          timestamp: new Date().toISOString(),
          recoverySteps: [
            'Check your internet connection',
            'Try again in a few moments',
            'If the problem persists, contact support'
          ],
          retryable: true
        }
      };
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        error: {
          message: 'The request timed out. Please try again.',
          code: 'TimeoutError',
          timestamp: new Date().toISOString(),
          recoverySteps: [
            'Try again in a few moments',
            'If the problem persists, try a simpler request'
          ],
          retryable: true
        }
      };
    }
    
    // Handle canceled requests
    if (error.message === 'canceled') {
      return {
        error: {
          message: 'Request was canceled.',
          code: 'RequestCanceled',
          timestamp: new Date().toISOString(),
          retryable: true
        }
      };
    }
    
    // Default error
    return {
      error: {
        message: error.message || 'An unexpected error occurred.',
        code: 'UnknownError',
        timestamp: new Date().toISOString(),
        recoverySteps: [
          'Try refreshing the page',
          'If the problem persists, contact support'
        ],
        retryable: true
      }
    };
  }
  
  /**
   * Format error message with recovery steps
   */
  public formatErrorMessage(errorResponse: ApiErrorResponse): {
    message: string;
    recoverySteps?: string[];
    supportReference?: string;
  } {
    return {
      message: errorResponse.error.message,
      recoverySteps: errorResponse.error.recoverySteps,
      supportReference: errorResponse.error.supportReference
    };
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();