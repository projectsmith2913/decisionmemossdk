/**
 * Unified interface for all AI model clients
 */

import { ModelResponse } from '../types.js';

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

/** HTTP status codes that indicate a transient, retryable failure */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

/** Error message substrings that indicate a transient failure */
const RETRYABLE_PATTERNS = [
  'econnrefused', 'econnreset', 'etimedout', 'enotfound',
  'timeout', 'rate limit', 'rate_limit', 'overloaded',
  'capacity', 'network', 'socket hang up', 'fetch failed',
  'service unavailable', 'internal server error',
];

/** Default number of retries for transient API errors */
const DEFAULT_MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AIModelClient {
  /**
   * Name of the model (e.g., "GPT-5.2", "Claude Opus 4.6", "Grok 4.1", "Gemini 3 Pro")
   */
  readonly name: string;

  /**
   * Provider identifier
   */
  readonly provider: string;

  /**
   * Whether the client is properly configured and ready to use
   */
  isConfigured(): boolean;

  /**
   * Query the model with a prompt and system context
   * @param prompt The user prompt/question
   * @param systemPrompt Optional system-level instructions
   * @returns ModelResponse with the completion and metadata
   */
  query(prompt: string, systemPrompt?: string): Promise<ModelResponse>;

  /**
   * Test the connection and configuration
   */
  testConnection(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Base class with built-in retry
// ---------------------------------------------------------------------------

export abstract class BaseModelClient implements AIModelClient {
  abstract readonly name: string;
  abstract readonly provider: string;
  protected apiKey: string;

  /** Maximum retries for transient API errors (0 = no retry) */
  protected maxRetries: number = DEFAULT_MAX_RETRIES;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_api_key_here';
  }

  abstract query(prompt: string, systemPrompt?: string): Promise<ModelResponse>;
  abstract testConnection(): Promise<boolean>;

  /**
   * Retry wrapper for transient API errors.
   * Retries up to `maxRetries` times with exponential backoff (1s, 2s, 4s…)
   * only when the thrown error is classified as transient (network issues,
   * rate limits, server errors).
   *
   * The `() => T` signature (rather than `() => Promise<T>`) ensures that
   * when SDK module types are unavailable and the callback returns `any`,
   * the result correctly resolves to `any` via `Awaited<any>` instead of
   * falling back to `unknown`.
   */
  protected async withRetry<T>(fn: () => T): Promise<Awaited<T>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn() as Awaited<T>;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries && isRetryableError(err)) {
          const delay = retryDelay(attempt, err);
          console.warn(
            `[${this.name}] Attempt ${attempt + 1}/${this.maxRetries + 1} failed` +
            ` (${err instanceof Error ? err.message : err}), retrying in ${delay}ms…`,
          );
          await sleep(delay);
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  }

  protected createErrorResponse(error: unknown): ModelResponse {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error occurred';
    return {
      modelName: this.name,
      provider: this.provider,
      response: '',
      timestamp: new Date(),
      latency: 0,
      error: message
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Determine whether an error is transient and worth retrying. */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // HTTP status from SDK errors (OpenAI, Anthropic, etc.)
  const status = (error as any)?.status ?? (error as any)?.statusCode;
  if (typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status)) return true;

  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return RETRYABLE_PATTERNS.some((p) => msg.includes(p));
}

/** Calculate the backoff delay for a given retry attempt. */
export function retryDelay(attempt: number, error?: unknown): number {
  // Honour Retry-After from rate-limit responses (in seconds)
  const retryAfter = (error as any)?.headers?.['retry-after'];
  if (retryAfter) {
    const secs = parseInt(retryAfter, 10);
    if (!isNaN(secs) && secs > 0 && secs <= 60) return secs * 1000;
  }
  // Exponential backoff: 1s, 2s, 4s… capped at 10s
  return Math.min(1000 * Math.pow(2, attempt), 10_000);
}

/** Promisified sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
