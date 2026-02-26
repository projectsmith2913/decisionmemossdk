/**
 * Core types for the multi-model decision framework
 */

// ---------------------------------------------------------------------------
// Model & Provider Config
// ---------------------------------------------------------------------------

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'xai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Context & Criteria
// ---------------------------------------------------------------------------

export interface DecisionContext {
  projectBrief: string;
  constraints: string;
  examples: string;
  specificContext?: string;
  /** Compiled context from the dynamic briefing intake */
  briefingContext?: string;
}

export interface DecisionCriteria {
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface DecisionQuery {
  question: string;
  context: DecisionContext;
  criteria: DecisionCriteria[];
  category?: string;
  /** Optional localisation hints derived from the request (OS, locale, timezone). */
  hiddenContext?: HiddenPromptContext;
}

// ---------------------------------------------------------------------------
// Model Response
// ---------------------------------------------------------------------------

export interface ModelResponse {
  modelName: string;
  provider: string;
  response: string;
  timestamp: Date;
  tokensUsed?: number;
  latency: number;
  error?: string;
  /** Persona title (e.g. "The Strategist") — set by the aggregator */
  persona?: string;
}

// ---------------------------------------------------------------------------
// Consensus Analysis
// ---------------------------------------------------------------------------

export interface ConsensusAnalysis {
  agreements: string[];
  divergences: {
    aspect: string;
    positions: Record<string, string>;
  }[];
  uniqueInsights: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export type ConsensusLevel = 'strong' | 'moderate' | 'weak';

export interface DecisionRecommendation {
  decision: string;
  rationale: string;
  consensusLevel: ConsensusLevel;
  tradeoffs: string[];
  implementation: string[];
  risks: string[];
}

// ---------------------------------------------------------------------------
// Comparison Matrix (internal)
// ---------------------------------------------------------------------------

export interface ComparisonMatrix {
  query: DecisionQuery;
  responses: ModelResponse[];
  consensus: ConsensusAnalysis;
  recommendation: DecisionRecommendation;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Decision Memo (public artifact — the product's core deliverable)
// ---------------------------------------------------------------------------

export interface DecisionMemo {
  /** Short title derived from the question */
  title: string;
  /** The original question asked */
  question: string;
  /** The panel's synthesised verdict */
  verdict: {
    decision: string;
    rationale: string;
    consensusLevel: ConsensusLevel;
    /** Human-readable consensus string, e.g. "The panel is united." */
    consensusDisplay: string;
  };
  /** Individual advisor perspectives, labelled by archetype title */
  perspectives: {
    advisor: string;
    /** e.g. "strategist", "analyst", "challenger", "architect" */
    advisorId: string;
    response: string;
    latency: number;
    tokensUsed?: number;
  }[];
  /** Points all advisors agree on */
  agreements: string[];
  /** Areas where advisors disagree */
  divergences: {
    aspect: string;
    positions: { [advisor: string]: string };
  }[];
  /** Identified trade-offs */
  tradeoffs: string[];
  /** Identified risks and mitigations */
  risks: string[];
  /** Concrete next steps */
  implementationSteps: string[];
  /** Metadata for transparency and cost tracking */
  metadata: {
    timestamp: string;
    totalLatency: number;
    advisorLatencies: { advisor: string; latency: number }[];
    modelsUsed: { advisor: string; provider: string; model: string }[];
    estimatedCost?: number;
    mode: 'standard' | 'deep';
  };
}

// ---------------------------------------------------------------------------
// Hidden prompt context (request-derived, not shown to end user)
// Used only by the prompt reengineering pipeline to tailor the brief.
// ---------------------------------------------------------------------------

export interface HiddenPromptContext {
  /** Client IP (consider redacting or omitting in logs; useful for regional tailoring) */
  clientIp?: string;
  /** Inferred OS from User-Agent (e.g. Windows, macOS, Linux, iOS, Android) */
  inferredOs?: string;
  /** Inferred browser from User-Agent (e.g. Chrome, Safari, Firefox) */
  inferredBrowser?: string;
  /** Raw Accept-Language header (e.g. "en-US,en;q=0.9") */
  acceptLanguage?: string;
  /** Primary locale hint (e.g. "en-US") derived from Accept-Language */
  inferredLocale?: string;
  /** Client-reported timezone (e.g. "America/New_York") if sent via header or body */
  timezone?: string;
  /** Referer URL if present (can indicate in-app vs external) */
  referer?: string;
  /** Request ID for tracing (already in use elsewhere) */
  requestId?: string;

  /** ISO 3166-1 alpha-2 country code from IP geolocation (e.g. "AU") */
  geoCountry?: string;
  /** Full country name resolved from geoCountry (e.g. "Australia") */
  geoCountryName?: string;
  /** Region / state from IP geolocation (e.g. "New South Wales") */
  geoRegion?: string;
  /** City from IP geolocation (e.g. "Sydney") */
  geoCity?: string;
  /** Timezone from IP geolocation (e.g. "Australia/Sydney") */
  geoTimezone?: string;
  /** Whether the IP is located in an EU member state */
  geoIsEU?: boolean;
}

// ---------------------------------------------------------------------------
// Decision Brief (prompt reengineering output)
// ---------------------------------------------------------------------------

export interface DecisionBrief {
  /** Structured situational context: what, who, domain, stakes */
  projectBrief: string;
  /** Extracted constraints: timeline, budget, team, risk, dependencies */
  constraints: string;
  /** Inferred decision framework: type, dimensions, success criteria */
  decisionFramework: string;
  /** The original question rewritten for maximum clarity (same intent, better structure) */
  reengineeredQuestion: string;
}

// ---------------------------------------------------------------------------
// Briefing (dynamic context intake)
// ---------------------------------------------------------------------------

export interface BriefingQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  allowMultiple: boolean;
}

export interface BriefingAnswers {
  [questionId: string]: string[];
}

// ---------------------------------------------------------------------------
// Decision Log (internal persistence)
// ---------------------------------------------------------------------------

export interface DecisionLog {
  id: string;
  category: string;
  query: DecisionQuery;
  matrix: ComparisonMatrix;
  memo?: DecisionMemo;
  finalDecision: string;
  decisionMaker: 'ai' | 'chairman';
  implementationStatus: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
