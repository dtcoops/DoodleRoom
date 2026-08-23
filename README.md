# DoodleRoom

A real-time multiplayer drawing-and-guessing game. Players take turns 
sketching a secret word on a shared canvas while others race to guess it.

## Status

In progress — backend complete and fully tested, frontend in development.

## Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Express, TypeScript, Socket.IO
- **Testing:** Vitest (unit + real-socket integration tests)

## Backend Features (Complete)

- [x] Room creation/joining/leaving with host reassignment
- [x] Full game state machine (waiting → drawing → round-end → game-over)
- [x] Turn rotation with server-authoritative timers
- [x] Time-weighted scoring on correct guesses
- [x] Word secrecy — only the current drawer ever receives the word
- [x] Phase-aware drawing authorization (free doodling in the lobby, drawer-only during rounds)
- [x] Host controls: minimum player enforcement, return-to-lobby / play again

## Frontend Features (In Progress)

- [ ] Create/join lobby screen with free-for-all doodling
- [ ] Player and drawing segments color coded for lobby
- [ ] Live game screen (turn state, timer, scoreboard)
- [ ] Synced drawing canvas
- [ ] Guess input and live guess feed

## Future Extensions

Deliberately scoped out for now, with reasoning:

- **Reconnection handling** — a dropped connection currently can't rejoin an
  active game. Given these are short, casual sessions, players can simply
  return to the lobby rather than needing full session recovery.
- **Drawing gallery / replay** — the server doesn't currently persist strokes;
  I had debated a highlights reel on game completion to be shown with scores. This
  is not a core feature, is only a nice to have for someone who actually finishes
  a game, and would need meaningful changes for new server-side storage.
- **React Native client** — the game logic and canvas component are designed
  deliberately to be kept decoupled from socket/state code specifically to make a
  future mobile port (React Native + a native canvas library) straightforward.

## Running Locally

_Instructions coming soon._

## Why I'm Building This

A learning project to explore real-time systems (WebSockets, 
server-authoritative game state); a fullstack web project built 
around the specific challenge of online multiplayer game architecture: 
state machines, turn management, and real-time synchronization.

The backend includes full unit and integration test coverage throughout — 
rooms, game state, scoring, and drawing are all tested at both the logic 
and real-socket level. I did this deliberately since disciplined testing 
is a skill I wanted to actually practice and demonstrate, not just claim.


## attribution

working logo
https://www.svgrepo.com/svg/166383/edit-hand-drawn-interface-symbol