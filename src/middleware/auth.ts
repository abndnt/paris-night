import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
    };
    
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Type-safe wrapper for authenticated routes
export const withAuth = <T extends AuthenticatedRequest>(
  handler: (req: T, res: Response) => Promise<Response | void>
) => {
  return async (req: Request, res: Response): Promise<Response | void> => {
    return handler(req as T, res);
  };
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
      };
      (req as AuthenticatedRequest).user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      console.warn('Invalid token provided, continuing without auth');
    }
  }

  next();
};