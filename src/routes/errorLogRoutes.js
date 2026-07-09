import { Router } from 'express';
import {
  getErrors,
  getErrorById,
  sendErrorEmail,
} from '../controllers/errorLogController.js';
import { reportError } from '../controllers/errorReportController.js';
import validate from '../middlewares/validate.js';
import { sendErrorEmailSchema } from '../validators/emailSendValidator.js';
import { errorReportSchema } from '../validators/errorReportValidator.js';

const router = Router();

router.get('/', getErrors);
router.get('/:id', getErrorById);
router.post('/:id/email', validate(sendErrorEmailSchema), sendErrorEmail);
router.post('/report', validate(errorReportSchema), reportError);

export default router;
