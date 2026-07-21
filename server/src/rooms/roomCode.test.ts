import { describe, it, expect } from 'vitest';
import { generateRoomCode, MIN_LENGTH, MAX_LENGTH } from './roomCode';

describe('room code', () => {

    it('Sanity - generates a code of a custom length', () => {
        const customLength = MAX_LENGTH;
        const code = generateRoomCode({ codeLength: customLength });
        expect(code.length).toBe(customLength);
    });

    it("code matches pattern", () => {
        let code = generateRoomCode();
        
        expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    });

    it('never includes visually ambiguous characters', () => {
        for (let i = 0; i < 50; i++) {
            const code = generateRoomCode({ codeLength: MAX_LENGTH });
            expect(code).not.toMatch(/[0O1I]/);
        }
    });

    it('generates different codes on repeated calls', () => {
        const code1 = generateRoomCode();
        const code2 = generateRoomCode();
        expect(code1).not.toBe(code2);
    });

    it('throws when codeLength is below the minimum', () => {
        expect(() => generateRoomCode({ codeLength: MIN_LENGTH - 1 })).toThrow();
    });

    it('accepts the minimum boundary length', () => {
        expect(() => generateRoomCode({ codeLength: MIN_LENGTH })).not.toThrow();
    });

    it('throws when codeLength is above the maximum', () => {
        expect(() => generateRoomCode({ codeLength: MAX_LENGTH + 1 })).toThrow();
    });

    it('accepts the maximum boundary length', () => {
        expect(() => generateRoomCode({ codeLength: MAX_LENGTH })).not.toThrow();
    });
});