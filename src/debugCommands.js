// Debug command registry — used by both the title-screen and in-game debug consoles.
//
// Each command declares a scope:
//   'title' — only valid on the title/lobby screens
//   'game'  — only valid during a live game
//   'both'  — valid anywhere
//
// Title/shared impls live in this file. Game-scope impls live in useGame.js
// (they need closures over game state); we delegate to ctx.handleGameCommand.
//
// ctx shape:
//   { scene: 'title' | 'game',
//     addLog: (text, type?) => void,
//     trpc,                              // tRPC client
//     setShowAdminOverlay?: (b) => void, // title only
//     handleGameCommand?: (op, args) => void } // game only

import { trpc } from './trpc';

export const COMMAND_META = {
  // ── Shared ────────────────────────────────────────────────────────────
  help: { scope: 'both', help: 'help — list available commands' },
  getUserFlairBySubreddit: { scope: 'both', help: 'getUserFlairBySubreddit [sub] — check user flair (default AnomalyGamesInc)' },
  checkSubActivity: { scope: 'both', help: 'checkSubActivity [sub] — scan recent comments/posts for a sub' },
  dumpRoster: { scope: 'both', help: 'dumpRoster — log server-side roster + lineup for the current user' },
  dumpAdmins: { scope: 'both', help: 'dumpAdmins — list server-side admin usernames (admins only)' },

  // ── Title only ────────────────────────────────────────────────────────
  admin: { scope: 'title', help: 'admin — open admin overlay (admins only)' },

  // ── Game only ─────────────────────────────────────────────────────────
  move:             { scope: 'game', help: 'move <dx> <dy>    — move ball carrier by pixels' },
  moveTo:           { scope: 'game', help: 'moveTo <x> <y>    — smooth move ball carrier to grid' },
  tp:               { scope: 'game', help: 'tp <x> <y>        — teleport PG to grid pos' },
  pos:              { scope: 'game', help: 'pos               — print PG grid position' },
  shoot:            { scope: 'game', help: 'shoot             — shoot toward basket (make)' },
  fadeaway:         { scope: 'game', help: 'fadeaway          — fadeaway shot toward basket (make)' },
  shootFail:        { scope: 'game', help: 'shootFail         — shoot and miss, bounce to random rebound' },
  reset:            { scope: 'game', help: 'reset             — reset PG to top of key' },
  testMoveAway:     { scope: 'game', help: 'testMoveAway      — away team takes possession' },
  testMoveHome:     { scope: 'game', help: 'testMoveHome      — home team takes possession' },
  testPass:         { scope: 'game', help: 'testPass <role>   — pass to teammate (PG/SG/SF/PF/C)' },
  testJumpBall:     { scope: 'game', help: 'testJumpBall      — both Cs tip off at center, 50/50 winner' },
  testThrowInHome:  { scope: 'game', help: 'testThrowInHome   — home C inbounds from left sideline' },
  testThrowInAway:  { scope: 'game', help: 'testThrowInAway   — away C inbounds from right sideline' },
  testDunk:         { scope: 'game', help: 'testDunk          — ball carrier drives to basket and dunks' },
  testSpinDunk:     { scope: 'game', help: 'testSpinDunk      — ball carrier drives to basket and spin-dunks' },
  testThreePointer: { scope: 'game', help: 'testThreePointer  — ball carrier runs to the 3-point line and shoots' },
  testGamePlay:     { scope: 'game', help: 'testGamePlay      — start continuous game loop' },
  stopGamePlay:     { scope: 'game', help: 'stopGamePlay      — stop the game loop' },
  testSpinMove:     { scope: 'game', help: 'testSpinMove      — ball carrier performs spin move animation' },
  testHomePG:       { scope: 'game', help: 'testHomePG        — give ball to home PG for testing' },
  testSpeedBurst:   { scope: 'game', help: 'testSpeedBurst    — ball carrier performs speed-burst dash animation' },
  testDash:         { scope: 'game', help: 'testDash          — alias for testSpeedBurst' },
  testLevelUp:      { scope: 'game', help: 'testLevelUp       — trigger level-up sequence for ball carrier' },
  testPickPlay:     { scope: 'game', help: 'testPickPlay      — open the play picker overlay' },
  testPickDefense:  { scope: 'game', help: 'testPickDefense   — open the defense picker (auto-closes in 3s)' },
};

// Title/shared command implementations
const sharedImpls = {
  help(args, ctx) {
    const entries = Object.entries(COMMAND_META);
    const wantScope = ctx.scene === 'title' ? 'title' : 'game';
    const visible = entries.filter(([, m]) => m.scope === 'both' || m.scope === wantScope);
    visible.forEach(([, m]) => ctx.addLog(m.help));
  },

  admin(args, ctx) {
    if (!ctx.setShowAdminOverlay) return;
    trpc.admin.isAdmin.query()
      .then(result => {
        if (!result.isAdmin) return;
        ctx.setShowAdminOverlay(true);
        // Admin panel owns the screen — get the console out of the way.
        ctx.closeConsole?.();
      })
      .catch(() => {});
  },

  getUserFlairBySubreddit(args, ctx) {
    const sub = args[0] || 'AnomalyGamesInc';
    ctx.addLog(`fetching flair from r/${sub}...`);
    trpc.user.getFlairBySubreddit.query({ subredditName: sub })
      .then(({ flair }) => {
        if (!flair) { ctx.addLog(`no flair set in r/${sub}`); return; }
        const text = flair.flairText ?? flair.text ?? '(none)';
        const css = flair.flairCssClass ?? flair.cssClass ?? '(none)';
        ctx.addLog(`flair: text="${text}" css="${css}"`);
      })
      .catch(e => ctx.addLog(`flair error: ${e.message}`, 'err'));
  },

  dumpAdmins(args, ctx) {
    ctx.addLog('fetching admin list...');
    trpc.admin.getAdmins.query()
      .then(admins => {
        ctx.addLog(`${admins.length} admin(s) in Redis:`);
        admins.forEach(a => ctx.addLog(`  ${a.username} (granted ${new Date(a.grantedAt).toISOString().slice(0,10)})`));
        ctx.addLog('note: u/AfternoonNo3552 is also a hardcoded creator admin');
      })
      .catch(e => ctx.addLog(`error: ${e.message}`, 'err'));
  },

  dumpRoster(args, ctx) {
    ctx.addLog('fetching server roster + lineup...');
    Promise.all([trpc.user.roster.query(), trpc.user.lineup.query()])
      .then(([roster, lineup]) => {
        ctx.addLog(`roster: ${roster.length} player(s)`);
        roster.forEach(p => ctx.addLog(`  #${p.id} ${p.name} (${p.rarity})`));
        ctx.addLog(`lineup: ${JSON.stringify(lineup ?? {})}`);
      })
      .catch(e => ctx.addLog(`error: ${e.message}`, 'err'));
  },

  checkSubActivity(args, ctx) {
    const sub = args[0] || 'the_last_draft_dev';
    ctx.addLog(`scanning recent activity for r/${sub}...`);
    trpc.user.checkSubActivity.query({ subredditName: sub })
      .then(r => {
        ctx.addLog(`r/${r.subreddit}: ${r.commentCount} comments, ${r.postCount} posts (scanned ${r.scanned.comments}c/${r.scanned.posts}p)`);
        if (r.firstSeen) ctx.addLog(`first: ${r.firstSeen.slice(0,10)}  last: ${r.lastSeen?.slice(0,10)}`);
        else ctx.addLog('no activity found in scanned window');
        if (r.recentPosts?.length) {
          ctx.addLog('— recent posts —');
          r.recentPosts.forEach(p => ctx.addLog(`[${p.date}] r/${p.sub}: ${p.title}`));
        }
        if (r.recentComments?.length) {
          ctx.addLog('— recent comments —');
          r.recentComments.forEach(c => ctx.addLog(`[${c.date}] r/${c.sub}: ${c.snippet}`));
        }
      })
      .catch(e => ctx.addLog(`error: ${e.message}`, 'err'));
  },
};

export function runCommand(cmdString, ctx) {
  const trimmed = cmdString.trim();
  if (!trimmed) return;
  ctx.addLog(trimmed, 'cmd');
  const parts = trimmed.split(/\s+/);
  const op = parts[0];
  const args = parts.slice(1);

  const meta = COMMAND_META[op];
  if (!meta) {
    ctx.addLog(`unknown: "${op}" — type help`, 'err');
    return;
  }

  // Scope check
  if (meta.scope === 'title' && ctx.scene !== 'title') {
    ctx.addLog(`"${op}" only works on the title/lobby screen`, 'err');
    return;
  }
  if (meta.scope === 'game' && ctx.scene !== 'game') {
    ctx.addLog(`"${op}" only works during a live game — start a game first`, 'err');
    return;
  }

  try {
    if (sharedImpls[op]) {
      sharedImpls[op](args, ctx);
    } else if (meta.scope === 'game') {
      if (!ctx.handleGameCommand) {
        ctx.addLog(`"${op}" requires game context`, 'err');
        return;
      }
      ctx.handleGameCommand(op, args);
    }
  } catch (e) {
    ctx.addLog(e.message, 'err');
  }
}
