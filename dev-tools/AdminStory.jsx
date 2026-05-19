import React, { useState } from 'react';

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

  const wrap = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const load = () => wrap(async () => {
    const data = await api('GET', `/user/${username.trim()}`);
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
      <div style={S.heading}>User Lookup</div>
      <div style={S.row}>
        <input style={S.input} placeholder="Reddit username" value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()} />
        <button style={S.btn()} onClick={load} disabled={busy || !username.trim()}>Load</button>
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
      <GamesPanel />
    </div>
  );
}
