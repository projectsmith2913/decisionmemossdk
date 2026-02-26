/**
 * xAI API Client for Grok
 */

import OpenAI from 'openai';
import { BaseModelClient } from './model-interface.js';
import { ModelResponse } from '../types.js';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../constants.js';

export class XAIClient extends BaseModelClient {
  readonly name: string;
  readonly provider = 'xai';
  private client: OpenAI;
  private model: string;
  private maxOutputTokens: number;

  constructor(
    apiKey: string,
    model: string = 'grok-4-1-fast-reasoning',
    maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS
  ) {
    super(apiKey);
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1'
    });
    this.model = model;
    this.name = model;
    this.maxOutputTokens = maxOutputTokens;
  }

  async query(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.isConfigured()) {
      return this.createErrorResponse(new Error('xAI API key not configured'));
    }

    const startTime = Date.now();

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const completion = await this.withRetry(() =>
        this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: this.maxOutputTokens,
        }),
      );

      const latency = Date.now() - startTime;

      return {
        modelName: this.name,
        provider: this.provider,
        response: completion.choices[0]?.message?.content || '',
        timestamp: new Date(),
        tokensUsed: completion.usage?.total_tokens,
        latency
      };
    } catch (error: any) {
      console.error(`xAI query error:`, error.message);
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
