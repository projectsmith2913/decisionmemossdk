/**
 * OpenAI API Client for ChatGPT
 */

import OpenAI from 'openai';
import { BaseModelClient } from './model-interface.js';
import { ModelResponse } from '../types.js';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../constants.js';

export class OpenAIClient extends BaseModelClient {
  readonly name: string;
  readonly provider = 'openai';
  private client: OpenAI;
  private model: string;
  private maxOutputTokens: number;

  constructor(
    apiKey: string,
    model: string = 'gpt-5.2',
    maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS
  ) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.name = model;
    this.maxOutputTokens = maxOutputTokens;
  }

  async query(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.isConfigured()) {
      return this.createErrorResponse(new Error('OpenAI API key not configured'));
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
          max_completion_tokens: this.maxOutputTokens,
        }),
      );

      const latency = Date.now() - startTime;
      
      // Extract response - handle both standard and reasoning model formats
      const choice = completion.choices[0];
      let responseText = choice?.message?.content || '';
      
      // If response is empty but tokens were used, check alternative content locations
      if (!responseText && completion.usage?.total_tokens && completion.usage.total_tokens > 0) {
        console.warn(`Warning: GPT response empty despite ${completion.usage.total_tokens} tokens used.`);
        const msg = choice?.message as any;
        if (msg?.reasoning_content) {
          responseText = msg.reasoning_content;
        } else if (msg?.refusal) {
          responseText = `[Refusal] ${msg.refusal}`;
        }
      }

      return {
        modelName: this.name,
        provider: this.provider,
        response: responseText,
        timestamp: new Date(),
        tokensUsed: completion.usage?.total_tokens,
        latency
      };
    } catch (error: any) {
      console.error(`OpenAI query error:`, error.message);
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
