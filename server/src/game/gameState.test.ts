import { describe, it, expect } from 'vitest';
import { generateGameState } from './gameState';

describe('generateGameState', () => {
  it('creates an initial WAITING state with the given totalRounds', () => {
    const state = generateGameState(3);

    expect(state).toEqual({
      phase: 'WAITING',
      drawerId: null,
      roundNumber: 0,
      totalRounds: 3,
      currentWord: null,
      roundEndsAt: null,
      turnOrder: []
    });
  });
});