"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
const db = new pg_1.Pool();
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
const authenticate = async (req, res, next) => {
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
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await db.query(userQuery, [decoded.userId]);
            if (userResult.rows.length === 0) {
                res.status(401).json({ error: 'User not found' });
                return;
            }
            const user = userResult.rows[0];
            req.user = user;
            next();
        }
        catch (error) {
            logger_1.logger.error('JWT verification failed:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
        return;
    }
};
exports.authenticate = authenticate;
const isAdmin = async (req, res, next) => {
    try {
        return new Promise((resolve, reject) => {
            (0, exports.authenticate)(req, res, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                const user = req.user;
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
    }
    catch (error) {
        logger_1.logger.error('Admin check error:', error);
        res.status(500).json({ error: 'Admin check failed' });
        return;
    }
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=authMiddleware.js.map