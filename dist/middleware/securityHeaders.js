"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspiciousRequestDetection = exports.noCacheMiddleware = exports.permissionsPolicyMiddleware = exports.referrerPolicyMiddleware = exports.httpsEnforcementMiddleware = exports.xssProtectionMiddleware = exports.noSniffMiddleware = exports.noClickjackingMiddleware = exports.securityHeadersMiddleware = void 0;
const security_1 = require("../utils/security");
const config_1 = require("../config");
const securityHeadersMiddleware = (_req, res, next) => {
    const headers = (0, security_1.securityHeaders)();
    Object.entries(headers).forEach(([header, value]) => {
        res.setHeader(header, value);
    });
    res.cookie('cookieConsent', 'true', {
        httpOnly: true,
        secure: config_1.config.server.nodeEnv === 'production',
        sameSite: 'strict',
    });
    next();
};
exports.securityHeadersMiddleware = securityHeadersMiddleware;
const noClickjackingMiddleware = (_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
};
exports.noClickjackingMiddleware = noClickjackingMiddleware;
const noSniffMiddleware = (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
};
exports.noSniffMiddleware = noSniffMiddleware;
const xssProtectionMiddleware = (_req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
};
exports.xssProtectionMiddleware = xssProtectionMiddleware;
const httpsEnforcementMiddleware = (req, res, next) => {
    if (config_1.config.server.nodeEnv === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.headers.host}${req.url}`);
            return;
        }
    }
    next();
};
exports.httpsEnforcementMiddleware = httpsEnforcementMiddleware;
const referrerPolicyMiddleware = (_req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};
exports.referrerPolicyMiddleware = referrerPolicyMiddleware;
const permissionsPolicyMiddleware = (_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
    next();
};
exports.permissionsPolicyMiddleware = permissionsPolicyMiddleware;
const noCacheMiddleware = (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};
exports.noCacheMiddleware = noCacheMiddleware;
const suspiciousRequestDetection = (req, res, next) => {
    const suspiciousParams = ['eval', 'exec', 'script', 'alert', 'document.cookie', 'onload'];
    const queryString = req.url.split('?')[1] || '';
    if (suspiciousParams.some(param => queryString.toLowerCase().includes(param))) {
        res.status(403).json({
            error: {
                message: 'Suspicious request detected',
                code: 'SUSPICIOUS_REQUEST',
            }
        });
        return;
    }
    const suspiciousHeaders = ['x-forwarded-host', 'x-host'];
    for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
            res.status(403).json({
                error: {
                    message: 'Suspicious request detected',
                    code: 'SUSPICIOUS_REQUEST',
                }
            });
            return;
        }
    }
    next();
};
exports.suspiciousRequestDetection = suspiciousRequestDetection;
//# sourceMappingURL=securityHeaders.js.map