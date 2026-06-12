import React, { useState } from 'react';
import { PixelText, PixelTextC } from '@src/components/PixelText.jsx';
import { JERSEY_HOME, JERSEY_AWAY } from '@src/constants.js';

/*
  Brand Design Guide — living reference for THE MBA's visual identity.

  Organized by brand language, not by screen. Every value is sourced from code:
    - src/styles/lobby.css        (holo tokens, glow, scanlines, glass)
    - src/components/DraftScreen.css / .jsx  (hologram UI, holo grid, anomaly scan)
    - src/components/TitleScreen.jsx         (pixel/arcade palette, MenuButton)
    - src/constants.js / HUD.jsx             (court palette, functional colors)
  If a value changes in code, update it here too.
*/

// ── palette data ────────────────────────────────────────────────────────────

const FOUNDATION = [
  { hex: '#02060a', name: 'Void',           use: 'Base black — near-black blue, never #000' },
  { hex: '#0d1220', name: 'Midnight',       use: 'Pixel-surface background (title, panels)' },
  { hex: '#060e1a', name: 'Panel',          use: 'HUD / chrome panel fill' },
  { hex: '#243650', name: 'Panel Border',   use: 'Steel-blue strokes and frames' },
  { hex: '#eaf6f3', name: 'Ink',            use: 'Body text on dark (62% alpha when dim)' },
  { hex: '#b0b8c8', name: 'Steel',          use: 'Muted text, common tier' },
];

const SIGNALS = [
  { hex: '#19e6c4', name: 'Signal Teal',    use: 'THE hologram color. You, the system, home' },
  { hex: '#5bf2d4', name: 'Teal Glow',      use: 'Wireframes, scan lines, hover glow' },
  { hex: '#ff2d6f', name: 'Rival Magenta',  use: 'Opponents, featured events, urgency' },
  { hex: '#ff6b9a', name: 'Magenta Glow',   use: 'Rival glow / hover states' },
  { hex: '#e8c060', name: 'Arcade Gold',    use: 'Pixel-world titles, ultra rarity' },
  { hex: '#ffd97a', name: 'Reward Gold',    use: 'Credits & rewards (gradient to #c07a10)' },
  { hex: '#ff3a6a', name: 'Lock Red',       use: 'Targeting reticles, locked states, alerts' },
];

const COURT_PALETTE = [
  { hex: JERSEY_HOME, name: 'JERSEY_HOME',  use: 'Home jersey blue' },
  { hex: JERSEY_AWAY, name: 'JERSEY_AWAY',  use: 'Away jersey red' },
  { hex: '#AC2C17',   name: 'Game Ball',    use: 'Ball in sprites (never #FF0000)' },
  { hex: '#e07828',   name: 'Ball Orange',  use: 'Ball in marketing / line art' },
  { hex: '#8a6a3a',   name: 'Court Wood',   use: 'Floor markings, warm wood tones' },
  { hex: '#c8e4ff',   name: 'Ice',          use: 'Scoreboard numerals, HUD highlights' },
];

// Two functional palettes — one per world. Same meaning, different rendering context.
const POS_HOLO = [
  { hex: '#3ea6ff', name: 'PG', use: 'Point Guard' },
  { hex: '#a855f7', name: 'SG', use: 'Shooting Guard' },
  { hex: '#19e6c4', name: 'SF', use: 'Small Forward' },
  { hex: '#ff7a3c', name: 'PF', use: 'Power Forward' },
  { hex: '#ffc94a', name: 'C',  use: 'Center' },
];
const POS_COURT = [
  { hex: '#2a7adf', name: 'PG', use: 'Point Guard' },
  { hex: '#6a5ade', name: 'SG', use: 'Shooting Guard' },
  { hex: '#28b050', name: 'SF', use: 'Small Forward' },
  { hex: '#d07030', name: 'PF', use: 'Power Forward' },
  { hex: '#c03838', name: 'C',  use: 'Center' },
];
const STAT_COLORS = [
  { hex: '#20c8e0', name: 'SPD', use: 'Speed' },
  { hex: '#9860e0', name: 'DEX', use: 'Dexterity' },
  { hex: '#30d060', name: 'JMP', use: 'Jump' },
  { hex: '#e09030', name: 'ACC', use: 'Accuracy' },
];
const TIER_HOLO = [
  { hex: '#b0b8c8', name: 'COMMON',     use: 'Card tier — steel, no burst' },
  { hex: '#30c0e0', name: 'RARE',       use: 'Card tier — blue burst' },
  { hex: '#ffc94a', name: 'ULTRA RARE', use: 'Card tier — gold burst + sparkles' },
];
const TIER_ABILITY = [
  { hex: '#20c8a0', name: 'RARE',       use: 'Ability rarity 1' },
  { hex: '#c060e0', name: 'SUPER RARE', use: 'Ability rarity 2' },
  { hex: '#e8c060', name: 'ULTRA RARE', use: 'Ability rarity 3' },
];

// ── building blocks ─────────────────────────────────────────────────────────

const mono = { fontFamily: 'monospace' };

function Section({ title, sub, children }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <h2 style={{ ...mono, color: '#e0e0e0', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>
        {title}
      </h2>
      {sub && <p style={{ ...mono, color: '#777', fontSize: 12, margin: '0 0 14px', maxWidth: 760, lineHeight: 1.6 }}>{sub}</p>}
      {children}
    </section>
  );
}

function Swatch({ hex, name, use }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };
  return (
    <div onClick={copy} title="Click to copy hex"
      style={{ width: 148, background: '#111', border: '1px solid #2a2a2a', borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ height: 56, background: hex }} />
      <div style={{ padding: '7px 9px' }}>
        <div style={{ ...mono, color: '#ddd', fontSize: 11, fontWeight: 'bold' }}>{name}</div>
        <div style={{ ...mono, color: copied ? '#19e6c4' : '#888', fontSize: 11 }}>{copied ? 'copied!' : hex}</div>
        <div style={{ ...mono, color: '#666', fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>{use}</div>
      </div>
    </div>
  );
}

function SwatchRow({ colors }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{colors.map(c => <Swatch key={c.name + c.hex} {...c} />)}</div>;
}

function MiniLabel({ children }) {
  return <div style={{ ...mono, color: '#19e6c4', fontSize: 11, letterSpacing: 2, margin: '18px 0 8px' }}>{children}</div>;
}

function SpecTable({ rows }) {
  return (
    <table style={{ ...mono, fontSize: 12, color: '#aaa', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '4px 18px 4px 0', color: '#19e6c4', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td>
            <td style={{ padding: '4px 0', lineHeight: 1.5 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── live hologram demo ──────────────────────────────────────────────────────
// Recreates the real holo recipe from DraftScreen.css / lobby.css:
// scanline backdrop + drifting 56px holo grid + diagonal banding + flicker +
// scan sweep + layered neon glow + teal wireframe + diegetic bracket copy.

const HOLO_KEYFRAMES = `
@keyframes bgHoloGrid   { from { background-position: 0 0, 0 0; } to { background-position: 56px 0, 0 56px; } }
@keyframes bgScanDown   { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
@keyframes bgHoloFlick  { 0%,7%,9%,100% { opacity: 1; } 8% { opacity: 0.55; } 62%,64% { opacity: 1; } 63% { opacity: 0.7; } }
@keyframes bgShimmer    { from { transform: translateX(-120%) skewX(-18deg); } to { transform: translateX(320%) skewX(-18deg); } }
@keyframes bgReticle    { 0%,100% { opacity: 0.9; } 50% { opacity: 0.4; } }
`;

function HoloDemo() {
  return (
    <div style={{
      position: 'relative', width: 640, height: 280, borderRadius: 6, overflow: 'hidden',
      border: '1px solid rgba(25,230,196,0.35)',
      boxShadow: '0 0 24px rgba(25,230,196,0.15), inset 0 0 60px rgba(2,6,10,0.8)',
      background: `
        radial-gradient(ellipse at 50% 30%, rgba(25,230,196,0.10) 0%, transparent 70%),
        linear-gradient(180deg, rgba(2,6,10,0.85) 0%, rgba(2,6,10,0.97) 100%)`,
      animation: 'bgHoloFlick 4.3s steps(1) infinite',
      fontFamily: '"Orbitron", monospace',
    }}>
      {/* scanline backdrop — white at ~2% */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.02) 3px 4px)' }} />
      {/* drifting holo grid — teal at 5–7%, masked */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          linear-gradient(90deg, transparent 0 calc(100% - 1px), rgba(25,230,196,0.07) calc(100% - 1px)) 0 0 / 56px 100%,
          linear-gradient(0deg,  transparent 0 calc(100% - 1px), rgba(25,230,196,0.07) calc(100% - 1px)) 0 0 / 100% 56px`,
        maskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, #000 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, #000 80%, transparent 100%)',
        animation: 'bgHoloGrid 9s linear infinite',
      }} />
      {/* diagonal holo banding */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(135deg, transparent 0 22px, rgba(25,230,196,0.05) 22px 24px, transparent 24px 44px)',
      }} />
      {/* scan sweep */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '45%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(25,230,196,0.10) 80%, rgba(25,230,196,0.30) 100%)',
          animation: 'bgScanDown 3.4s linear infinite',
        }} />
      </div>

      {/* header strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', fontSize: 10, letterSpacing: '0.24em', color: 'rgba(234,246,243,0.62)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(2,6,10,0.55)',
        fontFamily: '"JetBrains Mono", monospace',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#19e6c4', boxShadow: '0 0 8px #19e6c4' }} />
        <span style={{ flex: 1 }}>MULTIVERSAL SCANNER · ONLINE</span>
        <span style={{ color: '#19e6c4', textShadow: '0 0 6px #19e6c4', fontWeight: 700 }}>UNIVERSE 0047</span>
      </div>

      {/* wireframe reticle — teal dashed strokes + drop-shadow glow */}
      <svg width={170} height={170} viewBox="0 0 170 170"
        style={{ position: 'absolute', left: 36, top: 64, filter: 'drop-shadow(0 0 6px #5bf2d4)', animation: 'bgReticle 2.6s ease-in-out infinite' }}>
        <circle cx={85} cy={85} r={70} fill="none" stroke="#5bf2d4" strokeWidth={1} strokeDasharray="8 4" opacity={0.5} />
        <circle cx={85} cy={85} r={44} fill="none" stroke="#5bf2d4" strokeWidth={1.5} opacity={0.7} />
        <circle cx={85} cy={85} r={2.5} fill="#5bf2d4" />
        <line x1={85} y1={5}   x2={85} y2={28}  stroke="#5bf2d4" strokeWidth={1.5} />
        <line x1={85} y1={142} x2={85} y2={165} stroke="#5bf2d4" strokeWidth={1.5} />
        <line x1={5}  y1={85}  x2={28} y2={85}  stroke="#5bf2d4" strokeWidth={1.5} />
        <line x1={142} y1={85} x2={165} y2={85} stroke="#5bf2d4" strokeWidth={1.5} />
      </svg>

      {/* headline with layered neon glow: white core → accent → wide accent */}
      <div style={{ position: 'absolute', left: 230, top: 88 }}>
        <div style={{
          fontSize: 24, fontWeight: 800, letterSpacing: '0.12em', color: '#fff',
          textShadow: '0 0 4px #fff, 0 0 18px #19e6c4, 0 0 36px rgba(25,230,196,0.5)',
        }}>
          ANOMALY FOUND
        </div>
        <div style={{
          marginTop: 10, fontSize: 11, letterSpacing: '0.2em', color: '#5bf2d4',
          textShadow: '0 0 8px rgba(91,242,212,0.6)', fontFamily: '"JetBrains Mono", monospace',
        }}>
          [ ANOMALY LOCKED ON ]
        </div>
        {/* shimmer-sweep gold chip */}
        <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', marginTop: 18, borderRadius: 3 }}>
          <div style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#2a1a04',
            background: 'linear-gradient(180deg, #ffd97a, #c07a10)', textShadow: '0 1px 3px rgba(0,0,0,0.35)',
          }}>
            +200 CREDITS
          </div>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            animation: 'bgShimmer 2.8s ease-in-out infinite',
          }} />
        </div>
      </div>
    </div>
  );
}

// Live pixel-type specimen rendered with the real PixelText components.
function TypeSpecimen() {
  return (
    <svg width={640} height={196} viewBox="0 0 640 196"
      style={{ background: '#0d1220', border: '1px solid #2a2a2a', borderRadius: 4, display: 'block' }}>
      <PixelTextC text="THE MBA" cx={320} y={16} scale={6} fill="#e8c060" outline="#2a1800" thick />
      <PixelTextC text="MULTIVERSAL BASKETBALL LEAGUE" cx={320} y={80} scale={1} fill="#1eb8d8" outline={null} />
      <rect x={210} y={96} width={220} height={1} fill="#2a3a58" shapeRendering="crispEdges" />
      <PixelText text="SCALE 3 HEADER" x={24} y={112} scale={3} fill="#fff" outline="#000" />
      <PixelText text="SCALE 2 SUBHEAD" x={24} y={146} scale={2} fill="#c8d8e0" outline={null} />
      <PixelText text="SCALE 1 BODY LABEL — 5X7 GLYPH, 6PX CELL, 9PX LINE" x={24} y={170} scale={1} fill="#aac8e0" outline={null} />
      <PixelText text="OUTLINED" x={24} y={184} scale={1} fill="#ffd97a" outline="#2a1800" />
      <PixelText text="PLAIN" x={100} y={184} scale={1} fill="#ffd97a" outline={null} />
    </svg>
  );
}

// Faithful HTML re-creation of TitleScreen's MenuButton.
function ButtonDemo({ label, color }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', width: 116, height: 30 }}>
      <div style={{ position: 'absolute', left: 3, top: 4, width: 110, height: 26, borderRadius: 4, background: 'rgba(0,0,0,0.55)' }} />
      <div
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          position: 'absolute', left: 0, top: hover ? 4 : 0, width: 116, height: 26, borderRadius: 6,
          background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: hover ? 'inset 0 0 0 100px rgba(255,255,255,0.10)' : 'none',
        }}>
        <span style={{ ...mono, color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textShadow: '0 1px rgba(0,0,0,0.45)' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

export default function BrandGuideStory() {
  // The game's global CSS sets overflow:hidden on html/body, so the shell's
  // <main> can't scroll — this page scrolls itself instead.
  return (
    <div style={{ maxWidth: 920, paddingBottom: 60, height: 'calc(100vh - 48px)', overflowY: 'auto' }}>
      <style>{HOLO_KEYFRAMES}</style>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ ...mono, color: '#555', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          Brand Design Guide
        </div>
        <svg width={420} height={72} viewBox="0 0 420 72" style={{ display: 'block' }}>
          <PixelText text="THE MBA" x={0} y={2} scale={6} fill="#e8c060" outline="#2a1800" thick />
        </svg>
        <div style={{ ...mono, color: '#1eb8d8', fontSize: 12, letterSpacing: 4, marginTop: 6 }}>
          MULTIVERSAL BASKETBALL LEAGUE
        </div>
      </div>

      {/* 01 — Essence */}
      <Section
        title="01 · Brand Essence — Sci-Fi × Retro Pixel"
        sub={`THE MBA is what happens when a 16-bit arcade basketball cabinet gets retrofitted with multiversal
scanner tech. The fiction drives everything: players are ANOMALIES detected in parallel universes,
locked onto, and downloaded onto your roster as holographic cards. The game itself is the "broadcast" —
a chunky retro pixel telecast. Everything around it is the "command deck" — glowing teal holographic
instrumentation. Two distinct visual languages, one universe. A CRT layer (scanlines + vignette) sits
over both, selling the idea that you're watching all of it through the same old monitor.`}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', background: '#0a1410', border: '1px solid rgba(25,230,196,0.3)', borderRadius: 4, padding: 14 }}>
            <div style={{ ...mono, color: '#19e6c4', fontSize: 11, letterSpacing: 2, marginBottom: 8, textShadow: '0 0 8px rgba(25,230,196,0.5)' }}>
              THE HOLOGRAM (sci-fi shell)
            </div>
            <div style={{ ...mono, color: '#9bb8b0', fontSize: 12, lineHeight: 1.8 }}>
              HTML/CSS surfaces: lobby, draft, collection, matchmaking.
              Signal-teal light on void black. Wireframes, scan sweeps,
              drifting grids, flicker. Orbitron + JetBrains Mono, wide
              tracking, diegetic copy. Light behaves like projection —
              everything glows, nothing is solid.
            </div>
          </div>
          <div style={{ flex: '1 1 300px', background: '#10131f', border: '1px solid #2a3a58', borderRadius: 4, padding: 14 }}>
            <div style={{ ...mono, color: '#e8c060', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              THE BROADCAST (retro pixel core)
            </div>
            <div style={{ ...mono, color: '#a8b0c4', fontSize: 12, lineHeight: 1.8 }}>
              SVG game surfaces: title, court, in-game HUD.
              Hand-placed pixels, crisp edges, zero glow. PixelText 5×7
              glyphs, arcade-gold titles, hard drop shadows, jersey
              blue vs red on warm wood. Light is flat and honest —
              everything is exactly as many pixels as it looks.
            </div>
          </div>
        </div>
      </Section>

      {/* 02 — Color */}
      <Section
        title="02 · Color System"
        sub="One foundation, a small set of signal colors. Backgrounds are always near-black blue — pure #000 kills the projected-light illusion. Signal teal is the brand's voice; it means YOU and SYSTEM everywhere. Magenta is the rival's voice. Gold is value. Red means locked-on.">
        <MiniLabel>FOUNDATION</MiniLabel>
        <SwatchRow colors={FOUNDATION} />
        <MiniLabel>SIGNALS</MiniLabel>
        <SwatchRow colors={SIGNALS} />
        <MiniLabel>BROADCAST ACCENTS (in-game only)</MiniLabel>
        <SwatchRow colors={COURT_PALETTE} />
      </Section>

      {/* 03 — Holographic language */}
      <Section
        title="03 · The Holographic Language"
        sub="The signature look. A hologram is built from layers, all in signal teal at low alpha over void black — every layer below is live CSS using the exact recipes from DraftScreen.css and lobby.css.">
        <HoloDemo />
        <div style={{ marginTop: 16 }}>
          <SpecTable rows={[
            ['Scanlines', 'repeating-linear-gradient, 3px on / 1px line — ambient: white at 1.4–2.5% alpha; active holo surfaces: teal at 4–12%'],
            ['Holo grid', '56px teal grid lines at 5–7% alpha, edge-faded with a mask, drifting one cell per loop (holoGridShift 9s / asGridDrift 16s)'],
            ['Banding', '135° diagonal teal bands (22–24px) on card backs — projector interference'],
            ['Flicker', 'opacity steps(1) blips, long irregular period (holoFlicker 4.3s) — subtle, never strobing'],
            ['Scan sweep', 'soft teal edge sweeping down (scanDown 3.4s) or around (globe scan 3s) — the scanner is always working'],
            ['Neon glow', 'layered text-shadow: 0 0 4px #fff (hot core) + 0 0 18px accent + 0 0 36px accent@50% — reserved for headlines'],
            ['Wireframe', 'reticles, radar rings, brackets: #5bf2d4 strokes 1–2px, strokeDasharray "8 4" / "3 3", drop-shadow(0 0 6px #5bf2d4)'],
            ['Glass', 'nav and overlays: backdrop-filter blur(14px) over rgba(2,6,10,0.55→0.97) gradient'],
            ['Halo', 'radial-gradient accent at 18–40% alpha behind subjects; blur(8px) glow pucks for hero objects'],
            ['Glow rings', 'cards: box-shadow 0 0 0 1px accent + 0 0 22px color-mix(accent 35%, transparent) on hover/selection'],
          ]} />
        </div>
      </Section>

      {/* 04 — Pixel language */}
      <Section
        title="04 · The Retro Pixel Language"
        sub="Inside the broadcast, the rules invert: no glow, no gradients, no anti-aliasing. Color is flat, edges are crisp, shadows are hard-offset solid shapes. If the hologram is light, the pixel world is paint.">
        <TypeSpecimen />
        <MiniLabel>MENU BUTTON (hover = press)</MiniLabel>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', background: '#0d1220', padding: 18, borderRadius: 4, border: '1px solid #2a2a2a', width: 'fit-content' }}>
          <ButtonDemo label="PLAY" color="#1a7ac8" />
          <ButtonDemo label="OPTIONS" color="#2a3868" />
          <ButtonDemo label="COLLECT" color="#2a3868" />
        </div>
        <div style={{ marginTop: 14 }}>
          <SpecTable rows={[
            ['Rendering', 'shapeRendering="crispEdges" on rects, imageRendering: pixelated on sprites — always'],
            ['Lettering', 'PixelText 5×7 glyphs (6px cell, 9px line, ×scale). Hero = scale 6 gold #e8c060 + thick outline #2a1800. Labels = scale 1, no outline on flat panels'],
            ['Shadows', 'solid rgba(0,0,0,.55) shapes offset 3–4px — never blurred'],
            ['Buttons', 'h=26, rx=6; hover drops the face onto its shadow (press effect) + 10% white overlay; label is white PixelText over a 1px-down dark copy (fake emboss)'],
            ['Panels', 'fill #060e1a / #1a2240, 1px border #243650, rx 2'],
            ['Sprites', 'all pixel data in src/sprites/ as [x, y, color] arrays; JERSEY_BASE placeholder swaps to team color at render'],
          ]} />
        </div>
      </Section>

      {/* 05 — Functional color */}
      <Section
        title="05 · Functional Color"
        sub="These encode meaning, never mood. Positions and tiers each have TWO renditions — a neon set for holographic surfaces and a flatter, deeper set for the pixel broadcast — but a given meaning keeps its hue family across both worlds.">
        <MiniLabel>POSITIONS — HOLOGRAM (lobby / draft / collection)</MiniLabel>
        <SwatchRow colors={POS_HOLO} />
        <MiniLabel>POSITIONS — BROADCAST (in-game HUD)</MiniLabel>
        <SwatchRow colors={POS_COURT} />
        <MiniLabel>STATS (both worlds)</MiniLabel>
        <SwatchRow colors={STAT_COLORS} />
        <MiniLabel>CARD TIERS — HOLOGRAM (draft reveal, OVR-derived)</MiniLabel>
        <SwatchRow colors={TIER_HOLO} />
        <MiniLabel>ABILITY RARITY (badges, both worlds)</MiniLabel>
        <SwatchRow colors={TIER_ABILITY} />
      </Section>

      {/* 06 — Typography */}
      <Section
        title="06 · Typography"
        sub="Two type systems, never mixed on the same surface. Everything is uppercase in both worlds — lowercase only appears in long-form body copy, and rarely.">
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <MiniLabel>HOLOGRAM — WEB FONTS</MiniLabel>
            <SpecTable rows={[
              ['--f-head', 'Orbitron — headers, nav, numerals'],
              ['--f-display', 'Saira — display titles'],
              ['--f-body', 'Rajdhani — body copy, buttons'],
              ['--f-jp', 'Noto Sans JP — decorative accents'],
              ['--f-mono', 'JetBrains Mono — status strips, stats, captions'],
              ['Tracking', 'wide — 0.12em headlines up to 0.24em status strips'],
            ]} />
          </div>
          <div>
            <MiniLabel>BROADCAST — PIXELTEXT</MiniLabel>
            <SpecTable rows={[
              ['Glyph', '5×7 px in a 6px cell, 9px line height (×scale)'],
              ['Width math', 'text.length × 6 × scale'],
              ['Hero / logo', 'scale 6, gold, thick outline'],
              ['Headers', 'scale 2–3, white/ice, outline #000'],
              ['Labels', 'scale 1, outline={null} on flat panels'],
              ['Case', 'ALWAYS UPPERCASE'],
            ]} />
          </div>
        </div>
      </Section>

      {/* 07 — Motion */}
      <Section
        title="07 · Motion"
        sub="Two speeds: the hologram idles, the reward erupts. Ambient holo loops are slow (3–16s) and low-alpha so they read as machinery, not decoration. Payoff moments (card reveals, mission completes) get the fast stuff: shimmer sweeps (~480ms), burst beams, sparkles — scaled by tier, so motion itself communicates rarity.">
        <SpecTable rows={[
          ['Ambient loops', 'holoGridShift 9s · scanDown 3.4s · holoFlicker 4.3s · globe scan 3s · asGridDrift 16s — linear, infinite, subtle'],
          ['Reward moments', 'shimmer sweep 480ms · burst beams + sparkles on RARE/ULTRA pulls · pulse-glow on completed missions'],
          ['Tier scaling', 'COMMON: no burst → RARE: blue burst, 12 sparkles → ULTRA: gold burst, 20 sparkles. Bigger pull = bigger light show'],
          ['In-game rule', 'gameplay animation is requestAnimationFrame ONLY — CSS transitions/keyframes are allowed on HTML holo surfaces, never for sprites or play movement'],
        ]} />
      </Section>

      {/* 08 — Voice */}
      <Section
        title="08 · Voice & Copy"
        sub="The UI speaks like ship instrumentation: terse, uppercase, diegetic. It never breaks fiction to explain itself — it reports.">
        <SpecTable rows={[
          ['Diegetic status', 'square-bracket frames for system events: "[ ANOMALY LOCKED ON ]", "UNIVERSE 0047"'],
          ['Fiction words', 'ANOMALY (a draftable player) · UNIVERSE (where they\'re from) · SCAN / DOWNLOAD (drafting) · WARP (matchmaking)'],
          ['Imperatives', 'missions and CTAs are 2–4 word commands: "WIN A GAME", "POST NOW", "CHALLENGE ME"'],
          ['Numbers', 'always styled — gold for credits/rewards, teal for system values, mono font, never inline plain text'],
        ]} />
      </Section>

      {/* 09 — Rules */}
      <Section title="09 · Rules of the House">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', background: '#0d1a12', border: '1px solid #1f4030', borderRadius: 4, padding: 14 }}>
            <div style={{ ...mono, color: '#30d060', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>DO</div>
            <ul style={{ ...mono, color: '#9bc4a8', fontSize: 12, lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
              <li>Keep the two worlds pure: glow belongs to holograms, crisp pixels to the broadcast</li>
              <li>Build holo surfaces in layers: scanlines + grid + sweep + glow, all teal, all low-alpha</li>
              <li>Teal = you/system, magenta = rival, gold = value, red = locked — everywhere</li>
              <li>Uppercase everything; keep copy diegetic and terse</li>
              <li>Put new colors/dimensions in constants.js or the lobby.css tokens</li>
              <li>Layer the CRT overlay (scanlines 0.5, vignette 0.75) on every full-screen surface</li>
            </ul>
          </div>
          <div style={{ flex: '1 1 320px', background: '#1a0d10', border: '1px solid #40202a', borderRadius: 4, padding: 14 }}>
            <div style={{ ...mono, color: '#ff6b9a', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>DON'T</div>
            <ul style={{ ...mono, color: '#c49ba6', fontSize: 12, lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
              <li>Use pure black (#000) backgrounds — base is #02060a / #0d1220</li>
              <li>Add glows, gradients, or blur to the pixel broadcast (sprites, court, PixelText)</li>
              <li>Mix web fonts onto SVG game screens or PixelText into HTML holo surfaces</li>
              <li>Use #FF0000 for the ball — it's #AC2C17 in sprites</li>
              <li>Use functional colors (position / stat / tier) as decoration</li>
              <li>Use CSS transitions/keyframes for in-game animation — rAF only</li>
              <li>Make holo textures loud — grid and scanlines live below ~10% alpha</li>
            </ul>
          </div>
        </div>
      </Section>

    </div>
  );
}
