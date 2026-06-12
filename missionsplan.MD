# Missions — Backend + Lobby Wiring

## Context

The lobby's Daily / Weekly missions section ([src/components/LobbyScreen.jsx:289-337](src/components/LobbyScreen.jsx#L289)) renders against a hardcoded `MISSIONS` constant and shows "MISSIONS DISABLED CURRENTLY" — it's a visual mock with no persistence or rewards. We're turning it into a real loop: progress is tracked per user, daily missions reset at UTC midnight, weekly at UTC Monday 00:00, and **credits are auto-awarded** the instant a mission completes (no claim button). Trigger sources are the events the user already produces: finishing a game (`endGame`) and drafting a player (`draft.free` / `draft.credit`).

The mock's mission set stays as the v1 catalog (`win1`, `draft1`, `play3`, `wwin5`, `wdraft`, `wranked`). `wranked` has no trigger today (ranked is gated as "unavailable"); it stays in the catalog at 0 progress.

---

## Server

### New core module: `src/server/core/missions.ts`

1. **Static catalog** (single source of truth, exported to the client as-is via `missions.list`):
   ```ts
   export const MISSION_CATALOG = {
     daily: [
       { id: 'win1',   label: 'WIN A GAME',     sub: 'Complete any match',         reward: 50,  total: 1, accent: 'cyan' },
       { id: 'draft1', label: 'DRAFT A PLAYER', sub: 'Use a free or credit draft', reward: 25,  total: 1, accent: 'magenta' },
       { id: 'play3',  label: 'PLAY 3 GAMES',   sub: 'Any mode counts',            reward: 100, total: 3, accent: 'gold' },
     ],
     weekly: [
       { id: 'wwin5',   label: 'WIN 5 GAMES',     sub: 'Any mode',                reward: 300, total: 5, accent: 'cyan' },
       { id: 'wdraft',  label: 'DRAFT 3 PLAYERS', sub: 'Free or credit drafts',   reward: 150, total: 3, accent: 'magenta' },
       { id: 'wranked', label: 'PLAY RANKED',     sub: 'Complete a ranked match', reward: 200, total: 1, accent: 'gold' },
     ],
   } as const;
   ```

2. **Period keys (UTC midnight daily / UTC Monday weekly)**:
   ```ts
   const DAY_MS = 86400000;
   export const dailyPeriodKey = (now = Date.now()) =>
     Math.floor(now / DAY_MS);                                 // UTC day number from epoch
   export const weeklyPeriodKey = (now = Date.now()) =>
     Math.floor((now - 4 * DAY_MS) / (7 * DAY_MS));            // epoch was Thu; -4d shifts to Mon
   ```

3. **Redis keys** (no collisions with existing namespaces from the explore report):
   ```
   user:missions:{username}:daily:{periodKey}    Hash  fields: <missionId> = count, <missionId>:awarded = "1"
   user:missions:{username}:weekly:{periodKey}   Hash  same shape
   ```
   TTL: 10 days on daily hashes, 21 days on weekly hashes (cleanup after period ends — `redis.expire`).

4. **Exported functions**:
   - `listMissions(username)` → returns `{ daily: MissionView[], weekly: MissionView[] }` where `MissionView = catalog row + { progress, awarded }`. Reads the two current-period hashes in parallel.
   - `incrementMission(username, type, missionId, amount)` → increments `redis.hIncrBy(...)`, reads back new count. If `count >= total` and `<missionId>:awarded` is unset, sets the flag with `hSetNX` (atomic guard against double-award) and calls `awardCredits(username, reward, 'mission:'+missionId)`. Returns `{ progress, awarded }`. Also calls `redis.expire(...)` on first write so the period hash auto-cleans.
   - `recordGameCompletion(username, won)` → always increments `play3` (daily). If `won` also increments `win1` (daily) and `wwin5` (weekly).
   - `recordDraftCompletion(username, count)` → increments `draft1` (daily) and `wdraft` (weekly) by `count`.

### Hook integration

1. **`endGame` in [src/server/core/game.ts](src/server/core/game.ts)**:
   - Extend `replayPlays()` so it also returns the final `homePoints` / `awayPoints` from the last `quarter_end` event (the play log already carries them — no client API change). Win = `homePoints > awayPoints`.
   - After the existing `awardCredits` call (line 169-171), call `recordGameCompletion(username, won)`. Only on clean games (`isClean === true`) so flagged games don't credit-farm missions.

2. **`draft.free` and `draft.credit` in [src/server/trpc.ts](src/server/trpc.ts)** (or in `src/server/core/draft.ts` if minting lives there): call `recordDraftCompletion(username, mintedCount)` after the mint succeeds. Free draft mints 5 → +5 progress; credit draft mints 1 → +1.

### tRPC router

Add to [src/server/trpc.ts](src/server/trpc.ts), slotted after the `game` router (before `auction`):

```ts
missions: t.router({
  list: publicProcedure.query(async () => {
    const username = await requireUsername();
    return listMissions(username);
  }),
}),
```

No `claim` mutation — auto-award removes the need.

---

## Client

### `src/App.jsx`

- Add `const [serverMissions, setServerMissions] = useState({ daily: [], weekly: [] })`.
- In the existing `refreshUser` callback (around [src/App.jsx:62-77](src/App.jsx#L62)), also fire `trpc.missions.list.query().then(setServerMissions).catch(()=>{})`. The existing scene effect (`scene === 'draftHub' || scene === 'title'` triggers refresh) already covers the moments when missions need to be fresh.
- After `game.end` resolves (find the call site in App.jsx that handles game-over) call `refreshUser()` again or specifically refetch missions — credits + missions both move.
- Pass `missions={serverMissions}` to `<LobbyScreen ... />`.

### `src/components/LobbyScreen.jsx`

- Accept `missions` prop on the default export; drop the hardcoded `MISSIONS` constant (lines 276-287).
- Pass `missions` into `<DailyMissionsSection missions={missions} />`.
- `DailyMissionsSection`:
  - Replace the `MISSIONS[tab]` lookup with `missions?.[tab] ?? []`.
  - Replace the `'MISSIONS DISABLED CURRENTLY'` meta label with the next reset countdown — compute client-side from UTC midnight / Monday. Simple `Date.now()` math, refresh once per minute via `setInterval`.
  - Style completed rows: when `m.progress >= m.total`, add a small `✓` glyph after the `progress/total` text. No new CSS needed — `.lb2-ft-news-time` already supports inline content.

### CSS

No new mission classes needed. The existing `.lb2-mission-bar`, `.lb2-mission-bar-fill`, `.lb2-mission-tabs`, `.lb2-ft-news-row.accent-*` cover the layout.

---

## Verification

1. **Server smoke test** via the dev-tools Admin proxy:
   - `/dev-admin/*` already proxies to the Hono server. Use the admin panel's "reset user" then load the user — confirm `user:missions:*` keys are absent.
   - Play a game start → end via the running app. Confirm `user:missions:peetan:daily:{day}` shows `play3=1` and (if won) `win1=1, win1:awarded=1`. Confirm `user:peetan.credits` jumped by 50.
2. **Auto-award no-double-pay**: end a second won game on the same day — `win1` already awarded, no extra credit should land (only `play3` ticks).
3. **Lobby UI**: with `npm run dev:tools` open the Lobby story. Pipe a mock `missions` prop via the story controls (extend `LobbyStory.jsx` with editable mock missions). Confirm progress bars render, completed rows show ✓, and the meta label reads a sensible countdown.
4. **Period rollover**: in `missions.ts` temporarily shorten `DAY_MS` to 60_000 (or pass a `now` override). Confirm progress resets when the period key changes.
5. **End-to-end in Devvit playtest**: `npm run dev` (or `devvit playtest`), play a real game, watch the lobby missions update after the game-over screen dismisses.
6. **Playwright**: run `npx playwright test` to catch regressions in the lobby/draft flows.

---

## Files touched

| File | Change |
|---|---|
| `src/server/core/missions.ts` | NEW — catalog, period keys, listMissions, incrementMission, recordGameCompletion, recordDraftCompletion |
| `src/server/core/game.ts` | `replayPlays` returns final home/away points; `endGame` calls `recordGameCompletion(username, won)` on clean games |
| `src/server/core/draft.ts` | After mint, call `recordDraftCompletion(username, count)` |
| `src/server/trpc.ts` | Mount `missions` router with `list` query |
| `src/App.jsx` | Fetch missions in `refreshUser`; pass `missions` prop to `LobbyScreen`; refetch after `game.end` |
| `src/components/LobbyScreen.jsx` | Drop hardcoded `MISSIONS`; consume `missions` prop; replace static meta with reset countdown; ✓ on completed rows |
| `dev-tools/stories/LobbyStory.jsx` | Add mock missions toggle/editor for the story |
