"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_1 = __importDefault(require("./health"));
const auth_1 = __importDefault(require("./auth"));
const chat_1 = __importDefault(require("./chat"));
const router = (0, express_1.Router)();
router.use(health_1.default);
router.use('/auth', auth_1.default);
router.use('/chat', chat_1.default);
router.get('/', (_req, res) => {
    res.json({
        name: 'Flight Search SaaS API',
        version: '1.0.0',
        description: 'AI-powered flight search platform with points optimization',
        endpoints: {
            health: '/health',
            ready: '/ready',
            live: '/live',
            auth: {
                register: '/auth/register',
                login: '/auth/login',
                profile: '/auth/profile',
                verify: '/auth/verify',
            },
            chat: {
                sessions: '/chat/sessions',
                messages: '/chat/sessions/:sessionId/messages',
                stats: '/chat/stats',
            },
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map