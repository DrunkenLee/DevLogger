import * as healthService from '../services/healthService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const getHealth = asyncHandler(async (req, res) => {
  const health = await healthService.getHealth();
  res.status(200).json(success(health, 'Health check successful'));
});
