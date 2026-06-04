import pino from 'pino';

let transport: any;
try {
  require.resolve('pino-pretty', { paths: [process.cwd(), __dirname] });
  transport = { target: 'pino-pretty' };
} catch (e) {
  // pino-pretty is not installed, default to standard JSON logging
}

export const createLogger = (name: string) => {
  return pino(
    transport
      ? { name, transport }
      : { name }
  );
};

export default createLogger;
