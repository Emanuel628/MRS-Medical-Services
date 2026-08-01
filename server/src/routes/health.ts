import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({
    status: 'ok',
    service: 'mrs-medical-services',
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'local',
    commit:
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      process.env.SOURCE_COMMIT ||
      'unknown',
    deployedAt: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
  });
});

export default router;
