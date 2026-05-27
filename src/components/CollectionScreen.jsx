import React, { useState, useEffect, useRef } from 'react';
import '../../lobby/collection.css';
import '../../lobby/collection-grid.css';
import '../../lobby/mobile-collection.css';
import { IDLE_FRAMES } from '../sprites/idle.js';
import { JERSEY_BASE } from '../constants.js';
import { trpc } from '../trpc';

// ─── Pixel sprite renderer ──────────────────────────────────────
// When `className` is passed (e.g. "px-sprite px-band"), the SVG has no
// explicit width/height so CSS rules control its display size; aspect-ratio
// keeps proportions. Without className, `scale` sets the rendered pixel size.
function PixelSprite({ frames = IDLE_FRAMES, frameInterval = 120, scale = 4, jerseyColor = '#19e6c4', className, style }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const tick = (now) => {
      if (!start) start = now;
      setFrameIdx(Math.floor((now - start) / frameInterval) % frames.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, frameInterval]);

  const pixels = frames[frameIdx] ?? frames[0];
  let maxX = 0, maxY = 0;
  for (const [x, y] of pixels) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const gridW = maxX + 1;
  const gridH = maxY + 1;

  // CSS-driven size: viewBox uses grid coords (1 unit = 1 pixel), aspect-ratio
  // lets CSS width drive height. Scale-driven size: multiply by scale.
  const cssDriven = !!className;
  const vW = cssDriven ? gridW : gridW * scale;
  const vH = cssDriven ? gridH : gridH * scale;
  const ps = cssDriven ? 1 : scale;

  return (
    <svg
      viewBox={`0 0 ${vW} ${vH}`}
      {...(!cssDriven && { width: vW, height: vH })}
      className={className}
      shapeRendering="crispEdges"
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        ...(cssDriven && { aspectRatio: `${gridW} / ${gridH}` }),
        ...style,
      }}
    >
      {pixels.map(([x, y, fill], i) => (
        <rect
          key={i}
          x={x * ps} y={y * ps}
          width={ps} height={ps}
          fill={fill === JERSEY_BASE ? jerseyColor : fill}
        />
      ))}
    </svg>
  );
}

// ─── Rarity config ─────────────────────────────────────────────
const RARITY = {
  common:     { color: '#b0b8c8', accent: '#d8dde6', label: 'COMMON' },
  rare:       { color: '#b0b8c8', accent: '#d8dde6', label: 'UNCOMMON' },
  super_rare: { color: '#30c0e0', accent: '#60d8f0', label: 'RARE' },
  ultra_rare: { color: '#ffc94a', accent: '#ffe080', label: 'ULTRA RARE' },
};

const ABILITY_RARITY_COLORS = { 1: '#b0b8c8', 2: '#c060e0', 3: '#e8c060' };

const POS_COLORS = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };
const POS_ORDER  = ['PG', 'SG', 'SF', 'PF', 'C'];

// ─── OVR computation ────────────────────────────────────────────
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

// ─── Dev fallback mock data ─────────────────────────────────────
const ROSTER = [
  { id: 1, owner: 'TestUser', name: 'KAEL THORNE', level: 5, xp: 340, source: 'draft', rarity: 'ultra_rare', spd: 81, dex: 73, jmp: 58, acc: 70, ability: { id: 7, name: 'SHARPSHOOTER', desc: 'FADE AWAY', rarity: 1 }, abilities: [], statBonuses: { spd: 2, dex: 0, jmp: 0, acc: 1 } },
  { id: 2, owner: 'TestUser', name: 'NOVA STRAND',  level: 3, xp: 180, source: 'draft', rarity: 'rare', spd: 66, dex: 77, jmp: 60, acc: 80, ability: null, abilities: [], statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 3, owner: 'TestUser', name: 'ZEX FROST',    level: 8, xp: 620, source: 'draft', rarity: 'super_rare', spd: 70, dex: 74, jmp: 72, acc: 73, ability: { id: 5, name: 'PLAY MAKER', desc: 'PASS INCREASE SHOT %', rarity: 2 }, abilities: [{ id: 3, name: 'SPEEDY', desc: 'SPD BURST', rarity: 1 }], statBonuses: { spd: 0, dex: 4, jmp: 2, acc: 0 } },
  { id: 4, owner: 'TestUser', name: 'JAX STEELE',   level: 2, xp: 80,  source: 'draft', rarity: 'rare', spd: 53, dex: 61, jmp: 79, acc: 57, ability: null, abilities: [], statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 5, owner: 'TestUser', name: 'REX VOLKOV',   level: 6, xp: 460, source: 'draft', rarity: 'super_rare', spd: 47, dex: 53, jmp: 84, acc: 56, ability: { id: 2, name: 'IRON BLOCK', desc: 'BLOCK BONUS', rarity: 1 }, abilities: [], statBonuses: { spd: 0, dex: 0, jmp: 3, acc: 0 } },
];
const DEFAULT_LINEUP = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };

// ─── Helpers ───────────────────────────────────────────────────
const countAbilities = p => [p?.ability, ...(p?.abilities ?? [])].filter(Boolean).length;

// ─── Stars ─────────────────────────────────────────────────────
function Stars({ count, size = 14 }) {
  if (!count) return null;
  return (
    <div className="stars" style={{ '--star-size': `${size}px` }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="star on">★</span>
      ))}
    </div>
  );
}

// ─── Squad slot ─────────────────────────────────────────────────
function SquadSlot({ pos, player, isFirst, selected, onClick }) {
  const rc       = player ? (RARITY[player.rarity] ?? RARITY.common) : null;
  const posColor = POS_COLORS[pos];
  const ovr      = player ? calcOvr(player, pos) : null;

  if (!player) {
    return (
      <button className="squad-slot empty" onClick={onClick}
              style={{ '--c': posColor, '--ca': posColor }}>
        <span className="squad-pos" style={{ background: posColor }}>{pos}</span>
        <span className="empty-mark">+</span>
        <span className="empty-lbl">EMPTY</span>
      </button>
    );
  }
  return (
    <button
      className={`squad-slot ${isFirst ? 'leader' : ''} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ '--c': rc.color, '--ca': rc.accent }}
    >
      {isFirst && <div className="leader-banner">LEADER</div>}
      <div className="squad-portrait" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${rc.color}66, transparent 70%),
                     linear-gradient(180deg, ${rc.color}22, ${rc.color}05)`,
      }}>
        <PixelSprite className="px-sprite" jerseyColor={rc.color} style={{ filter: `drop-shadow(0 0 6px ${rc.color}80)` }} />
      </div>
      <div className="squad-overlay" />
      <div className="squad-pos" style={{ background: posColor }}>{pos}</div>
      <div className="squad-info">
        <span className="squad-lvl">Lv<b>{player.level}</b></span>
        <span className="squad-ovr">{ovr}</span>
      </div>
      <Stars count={countAbilities(player)} size={8} />
    </button>
  );
}

// ─── Player band (grid card) ────────────────────────────────────
function PlayerBand({ player, lineupPos, selected, onClick }) {
  const rc = RARITY[player.rarity] ?? RARITY.common;
  return (
    <button
      className={`player-band ${selected ? 'selected' : ''}`}
      onClick={() => onClick(player.id)}
      style={{ '--c': rc.color, '--ca': rc.accent }}
    >
      <div className="band-bg">
        <div className="band-pattern" data-pat={player.id % 4} />
        <div className="band-tint" />
      </div>
      <div className="band-portrait">
        <PixelSprite className="px-sprite px-band" jerseyColor={rc.color} style={{ filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.6))` }} />
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
        <Stars count={countAbilities(player)} size={11} />
      </div>
    </button>
  );
}

// ─── Detail panel ───────────────────────────────────────────────
function DetailPanel({ player, lineupPos, lineup, rosterCount, onAssign, onRemove, onAction }) {
  const [pickingPos, setPickingPos] = useState(false);
  if (!player) return null;
  const rc           = RARITY[player.rarity] ?? RARITY.common;
  const sb           = player.statBonuses ?? {};
  const ovr          = calcOvr(player, lineupPos);
  const xpMax        = XP_FOR_LEVEL(player.level);
  const allAbilities = [player.ability, ...(player.abilities ?? [])].filter(Boolean);

  const stats = [
    { lbl: 'SPD', base: player.spd, bonus: sb.spd ?? 0, color: '#20c8e0' },
    { lbl: 'DEX', base: player.dex, bonus: sb.dex ?? 0, color: '#9860e0' },
    { lbl: 'JMP', base: player.jmp, bonus: sb.jmp ?? 0, color: '#30d060' },
    { lbl: 'ACC', base: player.acc, bonus: sb.acc ?? 0, color: '#e09030' },
  ];

  return (
    <div className="detail-panel" style={{ '--c': rc.color, '--ca': rc.accent }}>

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
        <PixelSprite className="dp-sprite" jerseyColor={rc.color} style={{
          filter: `drop-shadow(0 6px 14px rgba(0,0,0,0.7)) drop-shadow(0 0 8px ${rc.color}80)`,
          animation: 'dpHover 2.4s ease-in-out infinite',
        }} />
      </div>

      {/* Info */}
      <div className="detail-l">
        <div className="detail-head">
          <span className="dl-lvl">
            Lv <b>{player.level}</b>
            <span className="slash"> / 50</span>
          </span>
          {lineupPos && (
            <span className="dl-pos" style={{ background: POS_COLORS[lineupPos] }}>
              {lineupPos}
            </span>
          )}
          <span className="dl-role">{player.source.toUpperCase()}</span>
          <span className="dl-ovr">{ovr}<em>OVR</em></span>
        </div>
        <div className="detail-name">
          <span className="dn-en">{player.name}</span>
          <Stars count={allAbilities.length} size={16} />
        </div>
        <button className="detail-view">
          <span className="ico">⌕</span>
          <span>VIEW FULL</span>
        </button>
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
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
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
        {pickingPos ? (
          <div className="actions">
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.2em', color: '#888', marginBottom: 4 }}>ASSIGN POSITION</div>
            {POS_ORDER.map(pos => {
              const isMySlot   = lineupPos === pos;
              const isOccupied = !isMySlot && lineup[pos] != null;
              return (
                <button key={pos} className={`act-btn ${isMySlot ? 'primary' : ''}`}
                  style={{ '--c': POS_COLORS[pos], borderColor: isMySlot ? POS_COLORS[pos] : undefined }}
                  onClick={() => { isMySlot ? onRemove(pos) : onAssign(player.id, pos); setPickingPos(false); }}>
                  <span className="ab-glyph" style={{ background: POS_COLORS[pos], color: '#fff' }}>{pos}</span>
                  <span className="ab-lbl">{isMySlot ? 'REMOVE' : isOccupied ? 'SWAP' : 'SET'}</span>
                </button>
              );
            })}
            <button className="act-btn" onClick={() => setPickingPos(false)}>
              <span className="ab-lbl">CANCEL</span>
            </button>
          </div>
        ) : (
          <div className="actions">
            <button className="act-btn primary" onClick={() => setPickingPos(true)}>
              <span className="ab-glyph" style={lineupPos ? { background: POS_COLORS[lineupPos], color: '#fff' } : {}}>
                {lineupPos ?? '＋'}
              </span>
              <span className="ab-lbl">{lineupPos ? 'CHANGE POS' : 'ASSIGN POS'}</span>
            </button>
            <button className="act-btn" onClick={() => onAction('auction')}>
              <span className="ab-glyph">¤</span>
              <span className="ab-lbl">AUCTION</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Squad bar ──────────────────────────────────────────────────
function SquadBar({ roster, lineup, selectedId, onSlotClick }) {
  const byId     = new Map(roster.map(p => [p.id, p]));
  const totalOvr = POS_ORDER.reduce((sum, pos) => {
    const p = byId.get(Number(lineup[pos]));
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
              player={byId.get(Number(lineup[pos])) ?? null}
              isFirst={i === 0}
              selected={Number(lineup[pos]) === selectedId}
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

// ─── Root component ─────────────────────────────────────────────
export function CollectionScreen({ roster = [], lineup: lineupProp = {}, username = '', credits = 0, onBack, onAuction, onLineupChange, isMobile: isMobileProp }) {
  const activeRoster = roster.length ? roster : ROSTER;
  const [selectedId, setSelectedId]       = useState(null);
  const [lineup, setLineup]               = useState(() =>
    Object.keys(lineupProp).length ? { ...lineupProp } : { ...DEFAULT_LINEUP }
  );
  const containerRef = useRef(null);

  useEffect(() => {
    if (Object.keys(lineupProp).length) setLineup({ ...lineupProp });
  }, [lineupProp]);

  // Set body.is-mobile so mobile-collection.css overrides apply.
  // If isMobileProp is explicitly passed (story/test), use that; otherwise auto-detect.
  useEffect(() => {
    if (isMobileProp !== undefined) {
      document.body.classList.toggle('is-mobile', isMobileProp);
      return () => document.body.classList.remove('is-mobile');
    }
    const update = () => {
      document.body.classList.toggle('is-mobile', window.innerWidth < window.innerHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.body.classList.remove('is-mobile');
    };
  }, [isMobileProp]);

  // Set body.is-narrow / body.is-xs based on collection container width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      document.body.classList.toggle('is-narrow', w < 900);
      document.body.classList.toggle('is-xs', w < 430);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.classList.remove('is-narrow');
      document.body.classList.remove('is-xs');
    };
  }, []);

  const selected  = selectedId ? activeRoster.find(p => p.id === selectedId) : null;
  const lineupPos = selected
    ? (Object.entries(lineup).find(([, id]) => Number(id) === selectedId)?.[0] ?? null)
    : null;

  useEffect(() => {
    if (!selected) return;
    const onKey = e => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleSlotClick = (pos) => {
    const pid = lineup[pos];
    if (pid) setSelectedId(Number(pid));
  };

  // Persist the full lineup to the server (full-replace; validates ownership
  // and rejects duplicates server-side). Fire-and-forget — local state is the
  // source of truth for the session, and onLineupChange keeps the parent synced.
  const persistLineup = (next) => {
    onLineupChange?.(next);
    if (!username) return;
    const payload = {};
    for (const p of POS_ORDER) if (next[p] != null) payload[p] = Number(next[p]);
    trpc.user.setLineup.mutate({ lineup: payload }).catch(() => {});
  };

  const handleAssign = (playerId, pos) => {
    const pid = Number(playerId);
    const next = { ...lineup };
    // Where the incoming player currently sits (if anywhere).
    const oldPos = POS_ORDER.find(p => Number(next[p]) === pid) ?? null;
    // Who currently occupies the target slot (if anyone).
    const displaced = next[pos] != null ? Number(next[pos]) : null;

    next[pos] = pid;
    if (oldPos && oldPos !== pos) {
      // True swap: the displaced player takes the incoming player's old slot.
      if (displaced != null && displaced !== pid) next[oldPos] = displaced;
      else delete next[oldPos];
    }
    // If the incoming player had no prior slot, the displaced player is simply
    // bumped to the bench (their slot is now the incoming player's).
    setLineup(next);
    persistLineup(next);
  };

  const handleRemove = (pos) => {
    const next = { ...lineup };
    delete next[pos];
    setLineup(next);
    persistLineup(next);
  };

  const handleAction = action => {
    if (action === 'auction' && onAuction) onAuction(selectedId);
  };

  const rc = selected ? (RARITY[selected.rarity] ?? RARITY.common) : null;

  return (
    <div ref={containerRef} data-state="collection" style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
      <div className="collection">
        <div className="col-topnav">
          <button className="back-btn" onClick={onBack}>
            <span className="bk-glyph">◀</span>
          </button>
          <div className="col-title">
            <span className="ct-big">COLLECTION</span>
            <span className="ct-sub">PLAYER REGISTRY</span>
          </div>
        </div>

        <SquadBar
          roster={activeRoster}
          lineup={lineup}
          selectedId={selectedId}
          onSlotClick={handleSlotClick}
        />

        {selected && (
          <div className="col-detail-inline"
               style={{ '--c': rc.color, '--ca': rc.accent }}>
            <button className="col-detail-close" onClick={() => setSelectedId(null)}>
              <span className="cdc-glyph">✕</span>
              <span className="cdc-lbl">CLOSE</span>
            </button>
            <DetailPanel
              player={selected}
              lineupPos={lineupPos}
              lineup={lineup}
              rosterCount={activeRoster.length}
              onAssign={handleAssign}
              onRemove={handleRemove}
              onAction={handleAction}
            />
          </div>
        )}

        <div className="collection-grid-wrap">
          <div className="cgw-hint">SELECT A PLAYER TO VIEW OR ASSIGN TO LINEUP</div>
          <div className="collection-grid">
            {activeRoster.map(p => {
              const pPos = Object.entries(lineup).find(([, id]) => Number(id) === p.id)?.[0] ?? null;
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

    </div>
  );
}
