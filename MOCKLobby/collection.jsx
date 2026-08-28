/* global React */
/* Collection page — player roster + lineup management
   Player shape matches PlayerData from src/server/core/player.ts
   Position is NOT on the player — it lives in the lineup map */

const { useState: useStateC } = React;

// ─── Rarity config ─────────────────────────────────────────────
const RARITY = {
  common:    { color: '#b0b8c8', accent: '#d0d8e8', label: 'COMMON',    stars: 1 },
  rare:      { color: '#30c0e0', accent: '#60d8f8', label: 'RARE',      stars: 3 },
  epic:      { color: '#c060e0', accent: '#e090ff', label: 'EPIC',      stars: 4 },
  legendary: { color: '#e8c060', accent: '#ffe090', label: 'LEGENDARY', stars: 5 },
};

// Ability rarity 1=common 2=epic 3=legendary
const ABILITY_RARITY_COLORS = { 1: '#b0b8c8', 2: '#c060e0', 3: '#e8c060' };

// ─── Position slot colors (matches DraftScreen + CollectionScreen) ─
const POS_COLORS = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };
const POS_ORDER  = ['PG', 'SG', 'SF', 'PF', 'C'];

// ─── OVR computation (never persisted — always computed) ────────
// Uses position weights from the lineup slot; equal weights if unslotted
const OVR_WEIGHTS = {
  PG: { spd: 0.35, dex: 0.30, jmp: 0.10, acc: 0.25 },
  SG: { spd: 0.20, dex: 0.30, jmp: 0.15, acc: 0.35 },
  SF: { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 },
  PF: { spd: 0.15, dex: 0.25, jmp: 0.35, acc: 0.25 },
  C:  { spd: 0.10, dex: 0.20, jmp: 0.45, acc: 0.25 },
};
function calcOvr(player, pos) {
  const w  = OVR_WEIGHTS[pos] ?? { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 };
  const sb = player.statBonuses ?? {};
  return Math.round(
    ((player.spd + (sb.spd ?? 0)) * w.spd) +
    ((player.dex + (sb.dex ?? 0)) * w.dex) +
    ((player.jmp + (sb.jmp ?? 0)) * w.jmp) +
    ((player.acc + (sb.acc ?? 0)) * w.acc),
  );
}

const XP_FOR_LEVEL = level => level * 100;

// ─── Mock roster ───────────────────────────────────────────────
// Matches PlayerData shape from Redis (src/server/core/player.ts).
// No `pos` field — position comes from LINEUP below.
// Names drawn from FIRST_NAMES + LAST_NAMES pools in DraftScreen.jsx.
const ROSTER = [
  {
    id: 1, owner: 'TestUser', name: 'KAEL THORNE',
    level: 5, xp: 340, source: 'draft', rarity: 'rare',
    spd: 81, dex: 73, jmp: 58, acc: 70,
    ability: { id: 7, name: 'SHARPSHOOTER', desc: 'FADE AWAY', rarity: 1 },
    abilities: [],
    statBonuses: { spd: 2, dex: 0, jmp: 0, acc: 1 },
  },
  {
    id: 2, owner: 'TestUser', name: 'NOVA STRAND',
    level: 3, xp: 180, source: 'draft', rarity: 'common',
    spd: 66, dex: 77, jmp: 60, acc: 80,
    ability: null, abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 },
  },
  {
    id: 3, owner: 'TestUser', name: 'ZEX FROST',
    level: 8, xp: 620, source: 'draft', rarity: 'epic',
    spd: 70, dex: 74, jmp: 72, acc: 73,
    ability: { id: 5, name: 'PLAY MAKER', desc: 'PASS INCREASE SHOT %', rarity: 2 },
    abilities: [{ id: 3, name: 'SPEEDY', desc: 'SPD BURST', rarity: 1 }],
    statBonuses: { spd: 0, dex: 4, jmp: 2, acc: 0 },
  },
  {
    id: 4, owner: 'TestUser', name: 'JAX STEELE',
    level: 2, xp: 80, source: 'draft', rarity: 'common',
    spd: 53, dex: 61, jmp: 79, acc: 57,
    ability: null, abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 },
  },
  {
    id: 5, owner: 'TestUser', name: 'REX VOLKOV',
    level: 6, xp: 460, source: 'draft', rarity: 'rare',
    spd: 47, dex: 53, jmp: 84, acc: 56,
    ability: { id: 2, name: 'IRON BLOCK', desc: 'BLOCK BONUS', rarity: 1 },
    abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 3, acc: 0 },
  },
  {
    id: 6, owner: 'TestUser', name: 'ACE MARCH',
    level: 12, xp: 980, source: 'credit', rarity: 'legendary',
    spd: 76, dex: 82, jmp: 65, acc: 88,
    ability: { id: 1, name: 'DUNK MASTER', desc: 'DUNK RATE UP', rarity: 3 },
    abilities: [{ id: 8, name: 'ANKLE BREAKER', desc: 'SPIN MOVES', rarity: 1 }],
    statBonuses: { spd: 3, dex: 5, jmp: 0, acc: 4 },
  },
  {
    id: 7, owner: 'TestUser', name: 'ZEPH CRANE',
    level: 1, xp: 20, source: 'draft', rarity: 'common',
    spd: 73, dex: 67, jmp: 52, acc: 64,
    ability: null, abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 },
  },
  {
    id: 8, owner: 'TestUser', name: 'AXEL ECHO',
    level: 4, xp: 260, source: 'draft', rarity: 'rare',
    spd: 60, dex: 74, jmp: 67, acc: 76,
    ability: { id: 6, name: 'PICK POCKET', desc: 'INCREASED STEAL', rarity: 2 },
    abilities: [],
    statBonuses: { spd: 0, dex: 2, jmp: 0, acc: 0 },
  },
  {
    id: 9, owner: 'TestUser', name: 'RYX BLADE',
    level: 1, xp: 40, source: 'draft', rarity: 'common',
    spd: 52, dex: 56, jmp: 76, acc: 59,
    ability: null, abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 },
  },
  {
    id: 10, owner: 'TestUser', name: 'LYRA VANCE',
    level: 7, xp: 540, source: 'credit', rarity: 'epic',
    spd: 72, dex: 80, jmp: 68, acc: 84,
    ability: { id: 8, name: 'ANKLE BREAKER', desc: 'SPIN MOVES', rarity: 1 },
    abilities: [{ id: 5, name: 'PLAY MAKER', desc: 'PASS INCREASE SHOT %', rarity: 2 }],
    statBonuses: { spd: 2, dex: 3, jmp: 0, acc: 2 },
  },
];

// Lineup: pos → player id (matches user:lineup:{username} Redis hash).
// A player has no intrinsic position — the slot label is their position.
const DEFAULT_LINEUP = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };

window.ROSTER        = ROSTER;
window.DEFAULT_LINEUP = DEFAULT_LINEUP;
window.POS_COLORS    = POS_COLORS;
window.RARITY        = RARITY;

// ─── Stars ─────────────────────────────────────────────────────
function Stars({ count, max = 5, size = 14 }) {
  return (
    <div className="stars" style={{ "--star-size": `${size}px` }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < count ? "on" : ""}`}>★</span>
      ))}
    </div>
  );
}

// ─── Squad slot ─────────────────────────────────────────────────
// `pos` is the slot label (PG/SG/…). OVR is computed with that slot's weights.
function SquadSlot({ pos, player, isFirst, selected, onClick }) {
  const rc       = player ? (RARITY[player.rarity] ?? RARITY.common) : null;
  const posColor = POS_COLORS[pos];
  const ovr      = player ? calcOvr(player, pos) : null;

  if (!player) {
    return (
      <button className="squad-slot empty" onClick={onClick}
              style={{ "--c": posColor, "--ca": posColor }}>
        <span className="squad-pos" style={{ background: posColor }}>{pos}</span>
        <span className="empty-mark">+</span>
        <span className="empty-lbl">EMPTY</span>
      </button>
    );
  }
  return (
    <button
      className={`squad-slot ${isFirst ? "leader" : ""} ${selected ? "selected" : ""}`}
      onClick={onClick}
      style={{ "--c": rc.color, "--ca": rc.accent }}
    >
      {isFirst && <div className="leader-banner">LEADER</div>}
      <div className="squad-portrait" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${rc.color}66, transparent 70%),
                     linear-gradient(180deg, ${rc.color}22, ${rc.color}05)`,
      }}>
        <img src="assets/idle.gif" className="px-sprite" alt="" />
      </div>
      <div className="squad-overlay" />
      <div className="squad-pos" style={{ background: posColor }}>{pos}</div>
      <div className="squad-info">
        <span className="squad-lvl">Lv<b>{player.level}</b></span>
        <span className="squad-ovr">{ovr}</span>
      </div>
      <Stars count={rc.stars} size={8} />
    </button>
  );
}

// ─── Player band (grid card) ────────────────────────────────────
function PlayerBand({ player, lineupPos, selected, onClick }) {
  const rc = RARITY[player.rarity] ?? RARITY.common;
  return (
    <button
      className={`player-band ${selected ? "selected" : ""}`}
      onClick={() => onClick(player.id)}
      style={{ "--c": rc.color, "--ca": rc.accent }}
    >
      <div className="band-bg">
        <div className="band-pattern" data-pat={player.id % 4} />
        <div className="band-tint" />
      </div>
      <div className="band-portrait">
        <img src="assets/idle.gif" className="px-sprite px-band" alt="" />
      </div>
      {lineupPos && (
        <div className="band-badge" style={{ background: POS_COLORS[lineupPos] }}>
          {lineupPos}
        </div>
      )}
      <div className="band-vlevel">
        <span>LV</span>
        <span>{player.level}</span>
      </div>
      <div className="band-name">{player.name}</div>
      <div className="band-bottom">
        <Stars count={rc.stars} size={11} />
      </div>
    </button>
  );
}

// ─── Detail panel ───────────────────────────────────────────────
function DetailPanel({ player, lineupPos, lineup, onAssign, onRemove, onAction }) {
  if (!player) return null;
  const rc      = RARITY[player.rarity] ?? RARITY.common;
  const sb      = player.statBonuses ?? {};
  const ovr     = calcOvr(player, lineupPos);
  const xpMax   = XP_FOR_LEVEL(player.level);
  const allAbilities = [player.ability, ...(player.abilities ?? [])].filter(Boolean);

  const stats = [
    { lbl: 'SPD', base: player.spd, bonus: sb.spd ?? 0, color: '#20c8e0' },
    { lbl: 'DEX', base: player.dex, bonus: sb.dex ?? 0, color: '#9860e0' },
    { lbl: 'JMP', base: player.jmp, bonus: sb.jmp ?? 0, color: '#30d060' },
    { lbl: 'ACC', base: player.acc, bonus: sb.acc ?? 0, color: '#e09030' },
  ];

  return (
    <div className="detail-panel" style={{ "--c": rc.color, "--ca": rc.accent }}>

      {/* Portrait */}
      <div className="detail-portrait" style={{
        background: `radial-gradient(ellipse at 50% 35%, ${rc.color}55, transparent 65%),
                     linear-gradient(180deg, ${rc.color}1f 0%, ${rc.color}06 60%, transparent 100%)`,
      }}>
        <div className="dp-scan" />
        <div className="dp-floor" />
        <span className="dp-corner tl" /><span className="dp-corner tr" />
        <span className="dp-corner bl" /><span className="dp-corner br" />
        <span className="dp-tag">{rc.label}</span>
        <span className="dp-id">ID·{String(player.id).padStart(4, '0')}</span>
        <img src="assets/idle.gif" className="px-sprite dp-sprite" alt="" />
      </div>

      {/* Info */}
      <div className="detail-l">
        <button className="detail-view">
          <span className="ico">⌕</span>
          <span>VIEW FULL</span>
        </button>
        <div className="detail-head">
          {lineupPos && (
            <span className="dl-pos" style={{ background: POS_COLORS[lineupPos] }}>
              {lineupPos}
            </span>
          )}
          <span className="dl-lvl">
            Lv <b>{player.level}</b>
            <span className="slash"> · XP {player.xp}/{xpMax}</span>
          </span>
          <span className="dl-role">{player.source.toUpperCase()}</span>
          <span className="dl-ovr">{ovr}<em>OVR</em></span>
        </div>
        <div className="detail-name">
          <span className="dn-en">{player.name}</span>
          <Stars count={rc.stars} size={16} />
        </div>
        <div className="detail-stats">
          {stats.map((s) => {
            const effective = s.base + s.bonus;
            return (
              <div key={s.lbl} className="stat-line">
                <span className="sl-lbl">{s.lbl}</span>
                <span className="sl-bar">
                  <span className="sl-fill" style={{
                    width: `${Math.min(100, effective)}%`,
                    background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                    boxShadow: `0 0 8px ${s.color}80`,
                  }} />
                </span>
                <span className="sl-val">
                  {effective}
                  {s.bonus > 0 && (
                    <em style={{ fontSize: 10, color: '#30d060', marginLeft: 3 }}>+{s.bonus}</em>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="detail-skill">
          {allAbilities.length === 0 ? (
            <span className="ds-h none">NO ABILITIES</span>
          ) : allAbilities.map((ab, i) => {
            const abColor = ABILITY_RARITY_COLORS[ab.rarity] ?? '#888';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="ability-chip" style={{
                  background: `linear-gradient(135deg, ${abColor}, ${abColor}aa)`,
                }}>
                  {ab.name}
                </span>
                <span className="ds-body">{ab.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="detail-r">
        <div className="capacity">
          <span className="cap-lbl">ROSTER</span>
          <span className="cap-val">{ROSTER.length}<em>/100</em></span>
          <button className="cap-add">+</button>
        </div>
        <div className="actions" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {POS_ORDER.map(pos => {
            const isMySlot   = lineupPos === pos;
            const isOccupied = !isMySlot && lineup[pos] != null;
            return (
              <button
                key={pos}
                className={`act-btn ${isMySlot ? "primary" : ""}`}
                style={isMySlot ? { borderColor: POS_COLORS[pos] } : {}}
                onClick={() => isMySlot ? onRemove(pos) : onAssign(player.id, pos)}
              >
                <span className="ab-glyph" style={{ background: POS_COLORS[pos], color: '#fff' }}>
                  {pos}
                </span>
                <span className="ab-lbl">{isMySlot ? "REMOVE" : isOccupied ? "SWAP" : "SET"}</span>
              </button>
            );
          })}
          <button className="act-btn primary" onClick={() => onAction("auction")}>
            <span className="ab-glyph">¤</span>
            <span className="ab-lbl">AUCTION</span>
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Squad bar ──────────────────────────────────────────────────
function SquadBar({ roster, lineup, selectedId, onSlotClick }) {
  const byId    = new Map(roster.map(p => [p.id, p]));
  const totalOvr = POS_ORDER.reduce((sum, pos) => {
    const p = byId.get(lineup[pos]);
    return sum + (p ? calcOvr(p, pos) : 0);
  }, 0);

  return (
    <div className="squad-bar">
      <div className="sqb-l">
        <div className="party-tag">
          <span className="pt-h">LINEUP</span>
        </div>
        <div className="squad-row">
          {POS_ORDER.map((pos, i) => (
            <SquadSlot
              key={pos}
              pos={pos}
              player={byId.get(lineup[pos]) ?? null}
              isFirst={i === 0}
              selected={lineup[pos] === selectedId}
              onClick={() => onSlotClick(pos)}
            />
          ))}
        </div>
      </div>
      <div className="sqb-r">
        <div className="power">
          <span className="pw-lbl">TEAM OVR</span>
          <span className="pw-val">{totalOvr}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Collection root ────────────────────────────────────────────
function CollectionView({ onBack, onAuction }) {
  const [selectedId, setSelectedId] = useStateC(null);
  const [lineup, setLineup]         = useStateC({ ...DEFAULT_LINEUP });

  const selected   = selectedId ? ROSTER.find(p => p.id === selectedId) : null;
  const lineupPos  = selected
    ? (Object.entries(lineup).find(([, id]) => id === selectedId)?.[0] ?? null)
    : null;

  React.useEffect(() => {
    if (!selected) return;
    const onKey = e => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleSlotClick = (pos) => {
    const pid = lineup[pos];
    if (pid) setSelectedId(pid);
  };

  const handleAssign = (playerId, pos) => {
    setLineup(prev => {
      const next = { ...prev };
      for (const p of POS_ORDER) { if (next[p] === playerId) delete next[p]; }
      next[pos] = playerId;
      return next;
    });
  };

  const handleRemove = (pos) => {
    setLineup(prev => { const next = { ...prev }; delete next[pos]; return next; });
  };

  const handleAction = action => {
    if (action === 'auction' && onAuction) onAuction(selectedId);
    else console.log('action:', action, selectedId);
  };

  const rc = selected ? (RARITY[selected.rarity] ?? RARITY.common) : null;

  return (
    <div className="collection">
      <div className="col-topnav">
        <button className="back-btn" onClick={onBack}>
          <span className="bk-glyph">◀</span>
          <span>READY ROOM</span>
        </button>
        <div className="col-title">
          <span className="ct-big">COLLECTION</span>
          <span className="ct-sub">PLAYER REGISTRY</span>
        </div>
        <button className="filter-btn">
          <span className="fb-glyph">≡</span>
          <span>SORT · FILTER</span>
        </button>
      </div>

      <SquadBar
        roster={ROSTER}
        lineup={lineup}
        selectedId={selectedId}
        onSlotClick={handleSlotClick}
      />

      {selected && (
        <div className="col-detail-inline"
             style={{ "--c": rc.color, "--ca": rc.accent }}>
          <button className="col-detail-close" onClick={() => setSelectedId(null)}>
            <span className="cdc-glyph">✕</span>
            <span className="cdc-lbl">CLOSE</span>
          </button>
          <DetailPanel
            player={selected}
            lineupPos={lineupPos}
            lineup={lineup}
            onAssign={handleAssign}
            onRemove={handleRemove}
            onAction={handleAction}
          />
        </div>
      )}

      <div className="collection-grid-wrap">
        <div className="cgw-hint">SELECT A PLAYER TO VIEW OR ASSIGN TO LINEUP</div>
        <div className="collection-grid">
          {ROSTER.map(p => {
            const pPos = Object.entries(lineup).find(([, id]) => id === p.id)?.[0] ?? null;
            return (
              <PlayerBand
                key={p.id}
                player={p}
                lineupPos={pPos}
                selected={selectedId === p.id}
                onClick={setSelectedId}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.CollectionView = CollectionView;
