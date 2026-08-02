import React, { useState, useEffect } from 'react';
import { trpc } from '../trpc';

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
        <input style={S.input} placeholder="Reddit username" value={username}
          list="admin-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
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
          <input style={{ ...S.input, width: 100 }} placeholder="Credits" value={credits}
            onChange={e => setCredits(e.target.value)} type="number" />
          <button style={S.btn('#4a3a1a')} onClick={setC} disabled={busy || !credits}>Set Credits</button>
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
        <input style={S.input} placeholder="Reddit username" value={username}
          list="admin-mission-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
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
  if (!flags) return (
    <div data-testid="admin-config-loading" style={{ fontSize: 12 }}>
      {msg && !msg.ok
        ? <div style={S.error}>Failed to load flags: {msg.text}</div>
        : <span style={{ color: '#556' }}>loading flags…</span>}
    </div>
  );

  const names = Object.keys(flags);

  return (
    <div data-testid="admin-config-panel">
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

const TABS = ['User', 'Games', 'Missions', 'Announce', 'Notify', 'Admins', 'Config'];

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
        </div>
      </div>
    </div>
  );
}
