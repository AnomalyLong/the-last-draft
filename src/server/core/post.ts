import { reddit, redis, context } from '@devvit/web/server';
import { weeklyPeriodKey, recordChallengeCreated } from './missions';

// Builds a shareable web URL for a post. Reddit post ids are `t3_…` thing-ids;
// the URL path uses the bare id, and the link must include the subreddit or it
// won't resolve cleanly (and Devvit's navigateTo needs the full canonical URL).
const postUrl = (postId: string): string =>
  `https://www.reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}/`;

// Auto-approve the app's own posts so they skip the modqueue / spam filter and
// are visible immediately. The app account moderates every subreddit it's
// installed on, so it always has approve rights there. Best-effort: a failed
// approval must never fail post creation.
const autoApprove = async (post: { id: string; approve: () => Promise<void> }): Promise<void> => {
  try {
    await post.approve();
  } catch (err) {
    console.error(`autoApprove failed for ${post.id}`, err);
  }
};

// Legacy default post (created on app install / via the menu action).
export const createPost = async () => {
  const post = await reddit.submitCustomPost({
    title: 'the-last-draft',
  });
  await autoApprove(post);
  return post;
};

// ── Challenge Me posts ───────────────────────────────────────────────────────
// A "Challenge Me" post advertises a user's roster on the subreddit. Other
// users open it, see the owner's team (live-read via getChallenge in trpc.ts),
// and can play a game against it. Results are appended to the owner's log so
// the card can show "Previous Challenges".

export type ChallengePost = {
  postId: string;
  owner: string;
  createdAt: number;
  // This team's challenge-defense record (owner perspective): wins = times the
  // roster held off a challenger, losses = times it was beaten. Tallied on the
  // post hash so it's all-time, independent of the capped display log.
  wins: number;
  losses: number;
};

export type ChallengeResult = {
  opponent: string;        // username of the challenger who played the owner's team
  result: 'W' | 'L';       // POST OWNER's perspective: 'W' = owner's team held, 'L' = owner beaten
  score: string;           // owner-first: `${ownerPts}-${challengerPts}`
  gameId: number;
};

const postKey = (postId: string) => `post:${postId}`;
const challengesKey = (postId: string) => `post:${postId}:challenges`;
export const challengePostKey = (username: string) => `user:challengePost:${username}`;

const MAX_CHALLENGE_LOG = 20;
const CHALLENGE_GATE_TTL = 8 * 24 * 60 * 60;  // janitor only — week compare is the real gate
const CHALLENGE_LOG_TTL = 30 * 24 * 60 * 60;

// Whether a Reddit post still exists (verify-on-check for the weekly gate). A
// user can delete their challenge post on Reddit; nothing notifies us, so the
// gate would otherwise keep pointing at a dead post and block reposting. We
// confirm existence lazily whenever the gate is read. Defensive about the Post
// shape — removedByCategory === 'deleted' covers author deletion; a thrown
// "not found" is treated as gone.
const postExists = async (postId: string): Promise<boolean> => {
  try {
    // Stored postIds are plain strings; getPostById wants the `t3_${string}`
    // thing-id type. Reddit post ids are already in that form.
    const p: any = await reddit.getPostById(postId as `t3_${string}`);
    if (!p) return false;
    if (p.removed === true || p.removedByCategory) return false;
    return true;
  } catch {
    return false;
  }
};

// Creates a Challenge Me post. Gated to one per ISO week (Monday UTC), aligned
// with the weekly mission reset by reusing weeklyPeriodKey — the stored value
// `${weekKey}:${postId}` is compared against the current week, so the gate
// lines up exactly with the mission boundary rather than approximating with a
// TTL. Throws if the user already posted this week.
export const createChallengePost = async (
  username: string,
): Promise<{ postId: string; navigateTo: string }> => {
  const week = weeklyPeriodKey();
  // Route the gate through canCreateChallengePost so verify-on-check applies
  // here too: a user whose post was deleted on Reddit can repost immediately.
  const gate = await canCreateChallengePost(username);
  if (!gate.canCreate) {
    throw new Error('You already created a Challenge Me post this week');
  }

  const post = await reddit.submitCustomPost({
    title: `${username}'s team is open for challenge — r/LastDraftGame`,
  });
  const postId = post.id;
  await autoApprove(post);
  const now = Date.now();

  await Promise.all([
    redis.hSet(postKey(postId), {
      type: 'challenge',
      owner: username,
      createdAt: String(now),
    }),
    redis.set(challengePostKey(username), `${week}:${postId}`),
  ]);
  await redis.expire(challengePostKey(username), CHALLENGE_GATE_TTL);

  await recordChallengeCreated(username);

  return { postId, navigateTo: postUrl(postId) };
};

// Reads a challenge post hash; returns null if the post id isn't a challenge
// post (e.g. the legacy default post, or no postId context at all).
export const getChallengePost = async (
  postId: string,
): Promise<ChallengePost | null> => {
  if (!postId) return null;
  const raw = await redis.hGetAll(postKey(postId));
  if (raw?.type !== 'challenge' || !raw.owner) return null;
  return {
    postId,
    owner: raw.owner,
    createdAt: Number(raw.createdAt ?? 0),
    wins: Number(raw.wins ?? 0),
    losses: Number(raw.losses ?? 0),
  };
};

// Whether the user may create a new challenge post this week. Verify-on-check:
// if the stored post is from this week but no longer exists on Reddit (the user
// deleted it), clear the stale gate and allow reposting. Self-healing — never
// throws, so it doubles as the live-post lookup for getMyChallenge.
export const canCreateChallengePost = async (
  username: string,
): Promise<{ canCreate: boolean; postedPostId?: string }> => {
  const existing = await redis.get(challengePostKey(username));
  if (!existing) return { canCreate: true };
  const [weekStr, postId] = existing.split(':');
  if (Number(weekStr) !== weeklyPeriodKey()) return { canCreate: true };

  // Same week — but only block if the post is still live on Reddit.
  if (postId && (await postExists(postId))) {
    return { canCreate: false, postedPostId: postId };
  }
  await redis.del(challengePostKey(username));
  return { canCreate: true };
};

// Appends a challenge outcome to the owner's post log, newest kept. Caps the
// log to the most-recent MAX_CHALLENGE_LOG entries using only zCard/zRange/zRem
// (zRemRangeByRank isn't used elsewhere in this codebase).
export const recordChallengeResult = async (
  postId: string,
  result: ChallengeResult,
): Promise<void> => {
  const key = challengesKey(postId);
  await redis.zAdd(key, { score: Date.now(), member: JSON.stringify(result) });
  // All-time challenge-defense tally on the post hash (survives log trimming).
  await redis.hIncrBy(postKey(postId), result.result === 'W' ? 'wins' : 'losses', 1);

  const count = await redis.zCard(key);
  if (count > MAX_CHALLENGE_LOG) {
    const oldest: any[] = (await redis.zRange(key, 0, count - MAX_CHALLENGE_LOG - 1)) as any;
    const members = oldest.map((m: any) => (typeof m === 'object' ? m.member : m));
    if (members.length) await redis.zRem(key, members);
  }
  await redis.expire(key, CHALLENGE_LOG_TTL);
};

// Most-recent challenge results, newest first.
export const listChallengeResults = async (
  postId: string,
  limit = 3,
): Promise<ChallengeResult[]> => {
  const raw: any[] = (await redis.zRange(challengesKey(postId), 0, -1)) as any;
  const all = raw
    .map((m: any) => {
      try { return JSON.parse(typeof m === 'object' ? m.member : m) as ChallengeResult; }
      catch { return null; }
    })
    .filter(Boolean) as ChallengeResult[];
  return all.reverse().slice(0, limit);
};

// The current user's own active challenge post (this week), for the lobby
// "My Challenge" view. Returns null when there's no live post — either none
// created this week, or it was created but has since been deleted on Reddit
// (canCreateChallengePost runs verify-on-check and self-heals the gate).
// Powers both the lobby CTA state (VIEW vs POST NOW) and the modal contents.
export const getMyChallenge = async (
  username: string,
): Promise<{
  postId: string;
  navigateTo: string;
  record: { wins: number; losses: number };
  challenges: ChallengeResult[];
} | null> => {
  const gate = await canCreateChallengePost(username);
  if (!gate.postedPostId) return null;
  const postId = gate.postedPostId;
  const post = await getChallengePost(postId);
  if (!post) return null;
  const challenges = await listChallengeResults(postId, 10);
  return {
    postId,
    navigateTo: postUrl(postId),
    record: { wins: post.wins, losses: post.losses },
    challenges,
  };
};
