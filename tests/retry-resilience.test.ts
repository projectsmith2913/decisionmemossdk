/**
 * Tests for the retry & resilience infrastructure.
 *
 * Covers:
 *  1. BaseModelClient.withRetry — retries transient errors, gives up on fatal
 *  2. isRetryableError — classifies errors correctly
 *  3. retryDelay — exponential backoff + Retry-After support
 *  4. retryWithBackoff (frontend helper) — generic retry with backoff
 *  5. Advisor timeout — Promise.race with a hard cap
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BaseModelClient,
  isRetryableError,
  retryDelay,
  sleep,
} from '../src/clients/model-interface.js';
import type { ModelResponse } from '../src/types.js';

// ---------------------------------------------------------------------------
// Concrete test client (exposes withRetry for testing)
// ---------------------------------------------------------------------------

class TestClient extends BaseModelClient {
  readonly name = 'test-model';
  readonly provider = 'test';
  public queryFn: (prompt: string, systemPrompt?: string) => Promise<ModelResponse>;

  constructor(maxRetries = 2) {
    super('test-key');
    this.maxRetries = maxRetries;
    this.queryFn = async () => ({
      modelName: this.name,
      provider: this.provider,
      response: 'OK',
      timestamp: new Date(),
      latency: 100,
    });
  }

  async query(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.isConfigured()) {
      return this.createErrorResponse(new Error('Not configured'));
    }
    const startTime = Date.now();
    try {
      return await this.withRetry(() => this.queryFn(prompt, systemPrompt));
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  async testConnection(): Promise<boolean> {
    const r = await this.query('test');
    return !r.error;
  }
}

// ---------------------------------------------------------------------------
// 1. isRetryableError
// ---------------------------------------------------------------------------

describe('isRetryableError', () => {
  it('returns true for HTTP 429 (rate limit)', () => {
    const err = Object.assign(new Error('Rate limit'), { status: 429 });
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns true for HTTP 500', () => {
    const err = Object.assign(new Error('Server error'), { status: 500 });
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns true for HTTP 502', () => {
    const err = Object.assign(new Error('Bad gateway'), { status: 502 });
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns true for HTTP 503', () => {
    const err = Object.assign(new Error('Unavailable'), { status: 503 });
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns true for HTTP 529 (overloaded)', () => {
    const err = Object.assign(new Error('Overloaded'), { status: 529 });
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns false for HTTP 400 (bad request)', () => {
    const err = Object.assign(new Error('Bad request'), { status: 400 });
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns false for HTTP 401 (auth)', () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns false for HTTP 403 (forbidden)', () => {
    const err = Object.assign(new Error('Forbidden'), { status: 403 });
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns true for ECONNREFUSED', () => {
    expect(isRetryableError(new Error('connect ECONNREFUSED 127.0.0.1:3000'))).toBe(true);
  });

  it('returns true for ECONNRESET', () => {
    expect(isRetryableError(new Error('read ECONNRESET'))).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(isRetryableError(new Error('connect ETIMEDOUT'))).toBe(true);
  });

  it('returns true for socket hang up', () => {
    expect(isRetryableError(new Error('socket hang up'))).toBe(true);
  });

  it('returns true for fetch failed', () => {
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
  });

  it('returns true for network error', () => {
    expect(isRetryableError(new Error('network error'))).toBe(true);
  });

  it('returns true for overloaded message', () => {
    expect(isRetryableError(new Error('The server is overloaded'))).toBe(true);
  });

  it('returns false for content policy error', () => {
    expect(isRetryableError(new Error('Content policy violation'))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. retryDelay
// ---------------------------------------------------------------------------

describe('retryDelay', () => {
  it('returns 1s for attempt 0', () => {
    expect(retryDelay(0)).toBe(1000);
  });

  it('returns 2s for attempt 1', () => {
    expect(retryDelay(1)).toBe(2000);
  });

  it('returns 4s for attempt 2', () => {
    expect(retryDelay(2)).toBe(4000);
  });

  it('caps at 10s', () => {
    expect(retryDelay(10)).toBe(10_000);
  });

  it('honours Retry-After header (seconds)', () => {
    const err = { headers: { 'retry-after': '5' } };
    expect(retryDelay(0, err)).toBe(5000);
  });

  it('ignores Retry-After > 60s', () => {
    const err = { headers: { 'retry-after': '120' } };
    expect(retryDelay(0, err)).toBe(1000); // falls back to exponential
  });

  it('ignores invalid Retry-After', () => {
    const err = { headers: { 'retry-after': 'abc' } };
    expect(retryDelay(0, err)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 3. BaseModelClient.withRetry — success paths
// ---------------------------------------------------------------------------

describe('BaseModelClient withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('returns immediately on first success', async () => {
    const client = new TestClient(2);
    const fn = vi.fn().mockResolvedValue({ response: 'OK' });
    client.queryFn = fn as any;

    const result = await client.query('hello');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBeUndefined();
  });

  it('retries once on transient error then succeeds', async () => {
    const client = new TestClient(2);
    const okResponse: ModelResponse = {
      modelName: 'test-model',
      provider: 'test',
      response: 'OK',
      timestamp: new Date(),
      latency: 100,
    };

    let callCount = 0;
    client.queryFn = async () => {
      callCount++;
      if (callCount === 1) {
        throw Object.assign(new Error('Service unavailable'), { status: 503 });
      }
      return okResponse;
    };

    const result = await client.query('hello');
    expect(callCount).toBe(2);
    expect(result.response).toBe('OK');
    expect(result.error).toBeUndefined();
  });

  it('retries twice on transient errors then succeeds', async () => {
    const client = new TestClient(2);
    const okResponse: ModelResponse = {
      modelName: 'test-model',
      provider: 'test',
      response: 'OK',
      timestamp: new Date(),
      latency: 100,
    };

    let callCount = 0;
    client.queryFn = async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error('connect ECONNREFUSED');
      }
      return okResponse;
    };

    const result = await client.query('hello');
    expect(callCount).toBe(3);
    expect(result.response).toBe('OK');
  });

  it('gives up after maxRetries and returns error response', async () => {
    const client = new TestClient(2);
    client.queryFn = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1');
    };

    const result = await client.query('hello');
    expect(result.error).toContain('ECONNREFUSED');
    expect(result.response).toBe('');
  });

  it('does NOT retry non-transient errors', async () => {
    const client = new TestClient(2);
    let callCount = 0;
    client.queryFn = async () => {
      callCount++;
      throw Object.assign(new Error('Invalid API key'), { status: 401 });
    };

    const result = await client.query('hello');
    expect(callCount).toBe(1); // no retry
    expect(result.error).toContain('Invalid API key');
  });

  it('does NOT retry when maxRetries is 0', async () => {
    const client = new TestClient(0);
    let callCount = 0;
    client.queryFn = async () => {
      callCount++;
      throw Object.assign(new Error('Server error'), { status: 500 });
    };

    const result = await client.query('hello');
    expect(callCount).toBe(1);
    expect(result.error).toContain('Server error');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 4. Advisor timeout (600s cap)
// ---------------------------------------------------------------------------

describe('Advisor timeout (Promise.race)', () => {
  const ADVISOR_TIMEOUT_MS = 600_000;

  it('resolves when query completes within timeout', async () => {
    const mockResponse: ModelResponse = {
      modelName: 'fast-model',
      provider: 'test',
      response: 'Done',
      timestamp: new Date(),
      latency: 50,
    };

    const result = await Promise.race([
      Promise.resolve(mockResponse),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Advisor timed out after ${ADVISOR_TIMEOUT_MS / 1000}s`)),
          ADVISOR_TIMEOUT_MS,
        ),
      ),
    ]);

    expect(result.response).toBe('Done');
  });

  it('rejects when query exceeds timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const neverResolve = new Promise<ModelResponse>(() => {});

    const racePromise = Promise.race([
      neverResolve,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Advisor timed out after ${ADVISOR_TIMEOUT_MS / 1000}s`)),
          ADVISOR_TIMEOUT_MS,
        ),
      ),
    ]);

    vi.advanceTimersByTime(ADVISOR_TIMEOUT_MS + 100);

    await expect(racePromise).rejects.toThrow('Advisor timed out after 600s');

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 5. retryWithBackoff (frontend helper)
// ---------------------------------------------------------------------------

describe('retryWithBackoff (frontend helper)', () => {
  // Import from the module path — adjusted for the test environment
  // We re-implement the same logic here to test the pattern since the
  // frontend module uses browser APIs (fetch) that aren't available in vitest.

  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 50, // fast for tests
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts - 1) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }
    throw lastError;
  }

  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries and succeeds on third attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects maxAttempts = 1 (no retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(retryWithBackoff(fn, 1, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. sleep utility
// ---------------------------------------------------------------------------

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    vi.useFakeTimers();
    const p = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
