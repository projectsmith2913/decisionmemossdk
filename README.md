# Decision Memos

[![npm version](https://img.shields.io/npm/v/decisionmemos.svg)](https://www.npmjs.com/package/decisionmemos) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![Powered by Decision Memos](https://img.shields.io/badge/Powered%20by-Decision%20Memos-3B82F6?labelColor=423D55)](https://decisionmemos.com)

**Four advisors. One structured verdict.**

Part of [Decision Memos](https://decisionmemos.com) — make better decisions when it matters. Use the free SDK below, or get structured verdicts and consensus via the [hosted API](https://decisionmemos.com/docs).

Decision Memos has two tiers:

1. **Free SDK** — Query GPT, Claude, Grok, and Gemini in parallel with one function call. Typed responses, zero boilerplate.
2. **Paid API** — Adds persona-tuned prompts, synthesis with consensus scoring, dynamic briefing, and structured Decision Memos.

## Free SDK — Quick Start

```bash
npm install decisionmemos
```

```typescript
import { createMultiModelQuery } from 'decisionmemos';

const query = createMultiModelQuery();

const result = await query.ask(
  'Should we migrate to microservices or adopt a modular monolith?'
);

for (const r of result.responses) {
  console.log(`[${r.modelName}] ${r.response.slice(0, 200)}`);
}
// → 4 typed responses from 4 models, in parallel
```

### API Keys

You need keys for the AI providers you want to use. The SDK works with any subset — missing providers are gracefully excluded.

| Provider | Env Variable |
|----------|-------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| xAI | `XAI_API_KEY` |
| Google AI | `GOOGLE_API_KEY` |

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
GOOGLE_API_KEY=AIza...
```

## Paid API — Structured Verdicts

The hosted API adds the orchestration layer that turns four raw responses into one structured verdict:

| Feature | Free SDK | Paid API |
|---------|----------|----------|
| Parallel multi-model queries | Yes | Yes |
| Typed model responses | Yes | Yes |
| Advisor personas | - | Yes |
| Persona-tuned system prompts | - | Yes |
| Dynamic briefing (context intake) | - | Yes |
| Synthesis with consensus scoring | - | Yes |
| Structured Decision Memo | - | Yes |
| SSE streaming deliberation | - | Yes |
| BYOK discount (20% per key) | - | Yes |

```bash
curl -X POST https://api.decisionmemos.com/v1/deliberate \
  -H "Authorization: Bearer dm_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Should we migrate to microservices?",
    "criteria": [
      { "name": "Team readiness" },
      { "name": "Timeline" }
    ],
    "byok": {
      "openai": "sk-..."
    }
  }'
```

### BYOK Discount

Supply your own provider API keys and save:
- 1 key → 20% off
- 2 keys → 40% off
- 3 keys → 60% off
- 4 keys → 80% off

### Plans

| Plan | Memos |
|------|-------|
| Starter ($14/mo) | 5/month |
| Pro ($29/mo) | 40/month |
| Team ($99/mo) | 200/month |
| Enterprise | Unlimited |

## The Decision Memo

Every paid memo produces a structured artifact:

- **Verdict** — Synthesised recommendation with consensus scoring (strong / moderate / weak)
- **Perspectives** — Each advisor's individual analysis
- **Consensus map** — Where the panel agreed and diverged
- **Risks** — Identified risks with mitigations
- **Trade-offs** — Key tensions the decision involves
- **Next steps** — Prioritised implementation actions

### Advisors

| Advisor | Role | Strength |
|---------|------|----------|
| **The Strategist** | Big-picture thinking | Balanced, diplomatic, sees all angles |
| **The Analyst** | Risk & nuance | Identifies second-order consequences |
| **The Challenger** | Breaking groupthink | Challenges premises, calls out weak logic |
| **The Architect** | Structure & implementation | Turns ideas into frameworks with evidence |

## SDK Structure

```
src/
  index.ts              # Public exports
  multi-model-query.ts  # MultiModelQuery class
  types.ts              # TypeScript interfaces
  constants.ts          # Shared constants
  clients/              # AI provider clients
    openai-client.ts
    anthropic-client.ts
    xai-client.ts       # Grok
    google-client.ts    # Gemini
    model-interface.ts  # BaseModelClient + retry logic
    index.ts
```

## Documentation

Full documentation at [decisionmemos.com/docs](https://decisionmemos.com/docs):

- [Quickstart](https://decisionmemos.com/docs/quickstart)
- [SDK Reference](https://decisionmemos.com/docs/sdk)
- [API Reference](https://decisionmemos.com/docs/api/deliberate)
- [BYOK & Pricing](https://decisionmemos.com/docs/guides/byok)
- [Streaming Guide](https://decisionmemos.com/docs/guides/streaming)
- [Concepts](https://decisionmemos.com/docs/concepts)

## Attribution

If you ship the free SDK in your product, we'd appreciate a link: [Powered by Decision Memos](https://decisionmemos.com). You can use the exported `DECISION_MEMOS_ATTRIBUTION` constant for a consistent label and URL:

```typescript
import { DECISION_MEMOS_ATTRIBUTION } from 'decisionmemos';

// { label: 'Powered by Decision Memos', url: 'https://decisionmemos.com' }
```

## License

MIT — see [LICENSE](LICENSE) for details.
