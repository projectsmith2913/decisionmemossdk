/**
 * Google AI API Client for Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseModelClient } from './model-interface.js';
import { ModelResponse } from '../types.js';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../constants.js';

export class GoogleClient extends BaseModelClient {
  readonly name: string;
  readonly provider = 'google';
  private client: GoogleGenerativeAI;
  private model: string;
  private maxOutputTokens: number;

  constructor(
    apiKey: string,
    model: string = 'gemini-3-pro-preview',
    maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS
  ) {
    super(apiKey);
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.name = model;
    this.maxOutputTokens = maxOutputTokens;
  }

  async query(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.isConfigured()) {
      return this.createErrorResponse(new Error('Google API key not configured'));
    }

    const startTime = Date.now();

    try {
      const genModel = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: this.maxOutputTokens }
      });

      const result = await this.withRetry(() => genModel.generateContent(prompt));
      const response = result.response!;
      const text = response.text();

      const latency = Date.now() - startTime;

      return {
        modelName: this.name,
        provider: this.provider,
        response: text,
        timestamp: new Date(),
        tokensUsed: response.usageMetadata?.totalTokenCount,
        latency
      };
    } catch (error: any) {
      console.error(`Google AI query error:`, error.message);
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
