import React, { useState } from 'react';
import { ABILITIES } from '@src/abilities.js';

const api = async (method, path, body) => {
  const res = await fetch(`/dev-admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  return res.json();
};

// Shared usernames list — loads up to 500 most-recently-seen usernames once
// and powers autocomplete (datalist) + the clickable browse list.
function useUsernames() {
  const [users, setUsers] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  React.useEffect(() => {
    fetch('/dev-admin/users?limit=500')
      .then(r => r.ok ? r.json() : { users: [], total: 0 })
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0); })
      .catch(() => {});
  }, []);
  return { users, total };
}

function UsernameDatalist({ id, users }) {
  return (
    <datalist id={id}>
      {users.map(u => <option key={u} value={u} />)}
    </datalist>
  );
}

function UsernameBrowser({ users, total, selected, onPick, busy }) {
  const [filter, setFilter] = React.useState('');
  const matches = filter
    ? users.filter(u => u.toLowerCase().includes(filter.toLowerCase()))
    : users;
  return (
    <div>
      <input
        style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e0e0e0', padding: '6px 10px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
        placeholder={`Filter ${total || users.length} user${(total || users.length) !== 1 ? 's' : ''}…`}
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8, maxHeight: 120, overflowY: 'auto', padding: 2 }}>
        {matches.slice(0, 200).map(u => (
          <button key={u} onClick={() => onPick(u)} disabled={busy}
            style={{
              background: selected === u ? '#1a3a6a' : '#0d1018',
              border: `1px solid ${selected === u ? '#3a6aaa' : '#2a3a58'}`,
              color: selected === u ? '#e0e0e0' : '#778',
              padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>
            {u}
          </button>
        ))}
        {matches.length === 0 && <span style={{ color: '#444', fontSize: 11 }}>no matches</span>}
        {matches.length > 200 && <span style={{ color: '#444', fontSize: 11 }}>… {matches.length - 200} more — refine filter</span>}
      </div>
    </div>
  );
}

const S = {
  section: { marginBottom: 32 },
  heading: { color: '#aaa', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  input: { background: '#1a1a1a', border: '1px solid #333', color: '#e0e0e0', padding: '6px 10px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13, width: 200 },
  btn: (color = '#2a4a7a') => ({ background: color, border: 'none', color: '#e0e0e0', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }),
  danger: { background: '#5a1a1a', border: 'none', color: '#ffaaaa', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 },
  table: { borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, width: '100%' },
  td: { padding: '4px 12px', borderBottom: '1px solid #1e1e1e', color: '#ccc' },
  tdKey: { padding: '4px 12px', borderBottom: '1px solid #1e1e1e', color: '#666', width: 160 },
  error: { color: '#ff6060', fontFamily: 'monospace', fontSize: 12, marginTop: 8 },
  tag: (color) => ({ background: color, color: '#fff', borderRadius: 3, padding: '1px 6px', fontSize: 11, fontFamily: 'monospace' }),
  gameId: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 3, padding: '2px 8px', fontFamily: 'monospace', fontSize: 12, color: '#aaa', marginRight: 6, marginBottom: 4, display: 'inline-block' },
};

function UserPanel() {
  const [username, setUsername] = useState('');
  const [user, setUser]         = useState(null);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [credits, setCredits]   = useState('');
  const { users, total }        = useUsernames();

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = (name) => wrap(async () => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    const data = await api('GET', `/user/${target}`);
    setUser(data);
  });

  const reset = () => wrap(async () => {
    if (!window.confirm(`Delete all data for "${username}"? This resets them to a brand-new user.`)) return;
    await api('POST', `/user/${username.trim()}/reset`);
    setUser(null);
  });

  const energy = () => wrap(async () => {
    await api('POST', `/user/${username.trim()}/energy`);
    await api('GET', `/user/${username.trim()}`).then(setUser);
  });

  const setC = () => wrap(async () => {
    const n = parseInt(credits);
    if (isNaN(n)) { setError('Enter a valid number'); return; }
    await api('POST', `/user/${username.trim()}/credits`, { credits: n });
    await api('GET', `/user/${username.trim()}`).then(setUser);
  });

  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  return (
    <div style={S.section}>
      <div style={S.heading}>
        User Lookup
        {total > 0 && <span style={{ color: '#445', marginLeft: 8 }}>{total} total</span>}
      </div>
      <UsernameBrowser users={users} total={total} selected={username}
        onPick={(u) => load(u)} busy={busy} />
      <UsernameDatalist id="devadmin-usernames" users={users} />
      <div style={S.row}>
        <input style={S.input} placeholder="Reddit username" value={username}
          list="devadmin-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
      </div>
      {error && <div style={S.error}>{error}</div>}

      {user && (
        <>
          <table style={S.table}>
            <tbody>
              {[
                ['Credits',      user.credits],
                ['Credits Earned', user.creditsEarned],
                ['Credits Spent',  user.creditsSpent],
                ['Energy',       `${user.energy} / 5`],
                ['Free Drafts',  user.freeDrafts],
                ['Games Played', user.gamesPlayed],
                ['First Seen',   fmt(user.firstSeen)],
                ['Last Seen',    fmt(user.lastSeen)],
                ['Reddit ID',    user.redditId],
                ['FTUE',         user.gamesPlayed === 0 ? '✓ First game' : '✗ Returning player'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={S.tdKey}>{k}</td>
                  <td style={S.td}>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ ...S.row, marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            <button style={S.btn('#1a4a2a')} onClick={energy} disabled={busy}>Restore Energy</button>
            <button style={S.danger} onClick={reset} disabled={busy}>Reset User</button>
          </div>

          <div style={{ ...S.row, marginTop: 8 }}>
            <input style={{ ...S.input, width: 120 }} placeholder="Credits" value={credits}
              onChange={e => setCredits(e.target.value)} type="number" />
            <button style={S.btn('#4a3a1a')} onClick={setC} disabled={busy || !credits}>Set Credits</button>
          </div>
        </>
      )}
    </div>
  );
}

function GamesPanel() {
  const [pending, setPending] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = () => wrap(async () => {
    const [p, f] = await Promise.all([
      api('GET', '/games/pending'),
      api('GET', '/games/flagged'),
    ]);
    setPending(p.games);
    setFlagged(f.games);
  });

  const clear = (type, setter) => wrap(async () => {
    if (!window.confirm(`Clear all ${type} games from the review queue?`)) return;
    await api('DELETE', `/games/${type}`);
    setter([]);
  });

  const GameList = ({ games, label, color, onClear }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...S.row, marginBottom: 6 }}>
        <span style={S.tag(color)}>{label}</span>
        <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 12 }}>{games.length} game{games.length !== 1 ? 's' : ''}</span>
        {games.length > 0 && <button style={S.danger} onClick={onClear} disabled={busy}>Clear Queue</button>}
      </div>
      <div>
        {games.length === 0
          ? <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 12 }}>empty</span>
          : games.map(id => <span key={id} style={S.gameId}>#{id}</span>)
        }
      </div>
    </div>
  );

  return (
    <div style={S.section}>
      <div style={S.heading}>Game Review Queues</div>
      <button style={S.btn()} onClick={load} disabled={busy}>Load Queues</button>
      {error && <div style={S.error}>{error}</div>}
      {pending !== null && (
        <div style={{ marginTop: 16 }}>
          <GameList games={pending} label="PENDING" color="#2a5a2a" onClear={() => clear('pending', setPending)} />
          <GameList games={flagged} label="FLAGGED" color="#5a2a2a" onClear={() => clear('flagged', setFlagged)} />
        </div>
      )}
    </div>
  );
}

function CatalogPanel() {
  const [data, setData] = useState(null); // { catalog, defaults }
  const [edits, setEdits] = useState({}); // { [id]: draft }
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = () => wrap(async () => {
    const fresh = await api('GET', '/missions/catalog');
    setData(fresh);
    setEdits({});
  });

  React.useEffect(() => { load(); }, []);

  const startEdit = (m) => setEdits(e => ({ ...e, [m.id]: { ...m } }));
  const cancelEdit = (id) => setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  const patchEdit = (id, field, v) => setEdits(e => ({ ...e, [id]: { ...e[id], [field]: v } }));

  const saveEdit = (m) => wrap(async () => {
    const d = edits[m.id];
    await api('POST', '/missions/catalog/update', {
      id: m.id, label: d.label, sub: d.sub, reward: Number(d.reward), total: Number(d.total), accent: d.accent,
    });
    cancelEdit(m.id);
    await load();
  });

  const moveMission = (id, toType) => wrap(async () => {
    await api('POST', '/missions/catalog/move', { id, toType });
    await load();
  });

  const resetCatalog = () => wrap(async () => {
    if (!window.confirm('Reset the global mission catalog to defaults?')) return;
    await api('POST', '/missions/catalog/reset');
    await load();
  });

  if (!data) return <div style={{ ...S.section, color: '#555' }}>Loading catalog…</div>;

  const renderRow = (m, type) => {
    const draft = edits[m.id];
    if (draft) {
      return (
        <tr key={m.id}>
          <td colSpan={2} style={{ ...S.td, verticalAlign: 'top' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#555', fontSize: 10 }}>ID</span>
              <span style={{ color: '#aab', fontSize: 11 }}>{m.id}</span>
              <span style={{ color: '#555', fontSize: 10 }}>Label</span>
              <input style={{ ...S.input, width: '100%' }} value={draft.label} onChange={e => patchEdit(m.id, 'label', e.target.value)} />
              <span style={{ color: '#555', fontSize: 10 }}>Sub</span>
              <input style={{ ...S.input, width: '100%' }} value={draft.sub} onChange={e => patchEdit(m.id, 'sub', e.target.value)} />
              <span style={{ color: '#555', fontSize: 10 }}>Reward</span>
              <input type="number" style={{ ...S.input, width: 90 }} value={draft.reward} onChange={e => patchEdit(m.id, 'reward', e.target.value)} />
              <span style={{ color: '#555', fontSize: 10 }}>Total</span>
              <input type="number" style={{ ...S.input, width: 90 }} value={draft.total} onChange={e => patchEdit(m.id, 'total', e.target.value)} />
              <span style={{ color: '#555', fontSize: 10 }}>Accent</span>
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
          <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{m.id} · +{m.reward}CR · {m.total}× · {m.accent}</div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 1 }}>{m.sub}</div>
        </td>
        <td style={S.td}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btn(), padding: '4px 10px', fontSize: 11 }} onClick={() => startEdit(m)} disabled={busy}>Edit</button>
            {type === 'daily' ? (
              <button style={{ ...S.btn('#4a3a1a'), padding: '4px 10px', fontSize: 11 }}
                onClick={() => moveMission(m.id, 'weekly')} disabled={busy}>→ Weekly</button>
            ) : (
              <button style={{ ...S.btn('#1a4a3a'), padding: '4px 10px', fontSize: 11 }}
                onClick={() => moveMission(m.id, 'daily')} disabled={busy}>→ Daily</button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={S.section}>
      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <div style={S.heading}>Global Mission Catalog</div>
        <button style={S.danger} onClick={resetCatalog} disabled={busy}>Reset to defaults</button>
      </div>
      {error && <div style={S.error}>{error}</div>}
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
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const { users, total }        = useUsernames();

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = (name) => wrap(async () => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    const data = await api('GET', `/user/${target}/missions`);
    setMissions(data);
    setEditProg({});
  });

  const reload = async () => {
    const data = await api('GET', `/user/${username.trim()}/missions`);
    setMissions(data);
  };

  const resetAll = () => wrap(async () => {
    if (!window.confirm(`Reset ALL current-period missions for "${username}"?`)) return;
    await api('POST', `/user/${username.trim()}/missions/reset`);
    await reload();
  });

  const setProgress = (type, missionId) => wrap(async () => {
    const raw = editProg[missionId];
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) { setError('Enter a non-negative integer.'); return; }
    await api('POST', `/user/${username.trim()}/missions/set`, { type, missionId, progress: n });
    setEditProg(p => ({ ...p, [missionId]: '' }));
    await reload();
  });

  const complete = (type, missionId) => wrap(async () => {
    await api('POST', `/user/${username.trim()}/missions/complete`, { type, missionId });
    await reload();
  });

  const renderGroup = (type, rows) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ ...S.heading, color: '#7aaff0', marginBottom: 8 }}>{type.toUpperCase()}</div>
      <table style={S.table}>
        <tbody>
          {rows.map(m => {
            const pct = Math.min(100, Math.round((m.progress / m.total) * 100));
            return (
              <tr key={m.id}>
                <td style={{ ...S.tdKey }}>
                  <div style={{ color: '#cde', fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{m.id} · +{m.reward}CR</div>
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 80, height: 6, background: '#1a2030', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: m.awarded ? '#5bf2d4' : '#3a8fd4' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#aab', minWidth: 36, textAlign: 'right' }}>
                      {m.progress}/{m.total}
                    </span>
                    {m.awarded && <span style={S.tag('#1a4a3a')}>AWARDED</span>}
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
    <div style={S.section}>
      <div style={S.heading}>
        User Missions
        {total > 0 && <span style={{ color: '#445', marginLeft: 8 }}>{total} total</span>}
      </div>
      <UsernameBrowser users={users} total={total} selected={username}
        onPick={(u) => load(u)} busy={busy} />
      <UsernameDatalist id="devadmin-mission-usernames" users={users} />
      <div style={S.row}>
        <input style={S.input} placeholder="Reddit username" value={username}
          list="devadmin-mission-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load</button>
        {missions && (
          <button style={S.danger} onClick={resetAll} disabled={busy}>Reset All (current period)</button>
        )}
      </div>
      {error && <div style={S.error}>{error}</div>}
      {missions && (
        <div style={{ marginTop: 14 }}>
          {renderGroup('daily', missions.daily)}
          {renderGroup('weekly', missions.weekly)}
        </div>
      )}
    </div>
  );
}

function RosterPanel() {
  const [username, setUsername]   = useState('');
  const [players, setPlayers]     = useState(null);
  const [error, setError]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [addPick, setAddPick]     = useState({}); // playerId → selected ability name in the "Add" dropdown
  const { users, total }          = useUsernames();

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = (name) => wrap(async () => {
    const target = (name ?? username).trim();
    if (!target) return;
    setUsername(target);
    const data = await api('GET', `/user/${target}/roster`);
    setPlayers(data.players ?? []);
  });

  const saveAbilities = (playerId, abilities) => wrap(async () => {
    await api('POST', `/player/${playerId}/abilities`, { abilities });
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, abilities } : p));
  });

  const removeAt = (player, idx) => {
    const next = [...(player.abilities ?? [])];
    next.splice(idx, 1);
    saveAbilities(player.id, next);
  };

  const addAbility = (player) => {
    const name = addPick[player.id];
    if (!name) return;
    const found = ABILITIES.find(a => a.name === name);
    if (!found) return;
    saveAbilities(player.id, [...(player.abilities ?? []), { ...found }]);
    setAddPick(prev => ({ ...prev, [player.id]: '' }));
  };

  const chip = (label, onRemove) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: '#222', color: '#e0e0e0', padding: '2px 6px 2px 8px', borderRadius: 4, fontSize: 12, marginRight: 6, marginBottom: 4 }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} disabled={busy}
          style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#c66', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
          title="Remove">×</button>
      )}
    </span>
  );

  return (
    <div style={S.section}>
      <div style={S.heading}>
        Player Abilities Editor
        {total > 0 && <span style={{ color: '#445', marginLeft: 8 }}>{total} users</span>}
      </div>
      <UsernameBrowser users={users} total={total} selected={username}
        onPick={(u) => load(u)} busy={busy} />
      <UsernameDatalist id="devadmin-roster-usernames" users={users} />
      <div style={S.row}>
        <input style={S.input} placeholder="Reddit username" value={username}
          list="devadmin-roster-usernames" autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={() => load()} disabled={busy || !username.trim()}>Load Roster</button>
      </div>
      {error && <div style={S.error}>{error}</div>}

      {players && players.length === 0 && (
        <div style={{ color: '#666', marginTop: 10, fontSize: 13 }}>No players found for this user.</div>
      )}

      {players && players.map(p => (
        <div key={p.id} style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 4, padding: 10, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div>
              <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>{p.name || '(unnamed)'}</span>
              <span style={{ color: '#666', marginLeft: 10, fontSize: 12 }}>
                id={p.id} · lvl {p.level} · {p.rarity} · {p.spd}/{p.dex}/{p.jmp}/{p.acc}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Draft ability (read-only):</div>
          <div style={{ marginBottom: 8 }}>
            {p.ability?.name
              ? chip(p.ability.name)
              : <span style={{ color: '#555', fontSize: 12 }}>(none)</span>}
          </div>

          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Level-up abilities (editable):</div>
          <div style={{ marginBottom: 8 }}>
            {(p.abilities ?? []).length === 0
              ? <span style={{ color: '#555', fontSize: 12 }}>(none)</span>
              : (p.abilities ?? []).map((a, i) => (
                  <React.Fragment key={`${a.id ?? i}-${i}`}>{chip(a?.name ?? '(?)', () => removeAt(p, i))}</React.Fragment>
                ))}
          </div>

          <div style={S.row}>
            <select
              style={{ ...S.input, flex: 1 }}
              value={addPick[p.id] ?? ''}
              onChange={e => setAddPick(prev => ({ ...prev, [p.id]: e.target.value }))}>
              <option value="">— add ability —</option>
              {ABILITIES.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
            <button style={S.btn('#1a4a2a')} onClick={() => addAbility(p)} disabled={busy || !addPick[p.id]}>Add</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminStory() {
  return (
    <div style={{ color: '#e0e0e0', fontFamily: 'monospace', maxWidth: 640 }}>
      <h2 style={{ color: '#3a8fd4', fontSize: 16, marginBottom: 4 }}>Admin Panel</h2>
      <p style={{ color: '#555', fontSize: 12, marginBottom: 28 }}>
        Requires <code style={{ color: '#888' }}>devvit playtest</code> running alongside.
        Proxies to <code style={{ color: '#888' }}>localhost:{'{'}WEBBIT_PORT || 3000{'}'}/dev-admin</code>.
      </p>
      <UserPanel />
      <hr style={{ border: 'none', borderTop: '1px solid #222', marginBottom: 28 }} />
      <RosterPanel />
      <hr style={{ border: 'none', borderTop: '1px solid #222', marginBottom: 28 }} />
      <GamesPanel />
      <hr style={{ border: 'none', borderTop: '1px solid #222', marginBottom: 28 }} />
      <CatalogPanel />
      <hr style={{ border: 'none', borderTop: '1px solid #222', marginBottom: 28 }} />
      <MissionsPanel />
    </div>
  );
}
