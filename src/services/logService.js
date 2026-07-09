import { randomUUID } from 'crypto';

const logs = [];

export const getAllLogs = async () => logs;

export const getLogById = async (id) => logs.find((log) => log.id === id);

export const createLog = async ({ level, message, meta }) => {
  const log = {
    id: randomUUID(),
    level,
    message,
    meta: meta ?? null,
    createdAt: new Date().toISOString(),
  };
  logs.push(log);
  return log;
};

export const deleteLog = async (id) => {
  const index = logs.findIndex((log) => log.id === id);
  if (index === -1) return null;
  return logs.splice(index, 1)[0];
};
