
// excluded: O (looks like 0), I/L (look like 1), 0, 1 themselves
const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MIN_LENGTH = 4;
export const MAX_LENGTH = 6;

export function generateRoomCode({codeLength = 5}: {codeLength?: number } = {})  {

    if (codeLength < MIN_LENGTH || codeLength > MAX_LENGTH) {
        throw new Error(`codeLength must be between ${MIN_LENGTH} and ${MAX_LENGTH}`);
    }

    let code: string[] = [];

    for (let i = 0; i < codeLength; i++) {
        let randomIndex = Math.floor(Math.random() * VALID_CHARS.length) 
        code.push(VALID_CHARS[randomIndex]);
    }

    return code.join('');
}