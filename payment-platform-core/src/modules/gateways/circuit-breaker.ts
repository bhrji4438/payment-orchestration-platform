import pino from 'pino';

const logger = pino({
  transport: { target: 'pino-pretty' }
});

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private static instances: Map<string, CircuitBreaker> = new Map();

  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;

  private constructor(
    private readonly key: string,
    private readonly threshold: number = 3,
    private readonly cooldownMs: number = 30000
  ) {}

  public static getBreaker(key: string, threshold = 3, cooldownMs = 30000): CircuitBreaker {
    let breaker = this.instances.get(key);
    if (!breaker) {
      breaker = new CircuitBreaker(key, threshold, cooldownMs);
      this.instances.set(key, breaker);
    }
    return breaker;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === CircuitState.OPEN) {
      logger.warn({ breakerKey: this.key, state: this.state }, 'Circuit breaker blocked execution');
      throw new Error(`Circuit breaker is OPEN for gateway configuration: ${this.key}. Please try again later.`);
    }

    try {
      const result = await action();
      this.handleSuccess();
      return result;
    } catch (error: any) {
      this.handleFailure(error);
      throw error;
    }
  }

  private evaluateState(): void {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        logger.info({ breakerKey: this.key, state: this.state }, 'Circuit breaker entered HALF_OPEN state');
      }
    }
  }

  private handleSuccess(): void {
    if (this.state !== CircuitState.CLOSED) {
      logger.info({ breakerKey: this.key, state: CircuitState.CLOSED }, 'Circuit breaker returned to CLOSED state');
    }
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private handleFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    logger.warn({ breakerKey: this.key, failures: this.failures, error: error.message }, 'Circuit breaker logged failure');

    if (this.failures >= this.threshold) {
      this.state = CircuitState.OPEN;
      logger.error({ breakerKey: this.key, state: this.state }, 'Circuit breaker tripped to OPEN state');
    }
  }

  public getState(): CircuitState {
    return this.state;
  }

  public reset(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }
}
