import { redis } from '@devvit/web/server';
import { deductEnergy, awardCredits, recordGameOutcome, gamesKey } from './user';
import { recordGamePlayed } from './analyticsIndex';
import { recordGameCompletion } from './missions';
import { getChallengePost, recordChallengeResult } from './post';

const GAME_COUNTER_KEY = 'game:id:counter';
const SESSION_TTL_SECS = 3600;
const PLAYS_TTL_SECS = 30 * 24 * 60 * 60; // 30 days
const MIN_DURATION_SECS = 60;

export const gameKey = (id: number) => `game:${id}`;
export const playsKey = (id: number) => `game:${id}:plays`;
const sessionKey = (token: string) => `game:session:${token}`;

export type GameStatus = 'active' | 'pending' | 'flagged' | 'approved' | 'rejected';

export type GameSummary = {
  id: number;
  username: string;
  postId: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  verifiedScore: number;
  creditsEarned: number;
  status: GameStatus;
};

export type PlayEvent = {
  type: 'shoot' | 'dunk' | 'block' | 'steal' | 'defense' | 'quarter_end' | 'move' | 'score';
  playerId?: number;
  result?: 'made' | 'missed';
  points?: number;
  to?: [number, number];
  team?: 'home' | 'away';
  total?: number;
  homePoints?: number;
  awayPoints?: number;
  quarter?: number;
  t: number;
};

const generateToken = (): string =>
  Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');

// Replays the stored play log. Returns verified score (for anti-cheat),
// credits using the same per-quarter formula as the client, and the final
// home/away point totals (from the most recent quarter_end event) so the
// caller can tell whether the home team won.
const replayPlays = async (gameId: number): Promise<{ score: number; credits: number; finalHome: number; finalAway: number }> => {
  const raw: any[] = (await redis.zRange(playsKey(gameId), 0, -1)) as any;
  let score = 0;
  let credits = 0;
  let qStats = { shots: 0, dunks: 0, blocks: 0, steals: 0, defenses: 0 };
  let finalHome = 0;
  let finalAway = 0;

  for (const entry of raw) {
    try {
      const json = typeof entry === 'object' ? entry.member : entry;
      const play = JSON.parse(json) as PlayEvent;
      if (play.team === 'home') {
        if (play.type === 'shoot' && play.result === 'made') { score += play.points ?? 2; qStats.shots++; }
        else if (play.type === 'dunk') { score += 2; qStats.dunks++; }
        else if (play.type === 'block') { qStats.blocks++; }
        else if (play.type === 'steal') { qStats.steals++; }
        else if (play.type === 'defense') { qStats.defenses++; } // correct defense read
      }
      if (play.type === 'quarter_end') {
        const winBonus = (play.homePoints ?? 0) > (play.awayPoints ?? 0) ? 500 : 0;
        // Defense reads pay 50 each (DEFENSE_BONUS_CREDITS on the client); all other stats pay 100.
        credits += (qStats.shots + qStats.dunks + qStats.blocks + qStats.steals) * 100 + qStats.defenses * 50 + winBonus;
        qStats = { shots: 0, dunks: 0, blocks: 0, steals: 0, defenses: 0 };
        // homePoints/awayPoints on quarter_end are PER-QUARTER (the client
        // resets quarterPointsRef each quarter), so accumulate them into the
        // game totals. Overwriting here was the bug behind "won when I lost":
        // it compared only the final quarter's points, not the full game.
        finalHome += play.homePoints ?? 0;
        finalAway += play.awayPoints ?? 0;
      }
    } catch {
      // malformed entry — skip silently
    }
  }

  return { score, credits, finalHome, finalAway };
};

// Deducts energy and issues a session token. The token must be passed to
// recordPlay and endGame to prove the game was legitimately started.
export const startGame = async (
  username: string,
  postId: string,
): Promise<{ gameId: number; token: string } | { error: string }> => {
  const energy = await deductEnergy(username);
  if (!energy.success) return { error: 'Not enough energy' };

  const gameId = await redis.incrBy(GAME_COUNTER_KEY, 1);
  const token = generateToken();
  const now = Date.now();

  // If this game was launched from a Challenge Me post, resolve the opponent
  // server-side from the postId (never trusted from the client) so endGame can
  // attribute the result to the owner's challenge log. Self-challenges (owner
  // opening their own post) are ignored.
  const gameHash: Record<string, string> = {
    username,
    postId,
    startTime: String(now),
    status: 'active',
  };
  const challenge = postId ? await getChallengePost(postId) : null;
  if (challenge && challenge.owner !== username) {
    gameHash.opponentUsername = challenge.owner;
    gameHash.opponentPostId = postId;
  }

  await Promise.all([
    redis.hSet(gameKey(gameId), gameHash),
    redis.set(sessionKey(token), `${username}:${gameId}`),
    redis.expire(sessionKey(token), SESSION_TTL_SECS),
  ]);

  return { gameId, token };
};

// Appends a play event to the game log. Validates the session token so only
// the player who started the game can write plays.
export const recordPlay = async (
  username: string,
  gameId: number,
  token: string,
  play: PlayEvent,
  sequence: number,
): Promise<{ success: boolean }> => {
  const session = await redis.get(sessionKey(token));
  if (session !== `${username}:${gameId}`) return { success: false };

  await redis.zAdd(playsKey(gameId), {
    score: sequence,
    member: JSON.stringify(play),
  });

  return { success: true };
};

// Validates the session, replays the play log, compares to client score,
// awards credits for clean games, and queues the game for admin review.
export const endGame = async (
  username: string,
  gameId: number,
  token: string,
  clientScore: number,
): Promise<GameSummary> => {
  const session = await redis.get(sessionKey(token));
  if (session !== `${username}:${gameId}`) throw new Error('Invalid session token');

  const raw = await redis.hGetAll(gameKey(gameId));
  if (raw.username !== username) throw new Error('Game does not belong to this user');

  const now = Date.now();
  const startTime = Number(raw.startTime ?? 0);
  const duration = Math.floor((now - startTime) / 1000);
  const postId = raw.postId ?? '';
  const opponentPostId = raw.opponentPostId ?? '';

  const { score: verifiedScore, credits: verifiedCredits, finalHome, finalAway } = await replayPlays(gameId);
  const scoreMatch = verifiedScore === clientScore;
  const durationOk = duration >= MIN_DURATION_SECS;
  const isClean = scoreMatch && durationOk;
  const won = finalHome > finalAway;

  const status: GameStatus = isClean ? 'pending' : 'flagged';
  const creditsEarned = isClean ? verifiedCredits : 0;

  await Promise.all([
    redis.hSet(gameKey(gameId), {
      endTime: String(now),
      duration: String(duration),
      score: String(clientScore),
      verifiedScore: String(verifiedScore),
      creditsEarned: String(creditsEarned),
      sessionToken: token,
      status,
    }),
    redis.del(sessionKey(token)),
    redis.expire(playsKey(gameId), PLAYS_TTL_SECS),
    redis.zAdd(isClean ? 'games:pending' : 'games:flagged', {
      score: now,
      member: String(gameId),
    }),
    redis.zAdd(gamesKey(username), { score: now, member: String(gameId) }),
    // Append-only global game log for analytics. Deliberately separate from
    // games:pending, which is a moderation queue that gets zRem'd on review.
    recordGamePlayed(gameId, now),
  ]);

  if (creditsEarned > 0) {
    await awardCredits(username, creditsEarned, String(gameId));
  }

  // Only credit-clean games count toward missions, the W-L record, and the
  // challenge log — keeps flagged/cheating games from farming rewards or
  // polluting an opponent's "Previous Challenges" list. Wrapped so a failure
  // in any of these side-effects can never break game finalization / credit
  // award (recordGameCompletion already swallows internally; this guards the
  // W-L + challenge-log writes too).
  if (isClean) {
    await recordGameCompletion(username, won);
    try {
      await recordGameOutcome(username, won);
      // Launched from a Challenge Me post → attribute the result to the owner's
      // log (recorded from the challenger's perspective).
      if (opponentPostId) {
        // Record from the POST OWNER's perspective — their roster is the away
        // team. 'W' = the owner's team held off the challenger, 'L' = the owner
        // was beaten. Score is owner-first so the card reads naturally on the
        // owner's post ("u/challenger … 4-12" with an L = owner lost 4-12).
        const ownerWon = finalAway > finalHome;
        await recordChallengeResult(opponentPostId, {
          opponent: username,
          result: ownerWon ? 'W' : 'L',
          score: `${finalAway}-${finalHome}`,
          gameId,
        });
      }
    } catch {
      // W-L / challenge-log tracking must not break game finalization.
    }
  }

  return { id: gameId, username, postId, startTime, endTime: now, duration, score: clientScore, verifiedScore, creditsEarned, status };
};

export const getGame = async (gameId: number): Promise<GameSummary | null> => {
  const raw = await redis.hGetAll(gameKey(gameId));
  if (!raw?.username) return null;
  return {
    id: gameId,
    username: raw.username,
    postId: raw.postId ?? '',
    startTime: Number(raw.startTime ?? 0),
    endTime: Number(raw.endTime ?? 0),
    duration: Number(raw.duration ?? 0),
    score: Number(raw.score ?? 0),
    verifiedScore: Number(raw.verifiedScore ?? 0),
    creditsEarned: Number(raw.creditsEarned ?? 0),
    status: (raw.status ?? 'pending') as GameStatus,
  };
};
