import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';
import chatRoutes from './chat';

const router = Router();

// Mount health routes
router.use(healthRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

// Mount chat routes
router.use('/chat', chatRoutes);

// API version info
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

export default router;