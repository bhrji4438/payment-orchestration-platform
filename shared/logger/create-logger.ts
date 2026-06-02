import pino from 'pino';

export const createLogger = (name: string) => {
  return pino({
    name,
    transport: { target: 'pino-pretty' }
  });
};

export default createLogger;
