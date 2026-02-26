/**
 * Anthropic API Client for Claude
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseModelClient } from './model-interface.js';
import { ModelResponse } from '../types.js';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../constants.js';

export class AnthropicClient extends BaseModelClient {
  readonly name: string;
  readonly provider = 'anthropic';
  private client: Anthropic;
  private model: string;
  private maxOutputTokens: number;

  constructor(
    apiKey: string,
    model: string = 'claude-sonnet-4-6',
    maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS
  ) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.name = model;
    this.maxOutputTokens = maxOutputTokens;
  }

  async query(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.isConfigured()) {
      return this.createErrorResponse(new Error('Anthropic API key not configured'));
    }

    const startTime = Date.now();

    try {
      const message = await this.withRetry(() =>
        this.client.messages.create({
          model: this.model,
          max_tokens: this.maxOutputTokens,
          temperature: 0.7,
          system: systemPrompt || undefined,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      );

      const latency = Date.now() - startTime;

      const responseText = message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => (block as { text: string }).text)
        .join('\n');

      return {
        modelName: this.name,
        provider: this.provider,
        response: responseText,
        timestamp: new Date(),
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
        latency
      };
    } catch (error: any) {
      console.error(`Anthropic query error:`, error.message);
      return this.createErrorResponse(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.query('Test connection. Respond with: OK');
      return !response.error && response.response.includes('OK');
    } catch {
      return false;
    }
  }
}
