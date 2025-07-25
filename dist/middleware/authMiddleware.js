"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pg_1 = require("pg");
const logger_1 = __importDefault(require("../utils/logger"));
const db = new pg_1.Pool();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await db.query(userQuery, [decoded.userId]);
            if (userResult.rows.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }
            const user = userResult.rows[0];
            req.user = user;
            next();
        }
        catch (error) {
            logger_1.default.error('JWT verification failed:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
const isAdmin = async (req, res, next) => {
    try {
        (0, exports.authenticate)(req, res, () => {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!user.is_admin) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            next();
        });
    }
    catch (error) {
        logger_1.default.error('Admin check error:', error);
        return res.status(500).json({ error: 'Admin check failed' });
    }
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=authMiddleware.js.map