TODO:
This is something for us to think about and move towards in the near future.


because your game loop is already automated — the player never controls the on-court action directly. The only meaningful player interaction is the level-up pick. Everything else is just watching a simulation play out.

Key insight
The game is already a deterministic script with one pause point. The server should own the script; the client just animates it.

How it splits
Server computes (outcome layer):

Shot accuracy rolls
Rebound winner
Pass targets
XP accumulation + level-up triggers
Quarter clock + scoring
Ability stat application after a pick
Client animates (presentation layer):

All requestAnimationFrame movement
Sprite switching, ball arcs
HUD, overlays, sound
The client becomes a dumb event queue player — it receives a sequence of events from the server, plays each one visually, then acks back to advance the simulation.

Message protocol

Server → Client
{ type: 'POSSESSION_START', possTeam: 'home' }
{ type: 'PASS', from: 1, to: 3 }
{ type: 'SHOT_RESULT', shooter: 3, result: 'make', pts: 2 }
{ type: 'REBOUND', player: 7, team: 'away' }
{ type: 'THROW_IN', team: 'away' }
{ type: 'XP_GRANT', role: 'PG', amount: 18, newTotal: 95 }
{ type: 'LEVEL_UP', role: 'PG', abilities: [...3 choices...] }  ← blocks here
{ type: 'QUARTER_END', quarter: 2 }

Client → Server
{ type: 'GAME_START', homeRoster: [...] }
{ type: 'POSSESSION_ACK' }           ← "finished animating, give me next"
{ type: 'LEVEL_UP_PICK', role: 'PG', abilityId: 'hot_hand' }
The server sends one possession batch at a time (all events from throw-in to next score/turnover). Client plays them out, sends POSSESSION_ACK, server computes the next batch.

Why possession-batched vs. tick-by-tick
Devvit's server isn't a persistent process — it's invoked per message, like a Cloudflare Worker. You can't run setInterval server-side. Batching a full possession (typically 3–6 events) per round-trip maps cleanly to that model and keeps Redis reads/writes minimal.

Redis state shape

game:{postId}:state → {
  homeScore, awayScore,
  quarter, clock,
  possession,
  players: [{ id, role, team, xp, level, abilities[], stats }]
}
game:{postId}:jumpBallWinner → 'home' | 'away'
user:{userId}:career → { wins, losses, totalXp }
leaderboard → sorted set
The client never writes scores — only reads them back for display.

What changes in your codebase
File	Change
useGame.js	Strip out all random rolls + scoring math. Replace loopHomeRef/loopAwayRef with an event queue consumer that plays server events in order
src/server/index.js	New file — port the outcome logic (shot roll, rebound, XP) here. Responds to GAME_START + POSSESSION_ACK + LEVEL_UP_PICK
useGame.js	Level-up overlay still renders client-side, but onPickLevelUp now sends LEVEL_UP_PICK to server instead of applying the stat locally
The animation code in useGame.js (all the smoothMoveTo, triggerShoot, triggerDunk etc.) stays mostly intact — it just gets driven by the incoming event queue instead of the self-calling refs.

Rough migration path
Build src/server/index.js with a computePossession(gameState) function that returns an array of events + the new game state
Store game state in Redis keyed to the Reddit post ID
Replace loopHomeRef.current() in testGamePlay with postMessage({ type: 'GAME_START' })
Add an event queue to useGame.js — each animation's onComplete callback pops the next event
When the queue empties, send POSSESSION_ACK and wait for the next batch
Level-up is just an event that doesn't auto-advance — waits for the player's pick
Want me to scaffold the server file and the event queue structure in useGame.js?