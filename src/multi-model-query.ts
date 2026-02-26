/**
 * MultiModelQuery — The free, open-source entry point.
 *
 * Query multiple AI models in parallel and get typed responses back.
 * This is the convenience layer: one call, four models, typed results.
 *
 * For structured verdicts with consensus scoring, synthesis, and
 * Decision Memos, use the hosted API at decisionmemos.com
 */

import { ModelResponse } from './types.js';
import { AIModelClient } from './clients/model-interface.js';
import { OpenAIClient } from './clients/openai-client.js';
import { XAIClient } from './clients/xai-client.js';
import { AnthropicClient } from './clients/anthropic-client.js';
import { GoogleClient } from './clients/google-client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiModelOptions {
  /** Override which model clients to use. Auto-detects from env vars if not provided. */
  clients?: AIModelClient[];

  /** Custom keys (alternative to env vars) */
  keys?: {
    openai?: string;
    anthropic?: string;
    xai?: string;
    google?: string;
  };
}

export interface MultiModelResult {
  /** The original question */
  question: string;

  /** Individual model responses (one per configured model) */
  responses: ModelResponse[];

  /** How many models responded successfully */
  successCount: number;

  /** How many models failed or were unavailable */
  errorCount: number;

  /** Total wall-clock time for the parallel query (ms) */
  totalLatency: number;

  /** Timestamp of the query */
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// MultiModelQuery
// ---------------------------------------------------------------------------

export class MultiModelQuery {
  private clients: AIModelClient[];

  constructor(options: MultiModelOptions = {}) {
    if (options.clients) {
      this.clients = options.clients.filter((c) => c.isConfigured());
    } else {
      const keys = options.keys || {};
      this.clients = [
        new OpenAIClient(
          keys.openai || process.env.OPENAI_API_KEY || '',
          process.env.OPENAI_MODEL || 'gpt-5.2',
        ),
        new XAIClient(
          keys.xai || process.env.XAI_API_KEY || '',
          process.env.XAI_MODEL || 'grok-4-1-fast-reasoning',
        ),
        new AnthropicClient(
          keys.anthropic || process.env.ANTHROPIC_API_KEY || '',
          process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        ),
        new GoogleClient(
          keys.google || process.env.GOOGLE_API_KEY || '',
          process.env.GOOGLE_MODEL || 'gemini-3-pro-preview',
        ),
      ].filter((c) => c.isConfigured());
    }
  }

  /**
   * Query all configured models in parallel with the same question.
   *
   * @param question - The question or prompt to send to all models
   * @param systemPrompt - Optional system-level instructions sent to every model
   * @returns Typed results from all models
   *
   * @example
   * ```ts
   * const query = createMultiModelQuery();
   * const result = await query.ask("Should we use GraphQL or REST?");
   *
   * for (const r of result.responses) {
   *   console.log(`${r.modelName}: ${r.response.slice(0, 100)}...`);
   * }
   * ```
   */
  async ask(question: string, systemPrompt?: string): Promise<MultiModelResult> {
    const start = Date.now();

    const responses = await Promise.all(
      this.clients.map((client) =>
        client.query(question, systemPrompt).catch(
          (err): ModelResponse => ({
            modelName: client.name,
            provider: client.provider,
            response: '',
            timestamp: new Date(),
            latency: 0,
            error: err.message || 'Unknown error',
          }),
        ),
      ),
    );

    const totalLatency = Date.now() - start;
    const successCount = responses.filter((r) => !r.error).length;

    return {
      question,
      responses,
      successCount,
      errorCount: responses.length - successCount,
      totalLatency,
      timestamp: new Date(),
    };
  }

  /**
   * Test connectivity to all configured models.
   */
  async testConnections(): Promise<{ model: string; provider: string; ok: boolean }[]> {
    const results = await Promise.all(
      this.clients.map(async (client) => {
        try {
          const ok = await client.testConnection();
          return { model: client.name, provider: client.provider, ok };
        } catch {
          return { model: client.name, provider: client.provider, ok: false };
        }
      }),
    );
    return results;
  }

  /**
   * Get the number and names of configured models.
   */
  getStatus(): { count: number; models: { name: string; provider: string }[] } {
    return {
      count: this.clients.length,
      models: this.clients.map((c) => ({ name: c.name, provider: c.provider })),
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a MultiModelQuery instance. Reads API keys from env vars by default.
 *
 * This is the free SDK entry point — query 4 models in parallel, get typed responses.
 * For structured verdicts, consensus scoring, and Decision Memos, use the hosted API.
 *
 * @example
 * ```ts
 * import { createMultiModelQuery } from 'decisionmemos';
 *
 * const query = createMultiModelQuery();
 * const result = await query.ask("Should we use Kubernetes?");
 *
 * console.log(`${result.successCount} models responded`);
 * for (const r of result.responses) {
 *   console.log(`[${r.modelName}] ${r.response.slice(0, 100)}...`);
 * }
 * ```
 */
export function createMultiModelQuery(options: MultiModelOptions = {}): MultiModelQuery {
  return new MultiModelQuery(options);
}
