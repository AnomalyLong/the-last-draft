# Challenge Me Posts — How They Work

A "Challenge Me" post advertises a user's roster on r/LastDraftGame. Other Redditors open it,
see the owner's team, and can play a game against that roster. This doc is the reference
for the feature's data model, control flow, files, and the non-obvious gotchas.

---

## 1. End-to-end flow

1. **Lobby mission entrypoint.** A *featured* weekly mission `wchallenge` ("CREATE A CHALLENGE ME")
   shows in the lobby missions ([LobbyScreen.jsx](src/components/LobbyScreen.jsx) → `DailyMissionsSection`).
   Featured missions render in **both** the Daily and Weekly tabs (data lives in `missions.weekly`;
   the daily tab prepends them) with a **POST NOW** CTA (or **✓ POSTED** when done).
2. **Confirm modal.** CTA → `App.jsx` opens a confirm modal (`challengeModal` state: `confirm`/`posting`/`posted`/`error`).
   Requires a full 5-player lineup, else shows a "need a full lineup" message.
3. **Create the post.** Confirm → `trpc.post.createChallenge` → `createChallengePost(username)`:
   submits a Reddit custom post, writes the `post:{postId}` hash, sets the weekly gate, ticks the mission.
4. **Success (stay in-app).** The modal flips to a **posted** state showing the post URL + a **VIEW POST**
   button (`devvitNavigateTo`). We do **not** auto-navigate (see Gotcha #1). Missions refresh → mission flips to ✓ POSTED.
5. **Inline render.** When anyone opens the post, `App.jsx` (inline mode) calls `trpc.post.getChallenge`
   (keyed off `context.postId`). If it's a challenge post, it renders `ChallengeCardHost` instead of the splash.
6. **Accept → game.** Tapping **CHALLENGE ME** expands the webview (`requestExpandedMode`). The expanded app
   re-fetches `getChallenge` on boot and, if the viewer has a roster, routes into Matchmaking with the
   **away team = the post owner's roster**. The viewer plays; on finish the result is recorded to the owner's post.

---

## 2. Data model (Redis)

| Key | Type | Contents |
|---|---|---|
| `post:{postId}` | hash | `{ type: 'challenge', owner, createdAt, wins, losses }` — `wins`/`losses` = the team's **challenge-defense** tally (owner perspective: W = roster held off a challenger, L = beaten). |
| `post:{postId}:challenges` | zset | member = `JSON({opponent, result, score, gameId})`, score = ts. Capped to last **20** (via zCard + zRange + zRem). Owner-perspective. |
| `user:challengePost:{username}` | string | `${weekKey}:${postId}`. The **once-per-week gate**. ~8-day TTL is only a janitor — the real gate compares the stored `weekKey` to the current `weeklyPeriodKey`. |
| `user:{username}` (existing) | hash | New fields `wins`/`losses` = the user's **personal** game record (from `recordGameOutcome`, all clean games they play as the challenger). NOT the same as the post's challenge-defense record. |

Two distinct W/L records — don't confuse them:
- **Post hash `wins/losses`** → shown under the avatar on the challenge card (challenge-defense record).
- **User hash `wins/losses`** → the player's overall record (currently tracked, not shown on the card).

---

## 3. Server

### `src/server/core/post.ts`
- `createChallengePost(username)` — weekly-gated **via `canCreateChallengePost`** (so verify-on-check
  applies here too — a deleted post lets you repost); `reddit.submitCustomPost`, writes `post:{postId}`,
  sets the gate, calls `recordChallengeCreated`. Returns `{ postId, navigateTo }`.
- `getChallengePost(postId)` — returns `{ postId, owner, createdAt, wins, losses }` or `null` (not a challenge post).
- `canCreateChallengePost(username)` — `{ canCreate, postedPostId? }`. WeekKey comparison **plus verify-on-check**:
  if the stored post is this-week but no longer exists on Reddit (`postExists` → `getPostById`, treating
  `removed`/`removedByCategory` as gone), it `del`s the stale gate and returns `canCreate: true`. Self-healing,
  never throws (see Gotcha #9).
- `getMyChallenge(username)` — the current user's own active post for the lobby "My Challenge" view. Calls
  `canCreateChallengePost` (so it self-heals a dead gate), returns `null` when there's no live post, else
  `{ postId, navigateTo, record: {wins,losses}, challenges }` (last 10, owner-perspective). Powers BOTH the
  lobby CTA state and the modal in one round-trip.
- `recordChallengeResult(postId, result)` — zAdd to the log (capped), **and** `hIncrBy` the post hash `wins`/`losses`
  (so the tally is all-time, independent of the 20-entry log cap).
- `listChallengeResults(postId, limit=3)` — newest-first results for the card.
- `challengePostKey(username)` — exported for reset routines.
- `createPost()` — legacy default post, still used by [menu.ts](src/server/routes/menu.ts) / [triggers.ts](src/server/routes/triggers.ts).
- `ChallengeResult` type = `{ opponent, result: 'W'|'L', score, gameId }` — **owner perspective**, score owner-first.

### `src/server/core/missions.ts`
- `MissionDef.featured?: boolean`. `wchallenge` is in `DEFAULT_MISSION_CATALOG.weekly` (featured).
- `recordChallengeCreated(username)` — ticks `wchallenge` (mirrors `recordDraftCompletion`).
- `withFeaturedDefaults(catalog)` — **self-heal**: when a stored override exists, any *featured* default missing
  from it is merged back in (read-time, non-destructive). Scoped to featured only so admin-deleted regular
  missions stay deleted. This is why `wchallenge` shows even if `missions:catalog` predates it.
- `weeklyPeriodKey(now)` — reused by post.ts for the weekly gate (aligns gate with the mission reset).

### `src/server/core/player.ts`
- `buildRosterForUser(username, { includeServerId })` — joins roster + lineup → ordered PG→C team shape with
  stat bonuses + computed `overall` (server-side `calcOvr`/`OVR_WEIGHTS`, mirrors the client).
  **`includeServerId: false` for opponent payloads** (Challenge Me) — see Gotcha #4.

### `src/server/core/user.ts`
- `recordGameOutcome(username, won)` — `hIncrBy` `wins`/`losses` on the user hash. Called from `endGame` (clean games only).
- `UserData` now has `wins`/`losses`.

### `src/server/core/game.ts`
- `startGame(username, postId)` — resolves the opponent **server-side** from `postId` (calls `getChallengePost`);
  writes `opponentUsername` + `opponentPostId` on `game:{id}`. The client never supplies the opponent (anti-spoof).
- `replayPlays` — **sums** per-quarter points into `finalHome`/`finalAway` (the client resets `quarterPointsRef`
  each quarter). Overwriting was a bug that made `won` reflect only the final quarter. See Gotcha #5.
- `endGame` (clean games only): `recordGameCompletion`, `recordGameOutcome(username, won)`, and if `opponentPostId`:
  `recordChallengeResult` with **owner perspective** — `ownerWon = finalAway > finalHome` (owner is the away team),
  `result = ownerWon ? 'W' : 'L'`, `score = \`${finalAway}-${finalHome}\`` (owner-first). Wrapped in try/catch so it
  never breaks finalization.

### `src/server/trpc.ts` — `post` router
- `post.createChallenge` (mutation) → `createChallengePost`; throws `CONFLICT` if already posted this week.
- `post.canCreateChallenge` (query).
- `post.getMyChallenge` (query, no input) → `getMyChallenge(username)`. Lobby My Challenge view; `null` when no live post.
- `post.getChallenge` (query, no input) — uses `context.postId`; `null` if not a challenge post. Otherwise returns
  `{ username, owner: 'u/...', team, record: {wins,losses}/*from post hash*/, roster /*serverId stripped*/, challenges }`.
- `game.start` stays **no-input** (reads `context.postId`).
- Reset routines (`admin.resetUser` in trpc.ts + dev-admin `/user/:username/reset` in [index.ts](src/server/index.ts))
  also `del(challengePostKey(input))`.

---

## 4. Client

### `lobby/challenge-card.jsx` — presentational card
Props: `roster`, `challenges`, `owner ({ user, team, record })`, `onChallenge(owner.user, event)`. Has `DEFAULT_*`
mocks for the dev story. Layout: MBA logo, OPEN badge, **TEAM AVG OVR above the player**, roster carousel (◀▶ + sprite),
name/pos/OVR/stats/abilities, **VIEWING: PG SG SF PF C** position dots (stopPropagation so they don't trigger launch),
owner block (avatar + username + team + challenge-defense record), fixed-height **Previous Challenges** box (W/L chips,
"No challenges yet" empty state), **CHALLENGE ME** CTA.

### `src/components/ChallengeCardHost.jsx` — adapter
Bridges the `post.getChallenge` payload → `ChallengeCard` props: maps `rarity → {tier, color}`, abilities → names,
builds `owner`. Supplies the CSS vars `post.css` needs and imports **only `lobby/post.css`** (NOT `lobby/styles.css`,
which has global `*`/`body` resets that would bleed). Used in App's inline branch.

### `src/App.jsx`
- `challengePost` state: `undefined` (loading) | `null` (not a challenge post) | object. Fetched once via
  `trpc.post.getChallenge.query()` (no React Query in this repo — see Gotcha #6).
- Inline: renders `ChallengeCardHost` when `challengePost` is truthy; only **CHALLENGE ME** launches (the root
  tap-to-expand is disabled while a challenge card shows; the CTA calls `onChallenge → tryExpand(e.nativeEvent)`).
- `handleCreateChallenge` → `trpc.post.createChallenge.mutate()` → success modal (stays in-app) +
  `refreshMissions()` + `refreshMyChallenge()` (so the lobby CTA flips POST NOW → VIEW immediately).
- `myChallenge` state (`undefined`=loading | `null`=no live post | obj), fetched via `getMyChallenge` on
  non-inline mount (`refreshMyChallenge`). Drives the lobby CTA (`challengeActive={!!myChallenge}`) and the
  **My Challenge modal** (`myChallengeOpen`): record + Previous Challenges list + VIEW POST. If `myChallenge`
  is `null` when opened (deleted post), the modal shows "no longer active" + CREATE NEW (→ `challengeModal='confirm'`).
- **Expanded-boot routing effect** (declared *after* the state it reads — Gotcha #7): once the lobby is up and
  `getChallenge` + roster have settled, if it's someone else's challenge post with a full 5-player roster,
  `setAwayTeam({ name, username, players })` and route to `matchmaking`. Otherwise it sets `challengeBlock`:
  `'self'` (own post → "can't challenge yourself" + BACK TO LOBBY) or `'noRoster'` (no full squad →
  "draft your roster first" + DRAFT MY TEAM / BACK TO LOBBY). The block modal owns the draft routing.
- `toAwayPlayers(roster)` — maps the challenge roster to the `opponents.json` away-team shape (keeps abilities; no serverId).

### `src/components/LobbyScreen.jsx`
`DailyMissionsSection` accepts `onCreateChallenge`, `challengeActive`, `onViewChallenge`; featured missions
merge into the daily tab. The CTA is driven by **`challengeActive` (live-post state), NOT mission progress** —
`VIEW ▸` when a post is live (→ `onViewChallenge`), else `POST NOW ▸` (→ `onCreateChallenge`). This decoupling
makes the deletion case self-correct (see Gotcha #9).

---

## 5. Design decisions

- **Live roster** — the card always shows the owner's *current* lineup (re-fetched per view); no snapshot stored.
- **One post per week** — `user:challengePost` weekKey gate.
- **Owner-perspective W/L** — challenge results are stored/shown from the post owner's side (W = team held, L = beaten),
  score owner-first. The challenger plays as the home team; the owner's roster is the AI-controlled away team.
- **Asymmetric progression (v1)** — only the challenger's roster gains/persists XP. The owner's team is a live-read,
  **immutable** opponent. Enforced three ways: home-only persistence loop in App, the `player.progress` ownership
  guard, and the stripped `serverId` (Gotcha #4). Symmetric progression is a tracked future refactor in
  [TODO.md](TODO.md) → "Challenge Me — Symmetric Progression Refactor".

---

## 6. Gotchas (things that bit us)

1. **Navigation must use Devvit, not `window.location`.** Setting `window.location.href = reddit.com/...` tries to
   frame Reddit inside the sandboxed webview → blocked by `frame-src` CSP → iframe crash. Use `navigateTo` from
   `@devvit/web/client` (host-level nav). We ultimately stay in-app with a success modal + opt-in VIEW POST.
2. **Stale pre-change data won't self-correct.** Challenge entries written before the per-post tally + owner-perspective
   flip show wrong (old challenger-perspective `W 12-4`) and aren't counted in the record. Only new challenges are correct.
   To clean a specific post you'd clear `post:{postId}:challenges` + reset the hash `wins`/`losses` (no admin route yet).
3. **Reddit sets `line-height: 0`** on many elements. `post.css` sets a `line-height` baseline on `.post-card` + explicit
   line-heights on the name/position row so text doesn't collapse on Reddit.
4. **Strip `serverId` from opponent rosters.** `getChallenge` calls `buildRosterForUser(owner, { includeServerId: false })`
   so the away team is structurally synthetic (like `opponents.json`) and away-team level-ups can't be persisted by
   construction — not just blocked by the ownership guard.
5. **Win determination summed per-quarter.** `quarter_end` events carry *per-quarter* points (client resets each quarter);
   `replayPlays` must **sum** them, not overwrite, or `won` reflects only the last quarter.
6. **No React Query.** `src/trpc.ts` is the vanilla `createTRPCClient`. Use `trpc.x.query().then(setState)`, not `useQuery`.
7. **Effect ordering / TDZ.** The expanded-boot routing effect reads `challengePost`/`homeRoster`/`awayTeam` in its deps;
   it must be declared *below* those `const [...] = useState(...)` lines or it throws "Cannot access before initialization".
8. **Expand reloads the app.** `requestExpandedMode` boots a fresh webview — React state set before the tap is lost.
   The challenge context is re-derived on the expanded boot from `context.postId` (which persists), not passed via state.
9. **Deleted posts are handled by verify-on-check, not a trigger.** There is no `PostDelete` trigger. Instead,
   `canCreateChallengePost` confirms the stored post still exists on Reddit (`reddit.getPostById`) whenever the
   gate is read; if it's gone it clears the gate so the user can repost the same week. Two consequences worth
   knowing: (a) the lobby CTA is driven by `getMyChallenge` (live state), not mission progress — so a deleted post
   reverts VIEW → POST NOW even though the weekly mission already credited (reposting re-ticks it harmlessly via
   the `hSetNX` award guard); (b) the existence check only runs when a same-week pointer exists (i.e. after the
   user has posted this week), so it adds no Reddit API call to the common no-post-yet path.

---

## 7. Related: Matchmaking VIEW TEAM modal

Not part of challenge posts per se, but built alongside: the matchmaking screen's panels show **VIEW TEAM** buttons
(where the GRADE badge was) that open a modal of the team's player cards. The cards **reuse the draft's `CardFront`**
(exported from [DraftScreen.jsx](src/components/DraftScreen.jsx) with `TIER_DEFS`/`getPlayerTierKey`), rendered 4-at-a-time
in a carousel at the unscaled root (so they stay readable). Modal-scoped font bumps (`.team-modal .dc-stat-lbl` 18px, etc.)
keep the small draft-card labels legible. Panels also now show `username · TEAM NAME` instead of team-name-as-fake-handle.

---

## 8. Verification checklist

- Lobby: `wchallenge` shows in both mission tabs (dev story `LobbyStory` mocks it). POST NOW → confirm → posted modal.
- Devvit playtest: post creation navigates/links correctly; mission flips to ✓ POSTED; can't re-post same week.
- Open the post from a second account with a roster → inline `ChallengeCard` shows owner's live roster + record.
- Tap CHALLENGE ME → expand → matchmaking (away = owner's lineup) → play → finish.
- Re-open post: Previous Challenges shows the result (owner perspective), record incremented.
- Asymmetric safety: owner's roster level/xp **unchanged** after being challenged.
