import { redisService } from '@core/infrastructure/redis/redis.service';
import { logger } from '@shared/logger/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
}

const CB_KEY_PREFIX = 'cb:';
const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30000;

/**
 * Distributed Circuit Breaker backed by Redis.
 *
 * State is stored as a Redis Hash: `cb:{configId}`
 *   - state:           CLOSED | OPEN | HALF_OPEN
 *   - failures:        integer failure count
 *   - lastFailureTime: unix timestamp ms
 *
 * Falls back to in-process state if Redis is unavailable (single-instance
 * safety net — not distributed when Redis is down).
 */
export class CircuitBreaker {
  private static localFallback: Map<string, CircuitBreakerState> = new Map();

  private constructor(
    private readonly key: string,
    private readonly threshold: number = DEFAULT_THRESHOLD,
    private readonly cooldownMs: number = DEFAULT_COOLDOWN_MS
  ) {}

  public static getBreaker(
    key: string,
    threshold = DEFAULT_THRESHOLD,
    cooldownMs = DEFAULT_COOLDOWN_MS
  ): CircuitBreaker {
    return new CircuitBreaker(key, threshold, cooldownMs);
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const state = await this._readState();
    const evaluated = this._evaluate(state);

    if (evaluated.state === CircuitState.OPEN) {
      logger.warn({ key: this.key, state: evaluated.state }, 'Circuit breaker blocked execution');
      throw new Error(`Circuit breaker OPEN for gateway ${this.key}. Retry after ${this.cooldownMs / 1000}s.`);
    }

    try {
      const result = await action();
      await this._handleSuccess();
      return result;
    } catch (error: any) {
      await this._handleFailure(error);
      throw error;
    }
  }

  public async getState(): Promise<CircuitState> {
    const state = await this._readState();
    return this._evaluate(state).state;
  }

  public async reset(): Promise<void> {
    await this._writeState({ state: CircuitState.CLOSED, failures: 0, lastFailureTime: 0 });
    logger.info({ key: this.key }, 'Circuit breaker manually reset to CLOSED');
  }

  // ─── Private ──────────────────────────────────────────────────────────────
  private _evaluate(state: CircuitBreakerState): CircuitBreakerState {
    if (state.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - state.lastFailureTime > this.cooldownMs) {
        return { ...state, state: CircuitState.HALF_OPEN };
      }
    }
    return state;
  }

  private async _handleSuccess(): Promise<void> {
    const current = await this._readState();
    if (current.state !== CircuitState.CLOSED) {
      logger.info({ key: this.key }, 'Circuit breaker returned to CLOSED');
    }
    await this._writeState({ state: CircuitState.CLOSED, failures: 0, lastFailureTime: 0 });
  }

  private async _handleFailure(error: any): Promise<void> {
    const current = await this._readState();
    const failures = current.failures + 1;
    const lastFailureTime = Date.now();

    logger.warn({ key: this.key, failures, err: error.message }, 'Circuit breaker logged failure');

    const newState = failures >= this.threshold ? CircuitState.OPEN : CircuitState.CLOSED;
    if (newState === CircuitState.OPEN) {
      logger.error({ key: this.key }, 'Circuit breaker tripped OPEN');
    }

    await this._writeState({ state: newState, failures, lastFailureTime });
  }

  private async _readState(): Promise<CircuitBreakerState> {
    const redisKey = `${CB_KEY_PREFIX}${this.key}`;

    // Try Redis first
    const raw = await redisService.hgetall(redisKey);
    if (raw) {
      return {
        state: (raw.state as CircuitState) || CircuitState.CLOSED,
        failures: parseInt(raw.failures || '0', 10),
        lastFailureTime: parseInt(raw.lastFailureTime || '0', 10)
      };
    }

    // Fallback to local map when Redis is down
    return (
      CircuitBreaker.localFallback.get(this.key) || {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0
      }
    );
  }

  private async _writeState(state: CircuitBreakerState): Promise<void> {
    const redisKey = `${CB_KEY_PREFIX}${this.key}`;

    // Write to Redis (no TTL — circuit breaker state must persist)
    await redisService.hset(redisKey, {
      state: state.state,
      failures: state.failures,
      lastFailureTime: state.lastFailureTime
    });

    // Mirror to local fallback
    CircuitBreaker.localFallback.set(this.key, state);
  }
}
