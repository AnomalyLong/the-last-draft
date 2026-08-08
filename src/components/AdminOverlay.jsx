import React, { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import { SPLASH_VARIANTS, describeSplash, setSplashOverride, subscribeSplash, applyGlobalSplash } from '../splashConfig.js';
import { DRAFT_PRICING_FIELDS, DRAFT_PRICING_BOUNDS, tiersFor } from '../shared/draftPricing';

const S = {
  // lineHeight is REQUIRED here, not cosmetic. The app root
  // (App.jsx, `[data-testid="game-root"]`) sets an inline `lineHeight: 0`,
  // which every descendant inherits — including this overlay. With 0, each
  // text div gets a zero-height line box, so stacked labels (mission name /
  // id+reward / description) all paint on the same baseline and overlap.
  // This is NOT caused by Reddit: the shipped bundle carries the same inline
  // style, so the collapse is identical in production and in the Farnsworth
  // preview. Fix it here rather than at the root, because the root's 0 is
  // load-bearing for the sprite/pixel-art layout. (Jul 27)

  // Top-anchored (flex-start), NOT centered. Panel height varies hugely by tab
  // (measured 216px on Games up to 717px on Missions/Notify). Because the panel
  // was centered, that made the tab bar jump ~215px vertically between tabs — on
  // mobile the bar relocates under your thumb mid-tap, causing mis-taps.
  // Anchoring the top pins the bar to one Y for every tab (verified: spread 0)
  // while still letting short panels shrink to fit, so we don't pad out a tall
  // empty frame. Guard: .farnsworth/devvit-tests/admin-tabs-mobile-layout.json
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 8px 8px', boxSizing: 'border-box', fontFamily: 'monospace', lineHeight: 1.4, overflowY: 'auto' },
  panel: { background: '#0d1220', border: '1px solid #2a3a58', borderRadius: 6, width: 560, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e2e48', background: '#0a0f1c' },
  title: { color: '#3a8fd4', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  close: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' },
  // An auto-fit grid, NOT a scroll strip. `repeat(auto-fit, minmax(70px, 1fr))`
  // packs as many equal-width cells as fit and wraps the rest, so the tab bar
  // is responsive with no media query, no measurement, and no overflow:
  //   · 560px panel  → 7 cells fit on one row (unchanged desktop look)
  //   · 374px mobile → 4 + 3 across two rows, every tab visible and tappable
  // The previous overflowX:auto left a native scrollbar over the tabs and could
  // scroll the ACTIVE tab out of sight — you couldn't tell which tab you were on.
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 4, padding: '8px 10px', borderBottom: '1px solid #1e2e48', background: '#0a0f1c' },
  // Active state is a filled pill, not a bottom border. A border-bottom reads as
  // "underline the bar" and becomes ambiguous once the bar wraps to two rows.
  tab: (active) => ({
    padding: '7px 6px', minWidth: 0, cursor: 'pointer', fontSize: 11,
    fontFamily: 'monospace', letterSpacing: 0.5, borderRadius: 4, textAlign: 'center',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    background: active ? '#17325a' : '#0d1424',
    border: `1px solid ${active ? '#3a8fd4' : '#1e2e48'}`,
    color: active ? '#e8f2ff' : '#6b7a90',
    fontWeight: active ? 700 : 400,
  }),
  body: { flex: 1, overflowY: 'auto', padding: 20 },
  heading: { color: '#666', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  input: { background: '#111', border: '1px solid #2a3a58', color: '#e0e0e0', padding: '6px 10px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, width: 180 },
  btn: (color = '#1a3a6a') => ({ background: color, border: 'none', color: '#e0e0e0', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }),
  danger: { background: '#4a1010', border: 'none', color: '#ff8888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  td: { padding: '4px 10px', borderBottom: '1px solid #1a1a2a', color: '#bbb' },
  tdKey: { padding: '4px 10px', borderBottom: '1px solid #1a1a2a', color: '#556', width: 140 },
  error: { color: '#f06060', fontSize: 12, marginTop: 6 },
  success: { color: '#60c060', fontSize: 12, marginTop: 6 },
  divider: { border: 'none', borderTop: '1px solid #1a2030', margin: '16px 0' },
  gameRow: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a2a' },
  tag: (c) => ({ background: c, color: '#fff', borderRadius: 3, padding: '1px 6px', fontSize: 10 }),
};

function useWrap() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { text, ok }
  const wrap = async (fn) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ text: e.message, ok: false }); } finally { setBusy(false); }
  };
  return { busy, msg, wrap, setMsg };
}

// Shared usernames list — loads up to 500 most-recently-seen usernames once
// and exposes them for autocomplete (datalist) and the browse chip list.
function useUsernames() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    trpc.admin.listUsers.query({ offset: 0, limit: 500 })
      .then(data => { setUsers(data.users); setTotal(data.total); })
      .catch(() => {});
  }, []);
  return { users, total };
}

// <datalist> source for browser-native autocomplete on username inputs.
// Rendered once per panel; multiple inputs can share the same id.
function UsernameDatalist({ id, users }) {
  return (
    <datalist id={id}>
      {users.map(u => <option key={u} value={u} />)}
    </datalist>
  );
}

// Compact filterable chip list — click to populate the username field.
// Used by both UserPanel and MissionsPanel.
function UsernameBrowser({ users, total, selected, onPick, busy }) {
  const [filter, setFilter] = useState('');
  const matches = filter
    ? users.filter(u => u.toLowerCase().includes(filter.toLowerCase()))
    : users;
  return (
    <div>
      <input
        style={{ ...S.input, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
        placeholder={`Filter ${total || users.length} user${(total || users.length) !== 1 ? 's' : ''}…`}
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8, maxHeight: 120, overflowY: 'auto', padding: 2 }}>
        {matches.slice(0, 200).map(u => (
          <button key={u} onClick={() => onPick(u)} disabled={busy}
            style={{
              background: selected === u ? '#1a3a6a' : '#0a1220',
              border: `1px solid ${selected === u ? '#3a6aaa' : '#2a3a58'}`,
              color: selected === u ? '#e0e0e0' : '#778',
              padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>
            {u}
          </button>
        ))}
        {matches.length === 0 && <span style={{ color: '#334', fontSize: 11 }}>no matches</span>}
        {matches.length > 200 && <span style={{ color: '#334', fontSize: 11 }}>… {matches.length - 200} more — refine filter</span>}
      </div>
    </div>
  );
}

const RARITY_COLOR = { common: '#778', rare: '#3a8fd4', epic: '#a060e0', legendary: '#e0a030' };

// Collapses an abilities array into [name, count] pairs. count > 1 is the
// signature of the game-over re-send bug (see core/player.ts mergeAbilities):
// the ability was earned once but re-saved on every subsequent game over.
const abilityCounts = (abilities) => {
  const m = new Map();
  for (const a of abilities ?? []) {
    const n = typeof a?.name === 'string' ? a.name : '(unnamed)';
    m.set(n, (m.get(n) ?? 0) + 1);
  }
  return [...m.entries()];
};

function UserPanel() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [roster, setRoster] = useState(null);
  const [pass, setPass] = useState(null);
  const [credits, setCredits] = useState('');
  const [freeDrafts, setFreeDrafts] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [repair, setRepair] = useState(null);
  const [clampStats, setClampStats] = useState(false);
  const [confirmRepair, setConfirmRepair] = useState(false);
  const { busy, msg, wrap, setMsg } = useWrap();
  const { users, total } = useUsernames();

  const load = (name) => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    setConfirmReset(false);
    setConfirmRepair(false);
    setRepair(null);
    setRoster(null);
    setPass(null);
    wrap(async () => {
      const [data, rosterData, passData] = await Promise.all([
        trpc.admin.getUser.query(target),
        trpc.admin.getUserRoster.query(target).catch(() => null),
        trpc.admin.getUserPass.query(target).catch(() => null),
      ]);
      // The server resolves "carol" -> "u/carol" (or vice versa) depending on
      // how the record was keyed. Adopt the canonical name it echoes back, so
      // the credit/reset buttons below write to the record we just loaded
      // instead of creating a phantom under the as-typed spelling.
      if (data?.username) setUsername(data.username);
      setUser(data);
      setRoster(rosterData);
      setPass(passData);
    });
  };

  const reload = async (name) => {
    const target = name ?? username.trim();
    const [data, rosterData, passData] = await Promise.all([
      trpc.admin.getUser.query(target),
      trpc.admin.getUserRoster.query(target).catch(() => null),
      trpc.admin.getUserPass.query(target).catch(() => null),
    ]);
    setUser(data);
    setRoster(rosterData);
    setPass(passData);
  };

  const restore = () => wrap(async () => {
    await trpc.admin.restoreEnergy.mutate(username.trim());
    await reload(); setMsg({ text: 'Energy restored.', ok: true });
  });

  const setC = () => wrap(async () => {
    const n = parseInt(credits);
    if (isNaN(n)) throw new Error('Enter a valid number');
    const delta = n - (user?.credits ?? 0);
    await trpc.admin.adjustCredits.mutate({ username: username.trim(), amount: delta, reason: 'admin:set' });
    await reload(); setMsg({ text: `Credits set to ${n}.`, ok: true });
  });

  const grantDrafts = () => wrap(async () => {
    const n = parseInt(freeDrafts);
    if (isNaN(n) || n < 1) throw new Error('Enter a positive number');
    await trpc.admin.grantFreeDrafts.mutate({ username: username.trim(), amount: n });
    await reload(); setMsg({ text: `Granted ${n} free draft(s).`, ok: true });
  });

  // Duplicate-ability repair. Same admin.repairPlayers endpoint the
  // `repairPlayers` debug command calls — dry-run reports, apply writes.
  const runRepair = (dryRun) => wrap(async () => {
    const report = await trpc.admin.repairPlayers.mutate({
      username: username.trim(), clampStats, dryRun,
    });
    setRepair(report);
    setConfirmRepair(false);
    if (!dryRun) await reload();
    setMsg({
      text: report.affected === 0
        ? `Scanned ${report.scanned} player(s) — nothing to repair.`
        : dryRun
          ? `${report.duplicatesRemoved} duplicate ability instance(s) on ${report.affected} player(s). Nothing written — press Repair to apply.`
          : `✓ Repaired ${report.affected} player(s) — removed ${report.duplicatesRemoved} duplicate(s).`,
      ok: true,
    });
  });

  const grantPass = (tier) => wrap(async () => {
    const result = await trpc.admin.grantPass.mutate({ username: username.trim(), tier });
    await reload();
    setMsg({
      text: `Granted ${tier.toUpperCase()} pass · +${(result.creditsGranted ?? 0).toLocaleString()} credits.`,
      ok: true,
    });
  });

  const revokePass = () => wrap(async () => {
    const result = await trpc.admin.revokePass.mutate(username.trim());
    await reload();
    setMsg({
      text: result.revokedTier
        ? `Revoked ${result.revokedTier.toUpperCase()} pass. Founder flag + granted credits preserved.`
        : 'No active pass to revoke.',
      ok: true,
    });
  });

  const retryFlair = () => wrap(async () => {
    const result = await trpc.admin.retryFlair.mutate(username.trim());
    await reload();
    setMsg({
      text: result.flairGranted
        ? '✓ FOUNDER flair applied.'
        : 'Flair write failed again — check server logs and r/lastdraftgame perms.',
      ok: result.flairGranted,
    });
  });

  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    wrap(async () => {
      await trpc.admin.resetUser.mutate(username.trim());
      setUser(null);
      setRoster(null);
      setMsg({ text: `✓ "${username}" has been reset. All data deleted.`, ok: true });
    });
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  return (
    <div>
      <div style={S.heading}>
        Users
        {total > 0 && <span style={{ color: '#445', marginLeft: 8 }}>{total} total</span>}
      </div>

      <UsernameBrowser users={users} total={total} selected={username}
        onPick={(u) => load(u)} busy={busy} />

      <UsernameDatalist id="admin-usernames" users={users} />
      <div style={{ ...S.row, marginBottom: 4 }}>
        <input data-testid="admin-user-input" style={S.input} placeholder="Reddit username" value={username}
          list="admin-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button data-testid="admin-user-load" style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
      </div>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}

      {user && (<>
        <table style={{ ...S.table, marginTop: 12 }}>
          <tbody>
            {[
              ['Credits', user.credits],
              ['Energy', `${user.energy} / 5`],
              ['Free Drafts', user.freeDrafts],
              ['Paid Picks', user.paidPicks ?? 0],
              ['Games Played', user.gamesPlayed],
              ['Credits Earned', user.creditsEarned],
              ['First Seen', fmt(user.firstSeen)],
              ['Last Seen', fmt(user.lastSeen)],
            ].map(([k, v]) => (
              <tr key={k}><td style={S.tdKey}>{k}</td><td style={S.td}>{String(v)}</td></tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...S.row, marginTop: 14 }}>
          <button style={S.btn('#1a4a2a')} onClick={restore} disabled={busy}>Restore Energy</button>
          {confirmReset
            ? <>
                <button style={{ ...S.danger, background: '#8a1010', color: '#fff', fontWeight: 'bold' }} onClick={reset} disabled={busy}>CONFIRM RESET</button>
                <button style={S.btn()} onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
            : <button style={S.danger} onClick={reset} disabled={busy}>Reset User</button>
          }
        </div>
        <div style={S.row}>
          <input data-testid="admin-credits-input" style={{ ...S.input, width: 100 }} placeholder="Credits" value={credits}
            onChange={e => setCredits(e.target.value)} type="number" />
          <button data-testid="admin-set-credits" style={S.btn('#4a3a1a')} onClick={setC} disabled={busy || !credits}>Set Credits</button>
        </div>
        <div style={S.row}>
          <input style={{ ...S.input, width: 100 }} placeholder="# Drafts" value={freeDrafts}
            onChange={e => setFreeDrafts(e.target.value)} type="number" />
          <button style={S.btn('#1a3a4a')} onClick={grantDrafts} disabled={busy || !freeDrafts}>Grant Free Drafts</button>
        </div>

        {/* Roster repair — strips duplicate abilities left behind by the
            game-over re-send bug, and (opt-in) clamps provably impossible stat
            bonuses. Scan is read-only; Repair writes and needs a confirm. */}
        <div style={{ ...S.row, marginTop: 4 }}>
          <button style={S.btn('#1a3a4a')} onClick={() => runRepair(true)} disabled={busy}>Scan Roster</button>
          {confirmRepair
            ? <>
                <button style={{ ...S.danger, background: '#8a1010', color: '#fff', fontWeight: 'bold' }}
                  onClick={() => runRepair(false)} disabled={busy}>CONFIRM REPAIR</button>
                <button style={S.btn()} onClick={() => setConfirmRepair(false)}>Cancel</button>
              </>
            : <button style={S.btn('#4a3a1a')} onClick={() => setConfirmRepair(true)} disabled={busy}>Repair Roster</button>
          }
          <label style={{ color: '#667', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={clampStats} onChange={e => setClampStats(e.target.checked)} />
            clamp stats
          </label>
        </div>

        {repair && (
          <div style={{ fontSize: 11, color: '#778', marginBottom: 8 }}>
            <span style={S.tag(repair.dryRun ? '#1a3a6a' : '#1a4a2a')}>{repair.dryRun ? 'DRY RUN' : 'APPLIED'}</span>
            {' '}scanned {repair.scanned} · affected {repair.affected} · dupes {repair.duplicatesRemoved}
            {repair.statsInflated > 0 && (
              <span style={{ color: '#e0a030' }}>
                {' '}· {repair.statsInflated} with impossible stat totals
                {!clampStats && ' (enable "clamp stats" to fix)'}
              </span>
            )}
            {repair.players?.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {repair.players.map(pl => (
                  <li key={pl.id}>
                    {pl.name} #{pl.id} — {pl.abilitiesBefore}→{pl.abilitiesAfter} abilities
                    {pl.duplicatesRemoved.length > 0 && ` (${pl.duplicatesRemoved.join(', ')})`}
                    {pl.statsInflated && ` · stats ${pl.statPoints}/${pl.statPointsMax}${pl.statsClamped ? ' clamped' : ''}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Founders Pass — admin grant / revoke. Mirrors core/battlePass.ts
            behavior: grant deposits credits + sets founder flag; revoke
            clears the season record but keeps credits & founder. */}
        <hr style={S.divider} />
        <div style={S.heading}>Founders Pass</div>
        <table style={{ ...S.table, marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={S.tdKey}>Current tier</td>
              <td style={S.td}>
                {pass?.tier
                  ? <span style={{ color: pass.tier === 'premium' ? '#c084ff' : '#19e6c4', fontWeight: 700 }}>
                      {pass.tier.toUpperCase()}
                    </span>
                  : <span style={{ color: '#556' }}>none</span>}
              </td>
            </tr>
            <tr>
              <td style={S.tdKey}>Purchased</td>
              <td style={S.td}>{pass?.purchasedAt ? fmt(pass.purchasedAt) : '—'}</td>
            </tr>
            <tr>
              <td style={S.tdKey}>Founder flag</td>
              <td style={S.td}>{pass?.founder ? '✓ lifetime' : '—'}</td>
            </tr>
            <tr>
              <td style={S.tdKey}>Reddit flair</td>
              <td style={S.td}>
                {pass?.tier == null
                  ? <span style={{ color: '#556' }}>—</span>
                  : pass?.flairGranted
                    ? <span style={{ color: '#19e6c4' }}>✓ FOUNDER applied</span>
                    : <span style={{ color: '#e0a030' }}>⚠ not applied (retry below)</span>}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...S.row, flexWrap: 'wrap' }}>
          <button style={S.btn('#1a4a4a')} onClick={() => grantPass('basic')}
            disabled={busy || pass?.tier === 'basic'}>Grant BASIC</button>
          <button style={S.btn('#3a1a5a')} onClick={() => grantPass('premium')}
            disabled={busy || pass?.tier === 'premium'}>Grant PREMIUM</button>
          <button style={S.danger} onClick={revokePass}
            disabled={busy || !pass?.tier}>Revoke</button>
          {pass?.tier && !pass?.flairGranted && (
            <button style={S.btn('#4a3a1a')} onClick={retryFlair} disabled={busy}>
              Retry Flair
            </button>
          )}
        </div>

        {roster !== null && (<>
          <hr style={S.divider} />
          <div style={S.heading}>Roster ({roster.length} player{roster.length !== 1 ? 's' : ''})</div>
          {roster.length === 0
            ? <div style={{ color: '#333', fontSize: 12 }}>No players</div>
            : <table style={{ ...S.table, marginTop: 6 }}>
                <thead>
                  <tr>
                    {['Pos', 'Name', 'Rarity', 'Lvl', 'SPD', 'DEX', 'JMP', 'ACC'].map(h => (
                      <td key={h} style={{ ...S.tdKey, color: '#445', width: 'auto', padding: '3px 6px' }}>{h}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map(p => {
                    const bs = p.statBonuses ?? {};
                    const abilities = abilityCounts(p.abilities);
                    const hasDupes = abilities.some(([, n]) => n > 1);
                    return (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td style={{ ...S.td, padding: '3px 6px', color: '#556', borderBottom: 'none' }}>{p.lineupRole ?? '—'}</td>
                          <td style={{ ...S.td, padding: '3px 6px', borderBottom: 'none' }}>{p.name}</td>
                          <td style={{ ...S.td, padding: '3px 6px', borderBottom: 'none', color: RARITY_COLOR[p.rarity] ?? '#778' }}>{p.rarity}</td>
                          <td style={{ ...S.td, padding: '3px 6px', borderBottom: 'none' }}>{p.level}</td>
                          {['spd', 'dex', 'jmp', 'acc'].map(s => (
                            <td key={s} style={{ ...S.td, padding: '3px 6px', borderBottom: 'none' }}>
                              {p[s]}{bs[s] ? <span style={{ color: '#4a8' }}>+{bs[s]}</span> : ''}
                            </td>
                          ))}
                        </tr>
                        {/* Abilities live on their own full-width row: the table
                            is 8 columns inside a 560px panel, so a 9th column
                            would squeeze the stats to unreadable. A red ×N
                            badge is the visible tell for the duplicate bug. */}
                        <tr>
                          <td colSpan={8} style={{ ...S.td, padding: '0 6px 4px 6px', fontSize: 11 }}>
                            {abilities.length === 0
                              ? <span style={{ color: '#334' }}>no abilities</span>
                              : <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                                  {abilities.map(([name, n]) => (
                                    <span key={name} style={{
                                      background: n > 1 ? '#3a1010' : '#141c2e',
                                      border: `1px solid ${n > 1 ? '#8a3030' : '#22304a'}`,
                                      color: n > 1 ? '#ff9090' : '#8a9ab0',
                                      borderRadius: 3, padding: '1px 6px',
                                    }}>
                                      {name}{n > 1 && <b style={{ color: '#ff6060' }}> ×{n}</b>}
                                    </span>
                                  ))}
                                </span>
                            }
                            {hasDupes && <span style={{ color: '#ff6060', marginLeft: 6 }}>⚠ duplicates</span>}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
          }
        </>)}
      </>)}
    </div>
  );
}

function GamesPanel() {
  const [pending, setPending] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const { busy, msg, wrap, setMsg } = useWrap();

  const load = () => wrap(async () => {
    const [p, f] = await Promise.all([
      trpc.admin.getPendingGames.query(50),
      trpc.admin.getFlaggedGames.query(50),
    ]);
    setPending(p); setFlagged(f);
  });

  const approve = (id) => wrap(async () => {
    await trpc.admin.approveGame.mutate(id);
    setPending(prev => prev.filter(g => g !== id));
    setFlagged(prev => prev.filter(g => g !== id));
    setMsg({ text: `Game #${id} approved.`, ok: true });
  });

  const reject = (id) => wrap(async () => {
    await trpc.admin.rejectGame.mutate(id);
    setPending(prev => prev.filter(g => g !== id));
    setFlagged(prev => prev.filter(g => g !== id));
    setMsg({ text: `Game #${id} rejected.`, ok: true });
  });

  const GameList = ({ games, label, color }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...S.row, marginBottom: 6 }}>
        <span style={S.tag(color)}>{label}</span>
        <span style={{ color: '#444', fontSize: 11 }}>{games.length} game{games.length !== 1 ? 's' : ''}</span>
      </div>
      {games.length === 0
        ? <div style={{ color: '#333', fontSize: 12 }}>empty</div>
        : games.map(id => (
          <div key={id} style={S.gameRow}>
            <span style={{ color: '#778', fontSize: 12, flex: 1 }}>#{id}</span>
            <button style={S.btn('#1a4a2a')} onClick={() => approve(id)} disabled={busy}>Approve</button>
            <button style={S.danger} onClick={() => reject(id)} disabled={busy}>Reject</button>
          </div>
        ))
      }
    </div>
  );

  return (
    <div>
      <div style={S.heading}>Game Review Queues</div>
      <button style={S.btn()} onClick={load} disabled={busy}>Load Queues</button>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      {pending !== null && (
        <div style={{ marginTop: 14 }}>
          <GameList games={pending} label="PENDING" color="#1a5a1a" />
          <GameList games={flagged} label="FLAGGED" color="#5a1a1a" />
        </div>
      )}
    </div>
  );
}

function AdminsPanel() {
  const [admins, setAdmins] = useState(null);
  const [addInput, setAddInput] = useState('');
  const [removeInput, setRemoveInput] = useState('');
  const { busy, msg, wrap, setMsg } = useWrap();

  const load = () => wrap(async () => {
    const data = await trpc.admin.getAdmins.query();
    setAdmins(data);
  });

  const add = () => wrap(async () => {
    await trpc.admin.addAdmin.mutate(addInput.trim());
    setAddInput('');
    const data = await trpc.admin.getAdmins.query();
    setAdmins(data); setMsg({ text: `Added ${addInput.trim()}.`, ok: true });
  });

  const remove = () => wrap(async () => {
    if (!window.confirm(`Remove admin "${removeInput}"?`)) return;
    await trpc.admin.removeAdmin.mutate(removeInput.trim());
    setRemoveInput('');
    const data = await trpc.admin.getAdmins.query();
    setAdmins(data); setMsg({ text: `Removed ${removeInput.trim()}.`, ok: true });
  });

  const fmt = (ts) => ts ? new Date(ts).toLocaleDateString() : '—';

  return (
    <div>
      <div style={S.heading}>Admin List</div>
      <button style={S.btn()} onClick={load} disabled={busy}>Load Admins</button>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      {admins !== null && (
        <table style={{ ...S.table, marginTop: 12 }}>
          <thead>
            <tr>
              <td style={{ ...S.tdKey, color: '#445' }}>Username</td>
              <td style={{ ...S.td, color: '#445' }}>Granted</td>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0
              ? <tr><td colSpan={2} style={{ ...S.td, color: '#333' }}>No admins</td></tr>
              : admins.map(a => (
                <tr key={a.username}>
                  <td style={S.tdKey}>{a.username}</td>
                  <td style={S.td}>{fmt(a.grantedAt)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      )}
      <hr style={S.divider} />
      <div style={S.row}>
        <input style={S.input} placeholder="Username to add" value={addInput}
          onChange={e => setAddInput(e.target.value)} />
        <button style={S.btn('#1a4a2a')} onClick={add} disabled={busy || !addInput.trim()}>Add Admin</button>
      </div>
      <div style={S.row}>
        <input style={S.input} placeholder="Username to remove" value={removeInput}
          onChange={e => setRemoveInput(e.target.value)} />
        <button style={S.danger} onClick={remove} disabled={busy || !removeInput.trim()}>Remove Admin</button>
      </div>
    </div>
  );
}

function CatalogEditor() {
  const [data, setData] = useState(null); // { catalog, defaults }
  const [edits, setEdits] = useState({}); // { [id]: { label, sub, reward, total, accent } }
  const { busy, msg, wrap, setMsg } = useWrap();

  const load = () => wrap(async () => {
    const fresh = await trpc.admin.getMissionCatalog.query();
    setData(fresh);
    setEdits({});
  });

  useEffect(() => { load(); }, []);

  const startEdit = (m) => setEdits(e => ({ ...e, [m.id]: { ...m } }));
  const cancelEdit = (id) => setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  const patchEdit = (id, field, v) => setEdits(e => ({ ...e, [id]: { ...e[id], [field]: v } }));

  const saveEdit = (m) => wrap(async () => {
    const draft = edits[m.id];
    const updates = {
      id: m.id,
      label: draft.label,
      sub: draft.sub,
      reward: Number(draft.reward),
      total: Number(draft.total),
      accent: draft.accent,
    };
    await trpc.admin.updateMissionDef.mutate(updates);
    cancelEdit(m.id);
    await load();
    setMsg({ text: `Saved ${m.id}.`, ok: true });
  });

  const moveMission = (id, toType) => wrap(async () => {
    await trpc.admin.moveMissionType.mutate({ id, toType });
    await load();
    setMsg({ text: `Moved ${id} → ${toType}.`, ok: true });
  });

  const resetCatalog = () => wrap(async () => {
    if (!window.confirm('Reset the global mission catalog to defaults? Per-user progress is not affected.')) return;
    await trpc.admin.resetMissionCatalog.mutate();
    await load();
    setMsg({ text: 'Catalog reset to defaults.', ok: true });
  });

  if (!data) return <div style={{ color: '#556' }}>Loading catalog…</div>;

  const renderRow = (m, type) => {
    const draft = edits[m.id];
    if (draft) {
      return (
        <tr key={m.id}>
          <td style={{ ...S.td, verticalAlign: 'top' }} colSpan={2}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#556', fontSize: 10 }}>ID</span>
              <span style={{ color: '#aab', fontSize: 11 }}>{m.id}</span>
              <span style={{ color: '#556', fontSize: 10 }}>Label</span>
              <input style={{ ...S.input, width: '100%' }} value={draft.label} onChange={e => patchEdit(m.id, 'label', e.target.value)} />
              <span style={{ color: '#556', fontSize: 10 }}>Sub</span>
              <input style={{ ...S.input, width: '100%' }} value={draft.sub} onChange={e => patchEdit(m.id, 'sub', e.target.value)} />
              <span style={{ color: '#556', fontSize: 10 }}>Reward</span>
              <input type="number" style={{ ...S.input, width: 90 }} value={draft.reward} onChange={e => patchEdit(m.id, 'reward', e.target.value)} />
              <span style={{ color: '#556', fontSize: 10 }}>Total</span>
              <input type="number" style={{ ...S.input, width: 90 }} value={draft.total} onChange={e => patchEdit(m.id, 'total', e.target.value)} />
              <span style={{ color: '#556', fontSize: 10 }}>Accent</span>
              <select style={{ ...S.input, width: 120 }} value={draft.accent} onChange={e => patchEdit(m.id, 'accent', e.target.value)}>
                <option value="cyan">cyan</option>
                <option value="magenta">magenta</option>
                <option value="gold">gold</option>
                <option value="ink">ink</option>
              </select>
            </div>
            <div style={{ ...S.row, marginTop: 8, marginBottom: 0 }}>
              <button style={S.btn('#1a4a2a')} onClick={() => saveEdit(m)} disabled={busy}>Save</button>
              <button style={S.btn()} onClick={() => cancelEdit(m.id)} disabled={busy}>Cancel</button>
            </div>
          </td>
        </tr>
      );
    }
    return (
      <tr key={m.id}>
        <td style={{ ...S.tdKey }}>
          <div style={{ color: '#cde', fontWeight: 700 }}>{m.label}</div>
          <div style={{ color: '#556', fontSize: 10, marginTop: 2 }}>{m.id} · +{m.reward}CR · {m.total}× · {m.accent}</div>
          <div style={{ color: '#556', fontSize: 10, marginTop: 1 }}>{m.sub}</div>
        </td>
        <td style={{ ...S.td }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btn(), padding: '4px 10px', fontSize: 11 }} onClick={() => startEdit(m)} disabled={busy}>Edit</button>
            {type === 'daily' ? (
              <button style={{ ...S.btn('#4a3a1a'), padding: '4px 10px', fontSize: 11 }}
                onClick={() => moveMission(m.id, 'weekly')} disabled={busy}>
                → Weekly
              </button>
            ) : (
              <button style={{ ...S.btn('#1a4a3a'), padding: '4px 10px', fontSize: 11 }}
                onClick={() => moveMission(m.id, 'daily')} disabled={busy}>
                → Daily
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <div style={S.heading}>Global Mission Catalog</div>
        <button style={S.danger} onClick={resetCatalog} disabled={busy}>Reset to defaults</button>
      </div>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      <div style={{ ...S.heading, color: '#7aaff0', marginTop: 12, marginBottom: 6 }}>DAILY (recurring)</div>
      <table style={S.table}><tbody>{data.catalog.daily.map(m => renderRow(m, 'daily'))}</tbody></table>
      <div style={{ ...S.heading, color: '#7aaff0', marginTop: 16, marginBottom: 6 }}>WEEKLY</div>
      <table style={S.table}><tbody>{data.catalog.weekly.map(m => renderRow(m, 'weekly'))}</tbody></table>
    </div>
  );
}

function MissionsPanel() {
  const [username, setUsername] = useState('');
  const [missions, setMissions] = useState(null); // { daily, weekly }
  const [editProg, setEditProg] = useState({});   // { [missionId]: string }
  const { busy, msg, wrap, setMsg } = useWrap();
  const { users, total } = useUsernames();

  const load = (name) => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    wrap(async () => {
      const data = await trpc.admin.getUserMissions.query(target);
      setMissions(data);
      setEditProg({});
    });
  };

  const reload = () => trpc.admin.getUserMissions.query(username.trim()).then(setMissions).catch(() => {});

  const resetAll = () => wrap(async () => {
    if (!window.confirm(`Reset ALL current-period missions for "${username}"? They'll be able to complete and re-claim everything this period.`)) return;
    await trpc.admin.resetUserMissions.mutate(username.trim());
    await reload();
    setMsg({ text: `Reset missions for ${username}.`, ok: true });
  });

  const setProgress = (type, missionId) => wrap(async () => {
    const raw = editProg[missionId];
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) { setMsg({ text: 'Enter a non-negative integer.', ok: false }); return; }
    await trpc.admin.setMissionProgress.mutate({ username: username.trim(), type, missionId, progress: n });
    setEditProg(p => ({ ...p, [missionId]: '' }));
    await reload();
    setMsg({ text: `Set ${missionId} → ${n}.`, ok: true });
  });

  const complete = (type, missionId) => wrap(async () => {
    const result = await trpc.admin.completeMission.mutate({ username: username.trim(), type, missionId });
    await reload();
    setMsg({
      text: result.awarded
        ? `Completed ${missionId} and awarded credits.`
        : `${missionId} already awarded this period; progress maxed.`,
      ok: true,
    });
  });

  const renderGroup = (type, rows) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...S.heading, color: '#7aaff0', marginBottom: 8 }}>{type.toUpperCase()}</div>
      <table style={S.table}>
        <tbody>
          {rows.map(m => {
            const pct = Math.min(100, Math.round((m.progress / m.total) * 100));
            return (
              <tr key={m.id}>
                <td style={{ ...S.tdKey, color: '#88a' }}>
                  <div style={{ color: '#cde', fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: '#556', fontSize: 10, marginTop: 2 }}>{m.id} · +{m.reward}CR</div>
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 80, height: 6, background: '#1a2030', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: m.awarded ? '#5bf2d4' : '#3a8fd4' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#aab', minWidth: 36, textAlign: 'right' }}>
                      {m.progress}/{m.total}
                    </span>
                    {m.awarded && <span style={{ ...S.tag('#1a4a3a'), color: '#5bf2d4' }}>AWARDED</span>}
                  </div>
                  <div style={{ ...S.row, marginTop: 6, marginBottom: 0, gap: 6 }}>
                    <input
                      style={{ ...S.input, width: 60, padding: '4px 8px', fontSize: 11 }}
                      placeholder="N"
                      type="number"
                      value={editProg[m.id] ?? ''}
                      onChange={e => setEditProg(p => ({ ...p, [m.id]: e.target.value }))}
                    />
                    <button style={{ ...S.btn(), padding: '4px 10px', fontSize: 11 }}
                      onClick={() => setProgress(type, m.id)} disabled={busy || (editProg[m.id] ?? '') === ''}>
                      Set
                    </button>
                    <button style={{ ...S.btn('#1a4a2a'), padding: '4px 10px', fontSize: 11 }}
                      onClick={() => complete(type, m.id)} disabled={busy || m.awarded}>
                      Complete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <CatalogEditor />
      <hr style={S.divider} />
      <div style={S.heading}>
        User Missions
        {total > 0 && <span style={{ color: '#445', marginLeft: 8 }}>{total} total</span>}
      </div>
      <UsernameBrowser users={users} total={total} selected={username}
        onPick={(u) => load(u)} busy={busy} />
      <UsernameDatalist id="admin-mission-usernames" users={users} />
      <div style={S.row}>
        <input data-testid="admin-mission-user-input" style={S.input} placeholder="Reddit username" value={username}
          list="admin-mission-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button data-testid="admin-mission-user-load" style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
        {missions && (
          <button style={S.danger} onClick={resetAll} disabled={busy}>Reset All (current period)</button>
        )}
      </div>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      {missions && (
        <div style={{ marginTop: 14 }}>
          {renderGroup('daily', missions.daily)}
          {renderGroup('weekly', missions.weekly)}
        </div>
      )}
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────
// Create/delete announcements. They surface in the notification bell
// (tag/title/sub) and on the Featured Events page (with the body details).
const ANN_ACCENTS = ['cyan', 'magenta', 'gold'];
const ANN_ACCENT_COLORS = { cyan: '#19e6c4', magenta: '#ff3da0', gold: '#ffc94a' };

function AnnouncementsPanel() {
  const [list, setList] = useState([]);
  const [tag, setTag] = useState('NEWS');
  const [accent, setAccent] = useState('cyan');
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [body, setBody] = useState('');
  const { busy, msg, wrap, setMsg } = useWrap();

  const load = () => trpc.announcements.list.query({ limit: 20 }).then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = () => wrap(async () => {
    if (!title.trim() || !sub.trim()) throw new Error('Title and subtitle are required');
    await trpc.admin.createAnnouncement.mutate({
      tag: tag.trim() || 'NEWS',
      accent,
      title: title.trim(),
      sub: sub.trim(),
      body: body.trim() || undefined,
    });
    setTitle(''); setSub(''); setBody('');
    setMsg({ text: 'Announcement published', ok: true });
    await load();
  });

  const remove = (id) => wrap(async () => {
    await trpc.admin.deleteAnnouncement.mutate({ id });
    await load();
  });

  return (
    <div>
      <div style={S.heading}>New announcement</div>
      <div style={S.row}>
        <input style={{ ...S.input, width: 90 }} placeholder="Tag" maxLength={12} value={tag}
          onChange={e => setTag(e.target.value.toUpperCase())} />
        {ANN_ACCENTS.map(a => (
          <button key={a} onClick={() => setAccent(a)} disabled={busy}
            style={{
              background: accent === a ? '#10203a' : '#0a1220',
              border: `1px solid ${accent === a ? ANN_ACCENT_COLORS[a] : '#2a3a58'}`,
              color: ANN_ACCENT_COLORS[a], padding: '5px 12px', borderRadius: 4,
              cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
            }}>
            {a}
          </button>
        ))}
      </div>
      <div style={S.row}>
        <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} placeholder="Title (shown in bell + events page)"
          maxLength={64} value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div style={S.row}>
        <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} placeholder="Subtitle (one-liner)"
          maxLength={120} value={sub} onChange={e => setSub(e.target.value)} />
      </div>
      <div style={S.row}>
        <textarea style={{ ...S.input, width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical' }}
          placeholder="Details (optional — shown on the Events page only)"
          maxLength={600} value={body} onChange={e => setBody(e.target.value)} />
      </div>
      <button style={S.btn('#1a4a2a')} onClick={create} disabled={busy || !title.trim() || !sub.trim()}>
        Publish announcement
      </button>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}

      <hr style={S.divider} />
      <div style={S.heading}>Live announcements ({list.length})</div>
      {list.length === 0 && <div style={{ color: '#556', fontSize: 12 }}>None yet.</div>}
      {list.map(a => (
        <div key={a.id} style={S.gameRow}>
          <span style={S.tag(ANN_ACCENT_COLORS[a.accent] ?? '#3a8fd4')}>{a.tag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#dde', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
            <div style={{ color: '#667', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</div>
          </div>
          <span style={{ color: '#445', fontSize: 10, flex: 'none' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
          <button style={S.danger} onClick={() => remove(a.id)} disabled={busy}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Push notifications ────────────────────────────────────
// Compose + send a push notification via @devvit/notifications, and inspect
// who has opted in. Platform rules worth remembering while using this:
//   · unpublished app → you can ONLY notify yourself ("Just me" audience)
//   · published app   → 2 per user per day, 25K per app per day
//   · title/body accept Mustache; {{name}} is filled with each recipient's
//     username automatically (see core/notifications.ts → send()).
const NOTIF_AUDIENCES = [
  { id: 'all',       label: 'All opted-in' },
  { id: 'usernames', label: 'Specific users' },
  { id: 'self',      label: 'Just me (test)' },
];

function NotificationsPanel() {
  const [aud, setAud] = useState(null);        // { users, total, pluginCount, error }
  const [log, setLog] = useState([]);
  const [audience, setAudience] = useState('self');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [names, setNames] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const [result, setResult] = useState(null);
  const { busy, msg, wrap, setMsg } = useWrap();
  const { users } = useUsernames();

  const load = () => {
    trpc.admin.notifyAudience.query({ limit: 200 }).then(setAud).catch(() => {});
    trpc.admin.notifySendLog.query({ limit: 10 }).then(setLog).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const parsedNames = names.split(/[\s,]+/).map(n => n.trim().replace(/^u\//i, '')).filter(Boolean);
  const recipientCount = audience === 'self'
    ? 1
    : audience === 'usernames'
      ? parsedNames.length
      : (aud?.users?.filter(u => u.userId).length ?? 0);

  const send = () => {
    // Sending to the whole opted-in list is irreversible and rate-limited —
    // make it a two-press action.
    if (audience === 'all' && !confirmAll) { setConfirmAll(true); return; }
    setConfirmAll(false);
    wrap(async () => {
      setResult(null);
      const res = await trpc.admin.notifySend.mutate({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || undefined,
        audience,
        usernames: audience === 'usernames' ? parsedNames : undefined,
      });
      setResult(res);
      setMsg({
        text: `Queued ${res.successCount}/${res.requested}${res.failureCount ? ` · ${res.failureCount} failed` : ''}.`,
        ok: res.failureCount === 0,
      });
      load();
    });
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';
  const canSend = !!title.trim() && !!body.trim() && recipientCount > 0;

  return (
    <div>
      <div style={S.heading}>Audience</div>
      <table style={{ ...S.table, marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={S.tdKey}>Opted in (tracked)</td>
            <td style={S.td}>{aud ? aud.total : '…'}</td>
          </tr>
          <tr>
            <td style={S.tdKey}>Opted in (Reddit)</td>
            <td style={S.td}>
              {aud?.pluginCount != null
                ? aud.pluginCount
                : <span style={{ color: '#e0a030' }}>unavailable{aud?.error ? ` — ${aud.error}` : ''}</span>}
            </td>
          </tr>
        </tbody>
      </table>
      {aud && aud.pluginCount != null && aud.pluginCount !== aud.total && (
        <div style={{ color: '#e0a030', fontSize: 11, marginBottom: 8 }}>
          ⚠ Counts differ — users opted in via Reddit settings (or before this
          feature shipped) aren't in our username map and can't be targeted by name.
        </div>
      )}
      {aud?.users?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, maxHeight: 90, overflowY: 'auto', padding: 2 }}>
          {aud.users.map(u => (
            <span key={u.username} title={`${u.userId || 'no id'} · ${fmt(u.optedInAt)}`}
              style={{
                background: '#0a1220', border: `1px solid ${u.userId ? '#2a3a58' : '#4a3a1a'}`,
                color: u.userId ? '#778' : '#e0a030', padding: '3px 10px', borderRadius: 12, fontSize: 11,
              }}>
              {u.username}
            </span>
          ))}
        </div>
      )}

      <hr style={S.divider} />
      <div style={S.heading}>New push notification</div>
      <div style={S.row}>
        {NOTIF_AUDIENCES.map(a => (
          <button key={a.id} onClick={() => { setAudience(a.id); setConfirmAll(false); }} disabled={busy}
            style={{
              background: audience === a.id ? '#10203a' : '#0a1220',
              border: `1px solid ${audience === a.id ? '#3a8fd4' : '#2a3a58'}`,
              color: audience === a.id ? '#cde' : '#778', padding: '5px 12px', borderRadius: 4,
              cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
            }}>
            {a.label}{a.id === 'all' && aud ? ` (${aud.total})` : ''}
          </button>
        ))}
      </div>
      {audience === 'usernames' && (<>
        <UsernameDatalist id="admin-notify-usernames" users={users} />
        <div style={S.row}>
          <textarea style={{ ...S.input, width: '100%', boxSizing: 'border-box', minHeight: 48, resize: 'vertical' }}
            placeholder="usernames, comma or space separated"
            value={names} onChange={e => setNames(e.target.value)} />
        </div>
      </>)}
      <div style={S.row}>
        <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }}
          placeholder="Title — Mustache ok, e.g. Hello {{name}}!"
          maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div style={S.row}>
        <textarea style={{ ...S.input, width: '100%', boxSizing: 'border-box', minHeight: 56, resize: 'vertical' }}
          placeholder="Body — e.g. Your challenge got 3 new plays"
          maxLength={300} value={body} onChange={e => setBody(e.target.value)} />
      </div>
      <div style={S.row}>
        <input style={{ ...S.input, width: 220 }} placeholder="Link t3_… (default: this post)"
          value={link} onChange={e => setLink(e.target.value)} />
        <span style={{ color: '#445', fontSize: 11 }}>{recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</span>
      </div>
      <div style={S.row}>
        {confirmAll
          ? <>
              <button style={{ ...S.danger, background: '#8a1010', color: '#fff', fontWeight: 'bold' }}
                onClick={send} disabled={busy}>CONFIRM SEND TO {recipientCount}</button>
              <button style={S.btn()} onClick={() => setConfirmAll(false)}>Cancel</button>
            </>
          : <button style={S.btn('#1a4a2a')} onClick={send} disabled={busy || !canSend}>
              {busy ? 'Sending…' : 'Send notification'}
            </button>
        }
      </div>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      {result?.unknown?.length > 0 && (
        <div style={{ color: '#e0a030', fontSize: 11, marginTop: 4 }}>
          Skipped (unknown to this app): {result.unknown.join(', ')}
        </div>
      )}
      {result?.error && (
        <div style={{ ...S.error, fontSize: 11 }}>{result.error}</div>
      )}

      <hr style={S.divider} />
      <div style={S.heading}>Recent sends ({log.length})</div>
      {log.length === 0 && <div style={{ color: '#556', fontSize: 12 }}>None yet.</div>}
      {log.map(e => (
        <div key={e.id} style={S.gameRow}>
          <span style={S.tag(e.failureCount ? '#5a1a1a' : '#1a4a2a')}>
            {e.successCount}/{e.requested}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#dde', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
            <div style={{ color: '#667', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.audience} · by {e.by} · {e.link}
            </div>
            {e.error && <div style={{ color: '#f06060', fontSize: 10 }}>{e.error}</div>}
          </div>
          <span style={{ color: '#445', fontSize: 10, flex: 'none' }}>{fmt(e.sentAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Post-view splash switch ───────────────────────────────────────────────
// GLOBAL: writes the redis-backed setting in server/core/inlineSplash.ts, so
// picking a variant here changes what EVERY player sees in the feed/post view.
// Not a boolean, so it is not part of the feature-flag list, but it is the same
// kind of live operator control and sits in the same tab.
//
// It is not a fetch on the render path: the client caches the answer in
// localStorage and paints that synchronously on each impression. See
// splashConfig.js. That means an open post view swaps as soon as it hears about
// the change, and a cold feed impression is correct with zero added latency.
const SPLASH_META = {
  classic: {
    label: 'Classic splash',
    desc: 'Original galaxy backdrop + bubble court. The pre-existing post view.',
  },
  court: {
    label: 'Live court',
    desc: 'WOLVES vs HAWKS attract loop running the real match sim, with special-move cards.',
  },
};

function SplashSwitch() {
  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';
  // Server truth (what everyone gets) + this device's resolved view of it.
  const [server, setServer] = useState(null);   // null = loading
  const [local, setLocal] = useState(() => describeSplash());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => trpc.admin.getInlineSplash.query()
    .then((d) => {
      setServer(d);
      // Keep this device's cache honest with what we just read.
      applyGlobalSplash(d.override ?? null);
      setErr(null);
    })
    .catch((e) => setErr(e?.message || String(e)));

  useEffect(() => { load(); }, []);
  // Reflect local changes (the `splash` debug command, another tab).
  useEffect(() => subscribeSplash(() => setLocal(describeSplash())), []);

  const pick = async (v) => {
    setErr(null);
    setBusy(true);
    try {
      const next = await trpc.admin.setInlineSplash.mutate({ variant: v });
      setServer((prev) => ({ ...(prev || {}), ...next }));
      // Push it into this document immediately so an open post view swaps now
      // instead of on its next impression.
      applyGlobalSplash(next.override ?? null);
      setLocal(describeSplash());
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearDeviceOverride = () => {
    setErr(null);
    try { setSplashOverride(null); } catch (e) { setErr(e.message); }
    setLocal(describeSplash());
  };

  if (!server) {
    return (
      <div data-testid="admin-splash-switch">
        <div style={S.heading}>Post view splash — everyone</div>
        {err
          ? <div style={S.error}>Failed to load splash setting: {err}</div>
          : <span style={{ color: '#556', fontSize: 12 }}>loading splash setting…</span>}
      </div>
    );
  }

  return (
    <div data-testid="admin-splash-switch">
      <div style={S.heading}>Post view splash — everyone</div>
      <div style={{ color: '#445', fontSize: 11, marginBottom: 12 }}>
        Swaps what the feed/post view renders for <b style={{ color: '#8a9ab0' }}>all players</b>.
        Takes effect on the next feed impression, and immediately on any post
        view that is already open. No redeploy.
      </div>

      {/* The "admin flipped it and nothing happened" trap: a leftover device
          override from the `splash` debug command wins over the global value on
          THIS device, so the admin's own post view would not move. Say so. */}
      {local.override && (
        <div style={{ border: '1px solid #6a5a1a', background: '#241f0d', borderRadius: 6, padding: 10, marginBottom: 10 }}>
          <div data-testid="splash-mask-warning" style={{ color: '#e0c060', fontSize: 11, lineHeight: 1.45 }}>
            This device has a local override (<code>{local.override}</code>) from the
            <code style={{ margin: '0 4px' }}>splash</code> debug command. Your own post
            view shows that, not the global setting{server.applied !== local.override ? ` (${server.applied})` : ''}.
            Other players are unaffected.
          </div>
          <button data-testid="splash-clear" onClick={clearDeviceOverride}
            style={{ ...S.btn('#4a3a10'), marginTop: 8 }}>
            Clear local override
          </button>
        </div>
      )}

      {SPLASH_VARIANTS.map(v => {
        const on = server.applied === v;
        const meta = SPLASH_META[v] ?? { label: v, desc: '' };
        return (
          <div key={v} style={{ border: `1px solid ${on ? '#2a4a70' : '#1a2030'}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span data-testid={`splash-state-${v}`} data-on={on ? '1' : '0'}
                style={S.tag(on ? '#1c5c2c' : '#333c4c')}>
                {on ? 'LIVE' : 'off'}
              </span>
              <span style={{ color: '#ccd', fontSize: 12 }}>{meta.label}</span>
              <code style={{ color: '#445', fontSize: 10 }}>{v}</code>
              <div style={{ flex: 1 }} />
              <button data-testid={`splash-pick-${v}`} disabled={on || busy}
                onClick={() => pick(v)}
                style={(on || busy) ? { ...S.btn('#10203a'), color: '#556', cursor: 'default' } : S.btn('#1a3a6a')}>
                {on ? 'Showing' : busy ? '…' : 'Show everyone'}
              </button>
            </div>
            <div style={{ color: on ? '#6a8' : '#667', fontSize: 11, lineHeight: 1.4 }}>{meta.desc}</div>
          </div>
        );
      })}

      <div style={{ ...S.row, marginBottom: 0 }}>
        <span data-testid="splash-source" style={{ color: '#556', fontSize: 11, flex: 1 }}>
          everyone: <b style={{ color: '#8a9ab0' }}>{server.applied}</b>
          {' · '}
          {server.override
            ? <>set by u/{server.admin || '?'}{server.at ? ` · ${fmt(server.at)}` : ''}</>
            : <>following shipped default</>}
        </span>
        {/* S.btn() has no :disabled styling, so a disabled reset button looked
            identical to an actionable one. Mute it when there's nothing to reset. */}
        <button data-testid="splash-follow-default" disabled={!server.override || busy}
          style={(server.override && !busy)
            ? S.btn()
            : { ...S.btn('#0d1424'), color: '#39435a', cursor: 'default' }}
          onClick={() => pick(null)}>
          Follow shipped default
        </button>
      </div>
      {err && <div style={S.error}>{err}</div>}

      {server.log?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#445', fontSize: 11, marginBottom: 4 }}>Recent changes</div>
          {server.log.slice(0, 5).map((e, i) => (
            <div key={i} style={{ color: '#556', fontSize: 10 }}>
              {fmt(e.at)} · u/{e.admin} → {e.variant ?? 'shipped default'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Paid draft pricing ────────────────────────────────────────────────────
// GLOBAL: writes the redis-backed config in server/core/draftPricing.ts, so
// changing a number here changes what EVERY player pays for their next paid
// draft pick. No redeploy.
//
// The preview table is computed with the SAME tiersFor() the server charges
// with (shared/draftPricing.ts) — so what an operator sees before saving is
// exactly what players will be billed, not a re-implementation of the curve.
//
// A BLANK input means "follow the shipped default" rather than 0. The default
// shows as the placeholder, so an operator can always see what they're
// falling back to, and clearing a box is how you un-override one field.
function DraftPricingPanel() {
  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';
  const [server, setServer] = useState(null);   // null = loading
  const [draft, setDraft] = useState({ firstCost: '', stepPct: '', roundTo: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  // Seed the inputs from the OVERRIDES only. Fields following the default stay
  // blank, so hitting Save doesn't silently pin a default value as an explicit
  // override (which would then stop tracking future default changes).
  const seed = (d) => setDraft({
    firstCost: d.override?.firstCost != null ? String(d.override.firstCost) : '',
    stepPct: d.override?.stepPct != null ? String(d.override.stepPct) : '',
    roundTo: d.override?.roundTo != null ? String(d.override.roundTo) : '',
  });

  const load = () => trpc.admin.getDraftPricing.query()
    .then((d) => { setServer(d); seed(d); setErr(null); })
    .catch((e) => setErr(e?.message || String(e)));

  useEffect(() => { load(); }, []);

  // Per-field validation. Blank is always valid (= follow default); anything
  // else must parse to an integer inside the bounds the server enforces.
  const fieldErr = (f) => {
    const raw = draft[f].trim();
    if (raw === '') return null;
    if (!/^-?\d+$/.test(raw)) return 'whole number';
    const b = (server?.bounds || DRAFT_PRICING_BOUNDS)[f];
    const n = Number(raw);
    if (n < b.min || n > b.max) return b.min + '–' + b.max;
    return null;
  };
  const errs = DRAFT_PRICING_FIELDS.map(fieldErr);
  const anyErr = errs.some(Boolean);

  // What the ladder WOULD be if saved: parsed value where valid, else default.
  const effective = server ? DRAFT_PRICING_FIELDS.reduce((acc, f) => {
    const raw = draft[f].trim();
    acc[f] = (raw !== '' && !fieldErr(f)) ? Number(raw) : server.default[f];
    return acc;
  }, {}) : null;

  const dirty = server ? DRAFT_PRICING_FIELDS.some((f) => {
    const cur = server.override?.[f];
    const raw = draft[f].trim();
    return raw === '' ? cur != null : Number(raw) !== cur;
  }) : false;

  const save = async () => {
    if (anyErr) return;
    setErr(null); setOk(null); setBusy(true);
    try {
      // Send every field: a blanked box must clear its override, which needs an
      // explicit null rather than an omission (omitted = leave untouched).
      const patch = {};
      for (const f of DRAFT_PRICING_FIELDS) {
        const raw = draft[f].trim();
        patch[f] = raw === '' ? null : Number(raw);
      }
      const next = await trpc.admin.setDraftPricing.mutate(patch);
      setServer((prev) => ({ ...(prev || {}), ...next }));
      seed(next);
      setOk('Saved — first draft ' + next.applied.firstCost.toLocaleString()
        + ' CR, ' + (next.applied.stepPct === 0
          ? 'flat (same every buy)'
          : '+' + next.applied.stepPct + '% per buy'));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    setErr(null); setOk(null); setBusy(true);
    try {
      const next = await trpc.admin.resetDraftPricing.mutate();
      setServer((prev) => ({ ...(prev || {}), ...next }));
      seed(next);
      setOk('Reset to shipped defaults');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const META = {
    firstCost: { label: 'First draft of the week', unit: 'CR' },
    stepPct: { label: 'Rise per extra buy', unit: '%' },
    roundTo: { label: 'Round each tier to', unit: 'CR' },
  };

  if (!server) {
    return (
      <div data-testid="admin-draft-pricing">
        <div style={S.heading}>Paid draft pricing — everyone</div>
        {err
          ? <div style={S.error}>Failed to load draft pricing: {err}</div>
          : <span style={{ color: '#556', fontSize: 12 }}>loading draft pricing…</span>}
      </div>
    );
  }

  const preview = effective ? tiersFor(effective) : server.tiers;

  return (
    <div data-testid="admin-draft-pricing">
      <div style={S.heading}>Paid draft pricing — everyone</div>
      <div style={{ color: '#445', fontSize: 11, marginBottom: 12 }}>
        Sets what <b style={{ color: '#8a9ab0' }}>all players</b> pay for a bought
        draft pick. The counter resets 00:00 UTC Monday, so each player's next
        price depends on how many they've already bought this week. Charged
        server-side — a stale client can't pay the old price.
      </div>

      {DRAFT_PRICING_FIELDS.map((f, i) => {
        const overridden = server.override?.[f] != null;
        const fe = errs[i];
        return (
          <div key={f} style={{ ...S.row, marginBottom: 10 }}>
            <span style={{ color: '#ccd', fontSize: 12, width: 170 }}>{META[f].label}</span>
            <input
              data-testid={'dp-input-' + f}
              style={{ ...S.input, width: 90, borderColor: fe ? '#7a2a2a' : '#2a3a58' }}
              placeholder={String(server.default[f])}
              value={draft[f]}
              onChange={(e) => { setOk(null); setDraft((d) => ({ ...d, [f]: e.target.value })); }}
            />
            <span style={{ color: '#556', fontSize: 11 }}>{META[f].unit}</span>
            <span data-testid={'dp-state-' + f} data-on={overridden ? '1' : '0'}
              style={S.tag(overridden ? '#1c5c2c' : '#333c4c')}>
              {overridden ? 'SET' : 'default'}
            </span>
            {fe && <span data-testid={'dp-err-' + f} style={{ color: '#f06060', fontSize: 11 }}>{fe}</span>}
          </div>
        );
      })}

      <div style={{ color: '#445', fontSize: 11, margin: '4px 0 8px' }}>
        Leave a box blank to follow the shipped default (shown as the greyed
        number). Clearing a box un-sets that field.
      </div>

      {/* Ladder preview — computed with the shared tiersFor(), the same
          function that prices the real charge. Labelled PREVIEW while dirty so
          an operator never mistakes an unsaved curve for the live one. */}
      <div style={{ border: '1px solid ' + (dirty ? '#6a5a1a' : '#1a2030'), borderRadius: 6, padding: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span data-testid="dp-preview-state" data-dirty={dirty ? '1' : '0'}
            style={S.tag(dirty ? '#6a5a1a' : '#1c3c5c')}>
            {dirty ? 'PREVIEW — NOT SAVED' : 'LIVE NOW'}
          </span>
          <span style={{ color: '#556', fontSize: 11 }}>price of each buy this week</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {preview.map((c, i) => (
            <span key={i} data-testid={'dp-tier-' + i}
              style={{ background: '#0d1424', border: '1px solid #1e2e48', borderRadius: 4, padding: '3px 7px', fontSize: 11, color: dirty ? '#e0c060' : '#8a9ab0' }}>
              <span style={{ color: '#445' }}>#{i + 1}</span> {c.toLocaleString()}
            </span>
          ))}
        </div>
      </div>

      <div style={{ ...S.row, marginBottom: 0 }}>
        <button data-testid="dp-save" disabled={busy || anyErr || !dirty}
          style={(!busy && !anyErr && dirty) ? S.btn('#1c5c2c') : { ...S.btn('#10203a'), color: '#556', cursor: 'default' }}
          onClick={save}>
          {busy ? '…' : 'Apply to everyone'}
        </button>
        <button data-testid="dp-reset"
          disabled={busy || Object.keys(server.override || {}).length === 0}
          style={(!busy && Object.keys(server.override || {}).length > 0)
            ? S.btn()
            : { ...S.btn('#0d1424'), color: '#39435a', cursor: 'default' }}
          onClick={resetAll}>
          Follow shipped defaults
        </button>
        {dirty && !anyErr && <span style={{ color: '#e0c060', fontSize: 11 }}>unsaved changes</span>}
      </div>

      <div data-testid="dp-source" style={{ color: '#556', fontSize: 11, marginTop: 8 }}>
        everyone: <b style={{ color: '#8a9ab0' }}>{server.applied.firstCost.toLocaleString()} CR</b>
        {server.applied.stepPct === 0
          ? <> flat (same every buy)</>
          : <>{' then +'}<b style={{ color: '#8a9ab0' }}>{server.applied.stepPct}%</b> per buy</>}
        {' · '}
        {Object.keys(server.override || {}).length > 0
          ? <>set by u/{String(server.admin || '?').replace(/^u\//, '')}{server.at ? ' · ' + fmt(server.at) : ''}</>
          : <>following shipped defaults</>}
      </div>

      {err && <div data-testid="dp-error" style={S.error}>{err}</div>}
      {ok && <div data-testid="dp-ok" style={S.success}>{ok}</div>}

      {server.log?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#445', fontSize: 11, marginBottom: 4 }}>Recent changes</div>
          {server.log.slice(0, 5).map((e, i) => (
            <div key={i} style={{ color: '#556', fontSize: 10 }}>
              {fmt(e.at)} · u/{String(e.admin).replace(/^u\//, '')} → {e.applied.firstCost.toLocaleString()} CR +{e.applied.stepPct}%
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Human-readable copy for each flag in core/featureFlags.ts FLAG_DEFAULTS.
// `on`/`off` describe the player-facing effect so an operator knows what
// flipping the switch actually does before they flip it.
const FLAG_META = {
  passPurchases: {
    label: 'Founders Pass purchases',
    on: 'Battle pass page open; Basic + Premium buyable.',
    off: 'Page blocked for non-owners; purchases rejected and refunded server-side. Existing owners keep access to their missions.',
  },
};

function ConfigPanel() {
  const { busy, msg, wrap, setMsg } = useWrap();
  const [flags, setFlags] = useState(null);
  const [log, setLog] = useState([]);

  const load = () => trpc.admin.getFlags.query()
    .then(d => { setFlags(d.flags); setLog(d.log || []); })
    .catch(e => setMsg({ text: e.message, ok: false }));

  useEffect(() => { load(); }, []);

  const toggle = (flag, next) => wrap(async () => {
    await trpc.admin.setFlag.mutate({ flag, enabled: next });
    await load();
    setMsg({ text: `${FLAG_META[flag]?.label || flag} ${next ? 'ENABLED' : 'DISABLED'}`, ok: true });
  });

  // Surface load failures. Previously this returned a bare "loading flags…"
  // on error too: `msg` is only rendered in the main return below, which a
  // failed load never reaches — so an error looked like a permanent spinner.
  // Defined once, used in both returns: the splash switch loads its own state,
  // so it must still be reachable when the server FLAG fetch fails.
  const localSection = <><SplashSwitch /><hr style={S.divider} /><DraftPricingPanel /><hr style={S.divider} /></>;

  if (!flags) return (
    <div data-testid="admin-config-loading" style={{ fontSize: 12 }}>
      {localSection}
      {msg && !msg.ok
        ? <div style={S.error}>Failed to load flags: {msg.text}</div>
        : <span style={{ color: '#556' }}>loading flags…</span>}
    </div>
  );

  const names = Object.keys(flags);

  return (
    <div data-testid="admin-config-panel">
      {localSection}
      <div style={S.heading}>Feature flags — {names.length} flag{names.length !== 1 ? 's' : ''}</div>
      <div style={{ color: '#445', fontSize: 11, marginBottom: 14 }}>
        Takes effect immediately — no redeploy. Enforced server-side, so disabling
        cannot be bypassed by a stale client.
      </div>

      {names.map(name => {
        const on = flags[name];
        const meta = FLAG_META[name] || { label: name, on: '', off: '' };
        return (
          <div key={name} style={{ border: '1px solid #1a2030', borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                data-testid={`flag-state-${name}`}
                data-on={on ? '1' : '0'}
                style={S.tag(on ? '#1c5c2c' : '#5c1c1c')}
              >
                {on ? 'ON' : 'OFF'}
              </span>
              <span style={{ color: '#ccd', fontSize: 12 }}>{meta.label}</span>
              <code style={{ color: '#445', fontSize: 10 }}>{name}</code>
              <div style={{ flex: 1 }} />
              <button
                data-testid={`flag-toggle-${name}`}
                disabled={busy}
                onClick={() => toggle(name, !on)}
                style={on ? S.danger : S.btn('#1c5c2c')}
              >
                {on ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
            <div style={{ color: on ? '#6a8' : '#a76', fontSize: 11, lineHeight: 1.4 }}>
              {on ? meta.on : meta.off}
            </div>
          </div>
        );
      })}

      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}

      <hr style={S.divider} />
      <div style={S.heading}>Change log</div>
      {log.length === 0 && <div style={{ color: '#334', fontSize: 11 }}>no changes recorded</div>}
      {log.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#667', padding: '3px 0', borderBottom: '1px solid #14141f' }}>
          <span style={{ color: e.enabled ? '#6a8' : '#a66', width: 34 }}>{e.enabled ? 'ON' : 'OFF'}</span>
          <span style={{ color: '#889' }}>{FLAG_META[e.flag]?.label || e.flag}</span>
          <div style={{ flex: 1 }} />
          <span>u/{String(e.admin).replace(/^u\//, '')}</span>
          <span style={{ color: '#445' }}>{new Date(e.at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}


// ── Analytics ───────────────────────────────────────────────────────────────
// Aggregate snapshot over users:all. Every figure is derived from data already
// stored on the user hashes, so it is correct across full history on first
// load (no waiting for new indices to fill).
const RANGES = [1, 7, 14, 30, 90];

function Stat({ label, value, sub, testid }) {
  return (
    <div data-testid={testid} style={{ background: '#0a0f1c', border: '1px solid #1a2438', borderRadius: 4, padding: '8px 10px' }}>
      <div style={{ color: '#556', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 'bold' }}>{value}</div>
      {sub != null && <div style={{ color: '#445', fontSize: 10 }}>{sub}</div>}
    </div>
  );
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6, marginBottom: 14 };
const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

// Cumulative user-growth line. The server only returns per-day new signups for
// the window, so the pre-window baseline is derived as (total - sum(newUsers)).
// That keeps the line anchored to the true user count without a new endpoint.
function GrowthChart({ daily, total }) {
  const W = 320, H = 96, PAD_L = 26, PAD_R = 6, PAD_T = 8, PAD_B = 16;

  const inWindow = daily.reduce((a, d) => a + d.newUsers, 0);
  const baseline = Math.max(0, total - inWindow);

  let running = baseline;
  // Anchor point = cumulative total at the *start* of the window. Without it a
  // 1-day window is a single point (no line), and every window silently hid its
  // true starting value because day 0 already includes that day's signups.
  const pts = [{ day: 'start', newUsers: null, cum: baseline, rate: 0, anchor: true }];
  for (const d of daily) {
    const prev = running;
    running += d.newUsers;
    pts.push({
      day: d.day,
      newUsers: d.newUsers,
      cum: running,
      // daily growth rate vs. the prior day's cumulative base
      rate: prev > 0 ? (d.newUsers / prev) * 100 : (d.newUsers > 0 ? 100 : 0),
    });
  }

  const lo = Math.min(...pts.map(p => p.cum), baseline);
  const hi = Math.max(...pts.map(p => p.cum), baseline);
  const flat = hi === lo;
  // pad a flat series so the line renders mid-box instead of on an edge
  const yMin = flat ? Math.max(0, lo - 1) : lo;
  const yMax = flat ? hi + 1 : hi;

  const x = i => PAD_L + (pts.length <= 1 ? 0 : (i / (pts.length - 1)) * (W - PAD_L - PAD_R));
  const y = v => PAD_T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD_T - PAD_B);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join(' ');
  const area = pts.length
    ? `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD_B} L${x(0).toFixed(1)},${H - PAD_B} Z`
    : '';

  const net = running - baseline;
  const overall = baseline > 0 ? (net / baseline) * 100 : (net > 0 ? 100 : 0);
  const sign = net > 0 ? '+' : '';

  return (
    <div data-testid="admin-analytics-growth">
      <div style={S.heading}>
        User growth — {baseline} &rarr; {running}{' '}
        <span data-testid="an-growth-rate" style={{ color: net > 0 ? '#4a9a5a' : '#556' }}>
          ({sign}{overall.toFixed(1)}% / {daily.length}d)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', marginBottom: 4 }}>
        <line x1={PAD_L} y1={PAD_T} x2={W - PAD_R} y2={PAD_T} stroke="#1d2430" strokeWidth="1" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#1d2430" strokeWidth="1" />
        <text x="2" y={PAD_T + 4} fill="#445" fontSize="8">{yMax}</text>
        <text x="2" y={H - PAD_B} fill="#445" fontSize="8">{yMin}</text>
        {area && <path data-testid="an-growth-area" d={area} fill="#3a8fd4" fillOpacity="0.12" stroke="none" />}
        {pts.length > 1 && <path data-testid="an-growth-line" d={line} fill="none" stroke="#3a8fd4" strokeWidth="1.6" strokeLinejoin="round" />}
        {pts.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(i)} cy={y(p.cum)} r={p.anchor ? 1.8 : p.newUsers ? 2.4 : 1.2}
              fill={p.anchor ? '#445' : p.newUsers ? '#6fb7ea' : '#3a8fd4'} />
            <rect x={x(i) - 6} y={PAD_T} width="12" height={H - PAD_T - PAD_B} fill="transparent">
              <title>{p.anchor
                ? `window start · ${p.cum} total`
                : `${p.day}  +${p.newUsers} new · ${p.cum} total · ${p.rate.toFixed(1)}%/d`}</title>
            </rect>
          </g>
        ))}
        <text x={PAD_L} y={H - 4} fill="#445" fontSize="8">{pts[0] && pts[0].day.slice(5)}</text>
        <text x={W - PAD_R} y={H - 4} fill="#445" fontSize="8" textAnchor="end">
          {pts.length && pts[pts.length - 1].day.slice(5)}
        </text>
      </svg>
      <div style={{ color: '#445', fontSize: 10, marginBottom: 14 }}>
        Cumulative users · baseline {baseline} before window · hover a point for that day&rsquo;s rate
        {flat && <span style={{ color: '#d4a13a' }}> · flat: no signups in this window</span>}
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  const { busy, msg, wrap, setMsg } = useWrap();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);

  const load = (d = days) => trpc.admin.getAnalytics.query({ windowDays: d })
    .then(setData)
    .catch(e => setMsg({ text: e.message, ok: false }));

  useEffect(() => { load(days); }, [days]);

  const backfill = () => wrap(async () => {
    const r = await trpc.admin.backfillAnalytics.mutate();
    await load();
    setMsg({ text: `Indexed ${r.usersIndexed} users, ${r.gamesIndexed} games (scanned ${r.scanned})`, ok: true });
  });

  if (!data) return (
    <div data-testid="admin-analytics-loading" style={{ fontSize: 12 }}>
      {msg && !msg.ok
        ? <div style={S.error}>Failed to load analytics: {msg.text}</div>
        : <span style={{ color: '#556' }}>scanning users…</span>}
    </div>
  );

  const { users: u, credits, games, daily } = data;
  const peak = Math.max(1, ...daily.map(d => Math.max(d.newUsers, d.games)));
  // Window-scoped totals. `daily` is the ONLY window-scoped thing the server
  // returns -- users/credits/games blocks are lifetime figures -- so the range
  // buttons are summed from here rather than from `u`.
  const winNew = daily.reduce((a, d) => a + d.newUsers, 0);
  const winDrafted = daily.reduce((a, d) => a + d.drafted, 0);
  const winGames = daily.reduce((a, d) => a + d.games, 0);

  return (
    <div data-testid="admin-analytics-panel">
      <div style={S.row}>
        <span style={{ ...S.heading, marginBottom: 0 }}>Window</span>
        {RANGES.map(d => (
          <button key={d} data-testid={`admin-analytics-range-${d}`}
            style={S.tab(days === d)} onClick={() => setDays(d)}>{d}d</button>
        ))}
        <button style={S.btn()} onClick={() => load()}>Refresh</button>
      </div>

      {data.truncated && (
        <div style={{ color: '#d4a13a', fontSize: 11, marginBottom: 10 }}>
          Scan truncated — showing the {data.scanned} most recently active of {data.total} users.
          Percentages are of the scanned set.
        </div>
      )}

      <GrowthChart daily={daily} total={u.total} />

      <div style={S.heading}>Users — {u.total} total <span style={{ color: '#445', fontWeight: 'normal' }}>· all time</span></div>
      <div style={grid}>
        <Stat testid="an-new-today" label="New today" value={u.newToday} />
        <Stat testid="an-new-7d" label="New 7d" value={u.new7d} />
        <Stat testid="an-new-30d" label="New 30d" value={u.new30d} />
        <Stat testid="an-active-7d" label="Active 7d" value={u.active7d} sub={pct(u.active7d, u.total)} />
      </div>

      <div style={S.heading}>Engagement <span style={{ color: '#445', fontWeight: 'normal' }}>· all time, not affected by window</span></div>
      <div style={grid}>
        <Stat testid="an-drafted" label="Drafted" value={u.drafted} sub={pct(u.drafted, u.total)} />
        <Stat testid="an-not-drafted" label="No roster" value={u.notDrafted} sub={pct(u.notDrafted, u.total)} />
        <Stat testid="an-played" label="Played 1+" value={u.played} sub={pct(u.played, u.total)} />
        <Stat testid="an-named" label="Named team" value={u.named} sub={pct(u.named, u.total)} />
      </div>

      <div style={S.heading} data-testid="an-cohort-heading">
        Signup cohort — last {days}d{' '}
        <span style={{ color: '#445', fontWeight: 'normal' }}>· follows the window</span>
      </div>
      <div style={grid}>
        <Stat testid="an-win-new" label="New users" value={winNew} />
        <Stat testid="an-win-drafted" label="Drafted" value={winDrafted} sub={pct(winDrafted, winNew)} />
        <Stat testid="an-win-nodraft" label="No roster" value={winNew - winDrafted} sub={pct(winNew - winDrafted, winNew)} />
        <Stat testid="an-win-games" label="Games played" value={winGames} />
      </div>

      <div style={S.heading}>Energy — regen-adjusted</div>
      <div style={grid}>
        <Stat testid="an-energy-below" label="Below max" value={u.energyBelowMax} sub={pct(u.energyBelowMax, u.total)} />
        <Stat testid="an-energy-empty" label="Empty" value={u.energyEmpty} sub={pct(u.energyEmpty, u.total)} />
        <Stat testid="an-muted" label="Muted" value={u.muted} />
        <Stat testid="an-founders" label="Founders" value={u.founders} />
      </div>

      <div style={S.heading}>Games <span style={{ color: '#445', fontWeight: 'normal' }}>· all time</span></div>
      <div style={grid}>
        <Stat testid="an-games-total" label="Total" value={games.total} />
        <Stat testid="an-games-avg" label="Avg/player" value={games.avgPerPlayer.toFixed(1)} />
        <Stat testid="an-games-wins" label="Wins" value={games.wins} />
        <Stat testid="an-games-losses" label="Losses" value={games.losses} />
      </div>

      <div style={S.heading}>Credits <span style={{ color: '#445', fontWeight: 'normal' }}>· all time</span></div>
      <div style={grid}>
        <Stat testid="an-cr-held" label="Held" value={credits.held.toLocaleString()} />
        <Stat testid="an-cr-earned" label="Earned" value={credits.earned.toLocaleString()} />
        <Stat testid="an-cr-spent" label="Spent" value={credits.spent.toLocaleString()} />
      </div>

      <div style={S.heading}>Daily — new users vs drafted vs games</div>
      <div data-testid="admin-analytics-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, marginBottom: 6 }}>
        {daily.map(d => (
          <div key={d.day} data-testid={`an-bar-${d.day}`}
            title={`${d.day}  new ${d.newUsers} · drafted ${d.drafted} · games ${d.games} · active ${d.activeUsers}`}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
            <div data-testid="an-bar-new" style={{ flex: 1, height: `${(d.newUsers / peak) * 100}%`, background: '#3a8fd4', minHeight: d.newUsers ? 2 : 0 }} />
            <div data-testid="an-bar-drafted" style={{ flex: 1, height: `${(d.drafted / peak) * 100}%`, background: '#d4a13a', minHeight: d.drafted ? 2 : 0 }} />
            <div data-testid="an-bar-games" style={{ flex: 1, height: `${(d.games / peak) * 100}%`, background: '#4a9a5a', minHeight: d.games ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div style={{ color: '#445', fontSize: 10, marginBottom: 14 }}>
        <span style={{ color: '#3a8fd4' }}>■</span> new users&nbsp;&nbsp;
        <span style={{ color: '#d4a13a' }}>■</span> drafted&nbsp;&nbsp;
        <span style={{ color: '#4a9a5a' }}>■</span> games&nbsp;&nbsp;· peak {peak}/day · hover for detail
      </div>

      <div style={S.heading}>Per day — new vs drafted</div>
      <div data-testid="an-daily-table" style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid #1a2438', borderRadius: 4, marginBottom: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ color: '#556', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px', position: 'sticky', top: 0, background: '#0a0f1c' }}>Day</th>
              <th style={{ padding: '4px 8px', position: 'sticky', top: 0, background: '#0a0f1c', textAlign: 'right' }}>New</th>
              <th style={{ padding: '4px 8px', position: 'sticky', top: 0, background: '#0a0f1c', textAlign: 'right' }}>Drafted</th>
              <th style={{ padding: '4px 8px', position: 'sticky', top: 0, background: '#0a0f1c', textAlign: 'right' }}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {[...daily].reverse().map(d => (
              <tr key={d.day} data-testid={`an-row-${d.day}`} style={{ borderTop: '1px solid #141c2c', color: d.newUsers ? '#e0e0e0' : '#445' }}>
                <td style={{ padding: '3px 8px' }}>{d.day}</td>
                <td data-testid="an-row-new" style={{ padding: '3px 8px', textAlign: 'right', color: d.newUsers ? '#6fb7ea' : '#445' }}>{d.newUsers}</td>
                <td data-testid="an-row-drafted" style={{ padding: '3px 8px', textAlign: 'right', color: d.drafted ? '#d4a13a' : '#445' }}>{d.drafted}</td>
                <td style={{ padding: '3px 8px', textAlign: 'right' }}>{pct(d.drafted, d.newUsers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: '#445', fontSize: 10, marginBottom: 14 }}>
        Drafted = of that day&rsquo;s signups, how many have since drafted a team (cohort conversion,
        so it never exceeds New). Most recent day first.
      </div>

      <hr style={S.divider} />
      <div style={S.row}>
        <button data-testid="admin-analytics-backfill" style={S.btn()} disabled={busy} onClick={backfill}>Backfill Indices</button>
        <span style={{ color: '#445', fontSize: 10 }}>
          Fills users:byFirstSeen + games:log from existing data. Idempotent.
        </span>
      </div>
      {msg && <div style={msg.ok ? S.success : S.error}>{msg.text}</div>}
      <div style={{ color: '#334', fontSize: 10, marginTop: 10 }}>
        Scanned {data.scanned} of {data.total} · generated {new Date(data.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

const TABS = ['User', 'Games', 'Missions', 'Announce', 'Notify', 'Admins', 'Config', 'Stats'];

export function AdminOverlay({ onClose }) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div data-testid="admin-overlay" style={S.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.panel}>
        <div style={S.header}>
          <span style={S.title}>ADMIN PANEL</span>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>
        <div style={S.tabs}>
          {TABS.map((t, i) => (
            <button key={t} data-testid={`admin-tab-${t.toLowerCase()}`} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
        <div style={S.body}>
          {tab === 0 && <UserPanel />}
          {tab === 1 && <GamesPanel />}
          {tab === 2 && <MissionsPanel />}
          {tab === 3 && <AnnouncementsPanel />}
          {tab === 4 && <NotificationsPanel />}
          {tab === 5 && <AdminsPanel />}
          {tab === 6 && <ConfigPanel />}
          {tab === 7 && <AnalyticsPanel />}
        </div>
      </div>
    </div>
  );
}
