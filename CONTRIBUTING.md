# Contributing to Decision Memos SDK

Thanks for your interest in contributing. This is the free SDK layer — the open-source part of [Decision Memos](https://decisionmemos.com).

## What this repo covers

The free SDK: `MultiModelQuery`, model clients (OpenAI, Anthropic, xAI, Google), and the shared TypeScript types. The synthesis engine, advisor personas, and hosted API are not part of this repo.

## Reporting a bug

Open an issue using the **Bug report** template. Include:
- SDK version (`npm list decisionmemos`)
- Node version (`node -v`)
- Which provider(s) are affected
- Minimal reproduction

## Suggesting a feature

Open an issue using the **Feature request** template. Feature requests for the free SDK are welcome. Requests for the paid API (synthesis, consensus scoring, structured memos) belong at [decisionmemos.com/docs](https://decisionmemos.com/docs) — open a support ticket there.

## Submitting a pull request

1. Fork the repo and create a branch from `main`.
2. Run `npm install` and confirm `npm test` passes.
3. Make your change. Add or update tests for any new behaviour.
4. Run `npm run typecheck` and `npm test` — both must pass cleanly.
5. Open a PR with a clear description of what changed and why.

PRs that change public API surface (exports, types, function signatures) should note that in the description — they require extra review.

## Development setup

```bash
git clone https://github.com/projectsmith2913/decisionmemossdk.git
cd decisionmemossdk
npm install
npm test          # run tests
npm run typecheck # type check only
npm run build     # compile to dist/
```

## Docs

Full documentation: [decisionmemos.com/docs](https://decisionmemos.com/docs)  
SDK Reference: [decisionmemos.com/docs/sdk](https://decisionmemos.com/docs/sdk)

## Security

Do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).
