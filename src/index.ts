/**
 * decisionmemos — Query multiple AI models in parallel.
 *
 * Free SDK: Query GPT, Claude, Grok, and Gemini with one call.
 * Get typed responses from all models — no boilerplate.
 *
 * For structured verdicts with consensus scoring, advisor personas,
 * synthesis, and Decision Memos → use the hosted API at decisionmemos.com
 */

// ---------------------------------------------------------------------------
// Attribution — for "Powered by Decision Memos" in integrator UIs
// ---------------------------------------------------------------------------

/** Use this when showing "Powered by Decision Memos" in your product (optional). */
export const DECISION_MEMOS_ATTRIBUTION = {
  label: 'Powered by Decision Memos',
  url: 'https://decisionmemos.com',
} as const;

// ---------------------------------------------------------------------------
// Free SDK — Multi-model parallel querying
// ---------------------------------------------------------------------------

// Main entry point
export {
  MultiModelQuery,
  createMultiModelQuery,
} from './multi-model-query.js';

export type {
  MultiModelOptions,
  MultiModelResult,
} from './multi-model-query.js';

// Model clients (use individually or via MultiModelQuery)
export type { AIModelClient } from './clients/index.js';
export { BaseModelClient } from './clients/index.js';
export { OpenAIClient } from './clients/index.js';
export { XAIClient } from './clients/index.js';
export { AnthropicClient } from './clients/index.js';
export { GoogleClient } from './clients/index.js';

// Basic types (used by the free SDK)
export type {
  ModelConfig,
  ModelResponse,
} from './types.js';

// ---------------------------------------------------------------------------
// Hosted API types — useful for consuming API responses
//
// These types describe the output of the paid hosted API.
// The logic to *produce* these (synthesis, personas, briefing, prompt
// engineering) is not included in the free SDK.
// ---------------------------------------------------------------------------

export type {
  DecisionMemo,
  ConsensusLevel,
  BriefingQuestion,
  BriefingAnswers,
} from './types.js';
