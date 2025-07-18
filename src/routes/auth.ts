import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { validateRegister, validateLogin, validateUpdateProfile } from '../validation/authValidation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { database } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService(database);

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request data
    const { error, value } = validateRegister(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
      return;
    }

    // Register user
    const result = await authService.register(value);
    
    logger.info(`User registered successfully: ${result.user.email}`);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error instanceof Error && error.message === 'User with this email already exists') {
      res.status(409).json({
        error: 'User with this email already exists',
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal server error during registration',
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request data
    const { error, value } = validateLogin(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
      return;
    }

    // Login user
    const result = await authService.login(value);
    
    logger.info(`User logged in successfully: ${result.user.email}`);
    
    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    if (error instanceof Error && error.message === 'Invalid email or password') {
      res.status(401).json({
        error: 'Invalid email or password',
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal server error during login',
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await authService.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching profile',
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Validate request data
    const { error, value } = validateUpdateProfile(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
      return;
    }

    // Update user profile
    const updatedUser = await authService.updateUserProfile(req.user.id, value);
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info(`User profile updated: ${updatedUser.email}`);
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error while updating profile',
    });
  }
});

// Verify token endpoint (useful for frontend token validation)
router.get('/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
      },
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      error: 'Internal server error during token verification',
    });
  }
});

export default router;