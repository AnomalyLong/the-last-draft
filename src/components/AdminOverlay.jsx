import React, { useState, useEffect } from 'react';
import { trpc } from '../trpc';

const S = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' },
  panel: { background: '#0d1220', border: '1px solid #2a3a58', borderRadius: 6, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e2e48', background: '#0a0f1c' },
  title: { color: '#3a8fd4', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  close: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' },
  tabs: { display: 'flex', borderBottom: '1px solid #1e2e48' },
  tab: (active) => ({ padding: '8px 20px', cursor: 'pointer', fontSize: 12, color: active ? '#e0e0e0' : '#555', borderBottom: active ? '2px solid #3a8fd4' : '2px solid transparent', background: 'none', border: 'none', borderBottom: active ? '2px solid #3a8fd4' : '2px solid transparent', fontFamily: 'monospace' }),
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

function UserPanel() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [roster, setRoster] = useState(null);
  const [credits, setCredits] = useState('');
  const [freeDrafts, setFreeDrafts] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const { busy, msg, wrap, setMsg } = useWrap();
  const { users, total } = useUsernames();

  const load = (name) => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    setConfirmReset(false);
    setRoster(null);
    wrap(async () => {
      const [data, rosterData] = await Promise.all([
        trpc.admin.getUser.query(target),
        trpc.admin.getUserRoster.query(target).catch(() => null),
      ]);
      setUser(data);
      setRoster(rosterData);
    });
  };

  const reload = async (name) => {
    const target = name ?? username.trim();
    const [data, rosterData] = await Promise.all([
      trpc.admin.getUser.query(target),
      trpc.admin.getUserRoster.query(target).catch(() => null),
    ]);
    setUser(data);
    setRoster(rosterData);
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
                    return (
                      <tr key={p.id}>
                        <td style={{ ...S.td, padding: '3px 6px', color: '#556' }}>{p.lineupRole ?? '—'}</td>
                        <td style={{ ...S.td, padding: '3px 6px' }}>{p.name}</td>
                        <td style={{ ...S.td, padding: '3px 6px', color: RARITY_COLOR[p.rarity] ?? '#778' }}>{p.rarity}</td>
                        <td style={{ ...S.td, padding: '3px 6px' }}>{p.level}</td>
                        {['spd', 'dex', 'jmp', 'acc'].map(s => (
                          <td key={s} style={{ ...S.td, padding: '3px 6px' }}>
                            {p[s]}{bs[s] ? <span style={{ color: '#4a8' }}>+{bs[s]}</span> : ''}
                          </td>
                        ))}
                      </tr>
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

const TABS = ['User', 'Games', 'Missions', 'Announce', 'Admins'];

export function AdminOverlay({ onClose }) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={S.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.panel}>
        <div style={S.header}>
          <span style={S.title}>ADMIN PANEL</span>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>
        <div style={S.tabs}>
          {TABS.map((t, i) => (
            <button key={t} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
        <div style={S.body}>
          {tab === 0 && <UserPanel />}
          {tab === 1 && <GamesPanel />}
          {tab === 2 && <MissionsPanel />}
          {tab === 3 && <AnnouncementsPanel />}
          {tab === 4 && <AdminsPanel />}
        </div>
      </div>
    </div>
  );
}
