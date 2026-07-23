
const WORD_BANK = ['boat', 'car', 'airplane', 'house']

// TODO:
// Ensure that no duplicates occur
//  - Pass a parameter of excluded items
//  - excluded items is tracked in GameState
// Bigger wordbank...
//  - make it a dict for difficulties?
//  - Store it elsewhere
export function generateRandomWord() {
    let index = Math.floor(Math.random() * WORD_BANK.length);
    return WORD_BANK[index];
}