"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthService_1 = require("../services/AuthService");
const authValidation_1 = require("../validation/authValidation");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const authService = new AuthService_1.AuthService(database_1.database);
router.post('/register', async (req, res) => {
    try {
        const { error, value } = (0, authValidation_1.validateRegister)(req.body);
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
        const result = await authService.register(value);
        logger_1.logger.info(`User registered successfully: ${result.user.email}`);
        res.status(201).json({
            message: 'User registered successfully',
            user: result.user,
            token: result.token,
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
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
router.post('/login', async (req, res) => {
    try {
        const { error, value } = (0, authValidation_1.validateLogin)(req.body);
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
        const result = await authService.login(value);
        logger_1.logger.info(`User logged in successfully: ${result.user.email}`);
        res.json({
            message: 'Login successful',
            user: result.user,
            token: result.token,
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
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
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Get profile error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching profile',
        });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { error, value } = (0, authValidation_1.validateUpdateProfile)(req.body);
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
        const updatedUser = await authService.updateUserProfile(req.user.id, value);
        if (!updatedUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        logger_1.logger.info(`User profile updated: ${updatedUser.email}`);
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        logger_1.logger.error('Update profile error:', error);
        res.status(500).json({
            error: 'Internal server error while updating profile',
        });
    }
});
router.get('/verify', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Token verification error:', error);
        res.status(500).json({
            error: 'Internal server error during token verification',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map