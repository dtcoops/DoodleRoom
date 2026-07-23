import { describe, it, expect } from 'vitest';
import { generateRandomWord } from './wordGenerator';

//TODO:
// Test will need a rewrite when generateRandomWord excludes words
// Will be worth importin the actual wordbank at that point in time
describe('generateRandomWord', () => {
  it('Generate a Random word from the word bank', () => {
    const WORD_BANK = ['boat', 'car', 'airplane', 'house']

    const word = generateRandomWord();

    expect(WORD_BANK).toContain(word);
  });
});