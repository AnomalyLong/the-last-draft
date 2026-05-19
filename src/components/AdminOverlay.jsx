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

const PAGE_SIZE = 30;

const RARITY_COLOR = { common: '#778', rare: '#3a8fd4', epic: '#a060e0', legendary: '#e0a030' };

function UserPanel() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [roster, setRoster] = useState(null);
  const [credits, setCredits] = useState('');
  const [freeDrafts, setFreeDrafts] = useState('');
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [listData, setListData] = useState(null); // { users, total }
  const [confirmReset, setConfirmReset] = useState(false);
  const { busy, msg, wrap, setMsg } = useWrap();

  const fetchPage = (p) => {
    trpc.admin.listUsers.query({ offset: p * PAGE_SIZE, limit: PAGE_SIZE })
      .then(data => { setListData(data); setPage(p); setFilter(''); })
      .catch(() => {});
  };

  useEffect(() => { fetchPage(0); }, []);

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

  const totalPages = listData ? Math.ceil(listData.total / PAGE_SIZE) : 0;
  const visibleUsers = listData
    ? (filter ? listData.users.filter(u => u.toLowerCase().includes(filter.toLowerCase())) : listData.users)
    : [];

  return (
    <div>
      <div style={S.heading}>
        Users
        {listData && <span style={{ color: '#445', marginLeft: 8 }}>{listData.total} total</span>}
      </div>

      {listData && (
        <>
          <input
            style={{ ...S.input, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
            placeholder="Filter this page…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8, minHeight: 28 }}>
            {visibleUsers.map(u => (
              <button key={u} onClick={() => load(u)} disabled={busy}
                style={{ background: username === u ? '#1a3a6a' : '#0a1220', border: `1px solid ${username === u ? '#3a6aaa' : '#2a3a58'}`, color: username === u ? '#e0e0e0' : '#778', padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}>
                {u}
              </button>
            ))}
            {visibleUsers.length === 0 && <span style={{ color: '#334', fontSize: 11 }}>no matches</span>}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button style={S.btn()} onClick={() => fetchPage(page - 1)} disabled={page === 0}>←</button>
              <span style={{ color: '#556', fontSize: 11 }}>page {page + 1} / {totalPages}</span>
              <button style={S.btn()} onClick={() => fetchPage(page + 1)} disabled={page >= totalPages - 1}>→</button>
            </div>
          )}
        </>
      )}

      <div style={{ ...S.row, marginBottom: 4 }}>
        <input style={S.input} placeholder="Reddit username" value={username}
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

const TABS = ['User', 'Games', 'Admins'];

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
          {tab === 2 && <AdminsPanel />}
        </div>
      </div>
    </div>
  );
}
