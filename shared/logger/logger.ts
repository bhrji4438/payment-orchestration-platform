import pino from 'pino';

let transport: any;
try {
  require.resolve('pino-pretty', { paths: [process.cwd(), __dirname] });
  transport = { target: 'pino-pretty' };
} catch (e) {
  // pino-pretty is not installed, default to standard JSON logging
}

export const logger = pino(transport ? { transport } : {});

export default logger;
