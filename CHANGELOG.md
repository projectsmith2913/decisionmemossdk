# Changelog

All notable changes to Decision Memos will be documented in this file.

## [1.1.1] — 2026-02-26

### Package
- Updated package metadata: `bugs`, `funding`, and `repository` now point to the public SDK repo
- Added `DECISION_MEMOS_ATTRIBUTION` export — use `{ label, url }` to show "Powered by Decision Memos" in your UI
- Cleaned up public README — removed internal sections, added npm/license badges

---

## [1.1.0] — 2026-02-13

### SDK Monetisation Split
- **Free SDK**: New `MultiModelQuery` class and `createMultiModelQuery()` factory — query 4 models in parallel with typed responses, zero boilerplate
- **Paid API**: Synthesis, personas, briefing, consensus scoring, and Decision Memos are now exclusive to the hosted API
- Restructured public exports: free SDK ships only `MultiModelQuery`, model clients, and basic types
- Engine internals (`DecisionEngine`, `Synthesizer`, `BriefingGenerator`, personas) excluded from npm package

### Pricing Changes
- **Pro**: 40 memos/month (doubled from 20)
- **Team**: 200 memos/month (doubled from 100)
- **BYOK discount**: 20% off per provider key supplied (up to 80% with all 4 keys)

### Documentation
- Docs sidebar reorganised into Free SDK / Paid API / Guides sections
- New SDK reference documents `MultiModelQuery` API
- BYOK guide updated with discount tiers and cost comparison
- Quickstart rewritten for free SDK entry point with paid API upgrade path
- For Developers section now shows both free and paid code snippets

---

## [1.0.0] — 2026-02-13

### Core SDK
- Multi-model parallel query engine (OpenAI, Anthropic, xAI, Google)
- Persona layer — advisor archetypes (Strategist, Analyst, Challenger, Architect)
- Transparent mode toggle — show real model names when needed
- Decision Memo schema — structured JSON output with typed interfaces
- Dynamic briefing generator — AI-powered contextual follow-up questions
- Consensus scoring — strong, moderate, weak agreement levels
- Custom persona support — override default archetypes

### Hosted API
- `POST /v1/deliberate` — Run panel deliberations via REST
- `POST /v1/briefing` — Generate dynamic follow-up questions
- `GET /v1/status` — Provider availability and usage stats
- `GET /health` — Public health check
- SSE streaming — real-time deliberation events (advisor.thinking, advisor.snippet, advisor.complete, synthesis.started, deliberation.complete)
- Bearer token authentication (dm_live_ / dm_test_ keys)
- Rate limiting — sliding window, per-plan limits
- Quota enforcement — monthly memo caps
- BYOK support — bring your own provider API keys per-request

### Web
- Landing page — hero, artifact showcase, how-it-works, advisor panel, developer section, pricing
- Documentation site — 14 pages covering SDK, API, guides
- Example gallery — real memo showcases
- SaaS application:
  - Guided memo flow (question → briefing → live deliberation → memo)
  - Decision library with search
  - Memo viewer with tabbed interface (verdict, perspectives, consensus, risks, next steps)
  - Settings — plan management, API keys, BYOK configuration, transparent mode
  - Share and PDF export actions

### CLI
- `npm run consultation` — Run memos from markdown files
- JSON output with full comparison matrix
