import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import logRoutes from './logRoutes.js';
import errorLogRoutes from './errorLogRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/logs', logRoutes);
router.use('/errors', errorLogRoutes);

export default router;
