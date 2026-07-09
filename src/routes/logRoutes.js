import { Router } from 'express';
import {
  getLogs,
  getLog,
  createLog,
  deleteLog,
} from '../controllers/logController.js';
import validate from '../middlewares/validate.js';
import { createLogSchema } from '../validators/logValidator.js';

const router = Router();

router.get('/', getLogs);
router.post('/', validate(createLogSchema), createLog);
router.get('/:id', getLog);
router.delete('/:id', deleteLog);

export default router;
