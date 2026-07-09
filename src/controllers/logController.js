import * as logService from '../services/logService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import ApiError from '../utils/ApiError.js';

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await logService.getAllLogs();
  res.status(200).json(success(logs, 'Logs retrieved successfully'));
});

export const getLog = asyncHandler(async (req, res) => {
  const log = await logService.getLogById(req.params.id);
  if (!log) {
    throw new ApiError(404, 'Log not found');
  }
  res.status(200).json(success(log, 'Log retrieved successfully'));
});

export const createLog = asyncHandler(async (req, res) => {
  const log = await logService.createLog(req.body);
  res.status(201).json(success(log, 'Log created successfully'));
});

export const deleteLog = asyncHandler(async (req, res) => {
  const log = await logService.deleteLog(req.params.id);
  if (!log) {
    throw new ApiError(404, 'Log not found');
  }
  res.status(200).json(success(log, 'Log deleted successfully'));
});
