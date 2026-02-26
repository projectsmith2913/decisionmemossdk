import { describe, it, expect, vi } from 'vitest';
import { MultiModelQuery, createMultiModelQuery } from '../src/multi-model-query.js';
import type { AIModelClient } from '../src/clients/model-interface.js';
import type { ModelResponse } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(
  name: string,
  provider: string,
  response: string,
  configured = true,
): AIModelClient {
  return {
    name,
    provider,
    isConfigured: () => configured,
    query: vi.fn(async (): Promise<ModelResponse> => ({
      modelName: name,
      provider,
      response,
      timestamp: new Date(),
      latency: 50,
    })),
    testConnection: vi.fn(async () => true),
  };
}

function makeFailingClient(name: string, provider: string): AIModelClient {
  return {
    name,
    provider,
    isConfigured: () => true,
    query: vi.fn(async (): Promise<ModelResponse> => {
      throw new Error('API unavailable');
    }),
    testConnection: vi.fn(async () => false),
  };
}

// ---------------------------------------------------------------------------
// createMultiModelQuery
// ---------------------------------------------------------------------------

describe('createMultiModelQuery', () => {
  it('returns a MultiModelQuery instance', () => {
    const q = createMultiModelQuery({ clients: [] });
    expect(q).toBeInstanceOf(MultiModelQuery);
  });

  it('accepts custom clients via options', () => {
    const client = makeClient('TestModel', 'test', 'hello');
    const q = createMultiModelQuery({ clients: [client] });
    const status = q.getStatus();
    expect(status.count).toBe(1);
    expect(status.models[0].name).toBe('TestModel');
  });

  it('filters out unconfigured clients', () => {
    const configured = makeClient('Good', 'test', 'ok', true);
    const unconfigured = makeClient('Bad', 'test', 'nope', false);
    const q = createMultiModelQuery({ clients: [configured, unconfigured] });
    expect(q.getStatus().count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// MultiModelQuery — ask()
// ---------------------------------------------------------------------------

describe('MultiModelQuery.ask()', () => {
  it('returns responses from all configured clients', async () => {
    const clients = [
      makeClient('GPT', 'openai', 'Use REST'),
      makeClient('Claude', 'anthropic', 'Use GraphQL'),
    ];
    const q = new MultiModelQuery({ clients });
    const result = await q.ask('GraphQL vs REST?');

    expect(result.question).toBe('GraphQL vs REST?');
    expect(result.responses).toHaveLength(2);
    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(0);
    expect(result.totalLatency).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('queries models in parallel (all clients receive the same question)', async () => {
    const c1 = makeClient('A', 'test', 'answer A');
    const c2 = makeClient('B', 'test', 'answer B');
    const q = new MultiModelQuery({ clients: [c1, c2] });

    await q.ask('test question', 'system prompt');

    expect(c1.query).toHaveBeenCalledWith('test question', 'system prompt');
    expect(c2.query).toHaveBeenCalledWith('test question', 'system prompt');
  });

  it('returns a response with no error on success', async () => {
    const q = new MultiModelQuery({ clients: [makeClient('GPT', 'openai', 'response text')] });
    const result = await q.ask('question');

    const r = result.responses[0];
    expect(r.response).toBe('response text');
    expect(r.error).toBeUndefined();
    expect(r.modelName).toBe('GPT');
    expect(r.provider).toBe('openai');
  });

  it('catches individual client errors and reports them without throwing', async () => {
    const good = makeClient('Good', 'test', 'ok');
    const bad = makeFailingClient('Bad', 'test');
    const q = new MultiModelQuery({ clients: [good, bad] });

    const result = await q.ask('question');

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);

    const badResponse = result.responses.find((r) => r.modelName === 'Bad');
    expect(badResponse?.error).toBe('API unavailable');
    expect(badResponse?.response).toBe('');
  });

  it('returns an empty result when no clients are configured', async () => {
    const q = new MultiModelQuery({ clients: [] });
    const result = await q.ask('any question');

    expect(result.responses).toHaveLength(0);
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MultiModelQuery — getStatus()
// ---------------------------------------------------------------------------

describe('MultiModelQuery.getStatus()', () => {
  it('returns correct count and model list', () => {
    const q = new MultiModelQuery({
      clients: [
        makeClient('GPT-5.2', 'openai', ''),
        makeClient('Claude Sonnet', 'anthropic', ''),
        makeClient('Grok', 'xai', ''),
      ],
    });
    const status = q.getStatus();
    expect(status.count).toBe(3);
    expect(status.models).toEqual([
      { name: 'GPT-5.2', provider: 'openai' },
      { name: 'Claude Sonnet', provider: 'anthropic' },
      { name: 'Grok', provider: 'xai' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// MultiModelQuery — testConnections()
// ---------------------------------------------------------------------------

describe('MultiModelQuery.testConnections()', () => {
  it('returns ok: true for healthy clients', async () => {
    const q = new MultiModelQuery({ clients: [makeClient('GPT', 'openai', '')] });
    const results = await q.testConnections();
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ model: 'GPT', provider: 'openai', ok: true });
  });

  it('returns ok: false for clients whose testConnection throws', async () => {
    const q = new MultiModelQuery({ clients: [makeFailingClient('Bad', 'test')] });
    const results = await q.testConnections();
    expect(results[0].ok).toBe(false);
  });
});
