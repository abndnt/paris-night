import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

const db = new Pool(); // This should be your configured database pool
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      // Get user from database
      const userQuery = 'SELECT * FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Attach user to request object
      (req as any).user = user;
      
      next();
    } catch (error) {
      logger.error('JWT verification failed:', error);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First authenticate the user
    return new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err?: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Check if user is an admin
        const user = (req as any).user;
        
        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          resolve();
          return;
        }
        
        if (!user.is_admin) {
          res.status(403).json({ error: 'Admin access required' });
          resolve();
          return;
        }
        
        next();
        resolve();
      });
    });
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({ error: 'Admin check failed' });
    return;
  }
};