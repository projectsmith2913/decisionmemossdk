/**
 * Tests for ConsensusAnalysis serialization: plain objects round-trip through JSON.
 */
import { describe, it, expect } from 'vitest';
import type { ConsensusAnalysis } from '../src/types.js';

describe('ConsensusAnalysis serialization', () => {
  it('divergences.positions and uniqueInsights survive JSON.stringify/parse', () => {
    const consensus: ConsensusAnalysis = {
      agreements: ['All agree on X', 'All agree on Y'],
      divergences: [
        {
          aspect: 'Architecture',
          positions: {
            'Advisor A': 'Monolith first',
            'Advisor B': 'Microservices from day one',
          },
        },
      ],
      uniqueInsights: {
        'Advisor A': ['Use event sourcing'],
        'Advisor B': ['Consider CQRS'],
      },
    };

    const json = JSON.stringify(consensus);
    const parsed = JSON.parse(json) as ConsensusAnalysis;

    expect(parsed.agreements).toEqual(consensus.agreements);
    expect(parsed.divergences).toHaveLength(1);
    expect(parsed.divergences[0].aspect).toBe('Architecture');
    expect(parsed.divergences[0].positions).toEqual(consensus.divergences[0].positions);
    expect(parsed.divergences[0].positions['Advisor A']).toBe('Monolith first');
    expect(parsed.divergences[0].positions['Advisor B']).toBe('Microservices from day one');
    expect(parsed.uniqueInsights).toEqual(consensus.uniqueInsights);
    expect(parsed.uniqueInsights['Advisor A']).toEqual(['Use event sourcing']);
    expect(parsed.uniqueInsights['Advisor B']).toEqual(['Consider CQRS']);
  });

  it('empty positions and uniqueInsights serialize as {} and {}', () => {
    const consensus: ConsensusAnalysis = {
      agreements: [],
      divergences: [{ aspect: 'None', positions: {} }],
      uniqueInsights: {},
    };
    const json = JSON.stringify(consensus);
    const parsed = JSON.parse(json) as ConsensusAnalysis;
    expect(parsed.divergences[0].positions).toEqual({});
    expect(parsed.uniqueInsights).toEqual({});
  });
});
