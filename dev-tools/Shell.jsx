import React, { useState } from 'react';

const NAV_W = 180;

const NAV_ITEMS = [
  { id: 'sprites',     label: '🎨 Sprites' },
  { id: 'title',       label: '🏠 Title Screen' },
  { id: 'options',     label: '⚙️ Options Screen' },
  { id: 'teamSelect',  label: '🏀 Team Select' },
  { id: 'draft',       label: '📋 Draft Screen' },
  { id: 'matchmaking', label: '🔍 Matchmaking' },
  { id: 'collection',  label: '🃏 Collection' },
  { id: 'collection2', label: '🃏 Collection 2' },
  { id: 'court',       label: '🏟 Court (Live)' },
  { id: 'admin',       label: '🔧 Admin' },
];

const navStyle = {
  width: NAV_W,
  minWidth: NAV_W,
  background: '#111',
  borderRight: '1px solid #2a2a2a',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 0',
  gap: 2,
  userSelect: 'none',
};

const itemBase = {
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'monospace',
  borderLeft: '3px solid transparent',
  color: '#888',
};

const itemActive = {
  ...itemBase,
  borderLeft: '3px solid #3a8fd4',
  color: '#e0e0e0',
  background: '#1a1a1a',
};

export default function Shell({ pages }) {
  const [active, setActive] = useState(NAV_ITEMS[0].id);
  const Page = pages[active];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d' }}>
      <nav style={navStyle}>
        <div style={{ padding: '0 16px 12px', color: '#555', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
          Dev Tools
        </div>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            style={active === item.id ? itemActive : itemBase}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </div>
        ))}
      </nav>

      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {Page ? <Page /> : <div style={{ color: '#555' }}>No page found for "{active}"</div>}
      </main>
    </div>
  );
}
