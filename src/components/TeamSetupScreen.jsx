/* Team Setup — name + color + emblem before draft */

import React, { useState, useEffect, useRef } from 'react';
import './TeamSetupScreen.css';
import './TeamSetupScreen.mobile.css';

// Palettes the team can wear (must match the palette ids used elsewhere,
// e.g. teamPalette.js / SKIN_PALETTES).
const TEAM_COLORS = [
  { id: "cyanMagenta", name: "VOLT TEAL",    primary: "#19e6c4", glow: "#5bf2d4" },
  { id: "blueOrange",  name: "AZURE BLUE",   primary: "#3ea6ff", glow: "#7fc7ff" },
  { id: "goldCrimson", name: "SOLAR GOLD",   primary: "#ffc94a", glow: "#ffe080" },
  { id: "greenViolet", name: "TOXIC LIME",   primary: "#7dff5a", glow: "#b9ff8a" },
  { id: "magentaPunch", name: "PUNCH PINK",  primary: "#ff2d6f", glow: "#ff6b9a" },
  { id: "violetCore",  name: "VOID VIOLET",  primary: "#a855f7", glow: "#c98fff" },
  { id: "infraOrange", name: "INFRA ORANGE", primary: "#ff7a3c", glow: "#ffaa70" },
  { id: "frostWhite",  name: "FROST WHITE",  primary: "#e6f7ff", glow: "#ffffff" },
];

const EMBLEMS = [
  { id: "diamond", paths: <polygon points="50,8 92,50 50,92 8,50" /> },
  { id: "star",    paths: <polygon points="50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38" /> },
  { id: "hex",     paths: <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" /> },
  { id: "triangle",paths: <polygon points="50,10 92,86 8,86" /> },
  { id: "circle",  paths: <circle cx="50" cy="50" r="42" /> },
  { id: "bolt",    paths: <polygon points="58,4 18,54 44,54 38,96 80,42 54,42 64,4" /> },
  { id: "cross",   paths: <polygon points="38,4 62,4 62,38 96,38 96,62 62,62 62,96 38,96 38,62 4,62 4,38 38,38" /> },
  { id: "shield",  paths: <path d="M50 6 L88 18 L88 52 Q88 80 50 94 Q12 80 12 52 L12 18 Z" /> },
  { id: "wing",    paths: <path d="M4 50 Q24 28 50 30 Q76 28 96 50 Q76 60 50 56 Q24 60 4 50 Z M48 30 L52 30 L52 70 L48 70 Z" /> },
  { id: "skull",   paths: <path d="M50 10 Q22 10 22 40 L22 58 Q22 66 30 66 L30 76 L40 76 L40 70 L60 70 L60 76 L70 76 L70 66 Q78 66 78 58 L78 40 Q78 10 50 10 Z M36 38 Q36 32 42 32 Q48 32 48 38 Q48 44 42 44 Q36 44 36 38 Z M52 38 Q52 32 58 32 Q64 32 64 38 Q64 44 58 44 Q52 44 52 38 Z" /> },
  { id: "anchor",  paths: <path d="M48 8 L52 8 L52 22 L62 22 L62 28 L52 28 L52 70 Q66 68 70 56 L62 54 L78 42 L94 54 L82 56 Q76 78 52 82 L52 92 L48 92 L48 82 Q24 78 18 56 L6 54 L22 42 L38 54 L30 56 Q34 68 48 70 L48 28 L38 28 L38 22 L48 22 Z" /> },
  { id: "moon",    paths: <path d="M62 10 Q34 18 34 50 Q34 82 62 90 Q40 82 40 50 Q40 18 62 10 Z" /> },
];

const NAME_SUGGESTIONS = [
  "RONIN", "VANGUARD", "MERIDIAN", "ZEPHYR",
  "OBSIDIAN", "CINDER", "WARDEN", "ECHELON",
];

const MAX_NAME = 16;


function ColorSwatch({ c, active, locked, onClick }) {
  return (
    <button
      type="button"
      className={`ts-sw ${active ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      aria-disabled={locked || undefined}
      title={locked ? "Locked" : undefined}
      style={{
        "--sw-primary": c.primary,
        "--sw-glow": c.glow,
      }}
    >
      <div className="ts-sw-chip">
        <div className="ts-sw-half lt" style={{ background: `linear-gradient(135deg, ${c.glow} 0%, ${c.primary} 100%)` }}></div>
        <div className="ts-sw-half rt" style={{ background: `linear-gradient(135deg, ${c.primary} 0%, #02060a 100%)` }}></div>
        <span className="ts-sw-tick">✓</span>
        {locked && <span className="ts-sw-lock" aria-hidden="true">🔒</span>}
      </div>
      <span className="ts-sw-name">{c.name}</span>
      <span className="ts-sw-hex">{c.primary.toUpperCase()}</span>
    </button>
  );
}

// Only the blue color + diamond emblem are unlocked for now.
const UNLOCKED_COLOR  = "blueOrange";
const UNLOCKED_EMBLEM = "diamond";

export function TeamSetupScreen({ initialName = "", onBack, onContinue }) {
  const [name, setName] = useState(initialName);
  // Color and emblem are locked for now — always the unlocked defaults.
  const [color, setColor] = useState(UNLOCKED_COLOR);
  const [emblem, setEmblem] = useState(UNLOCKED_EMBLEM);
  // Step-by-step flow: name → color → emblem → submit
  const [step, setStep] = useState('name');
  const inputRef = useRef(null);

  // Live-apply chosen color to CSS vars so dossier preview + chrome update in real time.
  // We set --c-left directly so all 8 swatches work, not just the ones with a
  // matching palette elsewhere in the app.
  useEffect(() => {
    const c = TEAM_COLORS.find(x => x.id === color) || TEAM_COLORS[0];
    const r = document.documentElement;
    r.style.setProperty("--c-left", c.primary);
    r.style.setProperty("--c-left-glow", c.glow);
  }, [color]);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;
  const len = name.length;
  const over = len > MAX_NAME;

  const currentColor = TEAM_COLORS.find(c => c.id === color) || TEAM_COLORS[0];

  const handleSubmit = () => {
    if (!canContinue) return;
    onContinue && onContinue({
      name: trimmed.toUpperCase(),
      palette: color,
      emblem,
      color: currentColor.primary,
    });
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && step === 'name' && canContinue) {
      e.preventDefault();
      setStep('color');
    }
  };

  const handleAdvance = () => {
    if (step === 'name') {
      if (!canContinue) return;
      setStep('color');
    } else if (step === 'color') {
      setStep('emblem');
    } else if (step === 'emblem') {
      handleSubmit();
    }
  };

  const handleStepBack = () => {
    if (step === 'emblem') setStep('color');
    else if (step === 'color') setStep('name');
    else onBack && onBack();
  };

  const stepLabel =
    step === 'name'   ? { num: '01', total: '03', heading: 'NAME YOUR TEAM' } :
    step === 'color'  ? { num: '02', total: '03', heading: 'PICK YOUR UNIFORM' } :
                        { num: '03', total: '03', heading: 'PICK YOUR LOGO' };

  return (
    <div className="tsetup">
      {/* Top nav */}
      <div className="ts-topnav">
        <button className="ts-back-btn" onClick={handleStepBack} aria-label="Back">
          <span>◀</span>
        </button>
        <div className="ts-title">
          <span className="ts-big">TEAM SETUP</span>
          <span className="ts-sub">STEP {stepLabel.num} / {stepLabel.total}</span>
        </div>
        <div className="ts-topnav-spacer" aria-hidden="true" />
      </div>

      {/* Section header */}
      <div className="ts-section-h">
        <span className="ts-line"></span>
        <span className="ts-label">{stepLabel.heading}</span>
        <span className="ts-line"></span>
      </div>

      {/* Main grid */}
      <div className="ts-grid">
        {/* LEFT: form — one step visible at a time */}
        <div className="ts-form">
          {/* Step 01 — Team name */}
          {step === 'name' && (
            <div className="ts-panel">
              <div className="ts-panel-h">
                <span className="ts-h-num">01 ·</span>
                <span className="ts-h-name">TEAM NAME</span>
                <span className="ts-h-hint">2 – {MAX_NAME} CHARS</span>
              </div>
              <div className="ts-name-row">
                <span className="ts-name-prefix">▸</span>
                <input
                  ref={inputRef}
                  className="ts-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, MAX_NAME + 4))}
                  onKeyDown={handleKey}
                  placeholder="TEAM NAME"
                  maxLength={MAX_NAME + 4}
                  autoComplete="off"
                  spellCheck="false"
                />
                <span className={`ts-counter ${over ? "over" : ""}`}>
                  <b>{len}</b> / {MAX_NAME}
                </span>
              </div>
              <div className="ts-name-suggest">
                <span className="ts-suggest-lbl">▸ SUGGEST</span>
                {NAME_SUGGESTIONS.map((s) => (
                  <button key={s}
                          type="button"
                          className="ts-suggest-chip"
                          onClick={() => setName(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 02 — Uniform color */}
          {step === 'color' && (
            <div className="ts-panel">
              <div className="ts-panel-h">
                <span className="ts-h-num">02 ·</span>
                <span className="ts-h-name">UNIFORM</span>
                <span className="ts-h-hint">UNIFORM · BANNER · UI</span>
              </div>
              <div className="ts-swatches">
                {TEAM_COLORS.map((c) => (
                  <ColorSwatch key={c.id}
                               c={c}
                               active={color === c.id}
                               locked={c.id !== UNLOCKED_COLOR}
                               onClick={() => setColor(c.id)}/>
                ))}
              </div>
            </div>
          )}

          {/* Step 03 — Team logo */}
          {step === 'emblem' && (
            <div className="ts-panel">
              <div className="ts-panel-h">
                <span className="ts-h-num">03 ·</span>
                <span className="ts-h-name">TEAM LOGO</span>
                <span className="ts-h-hint">TEAM LOGO</span>
              </div>
              <div className="ts-emblems">
                {EMBLEMS.map((e) => {
                  const locked = e.id !== UNLOCKED_EMBLEM;
                  return (
                    <button key={e.id}
                            type="button"
                            className={`ts-em ${emblem === e.id ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
                            onClick={locked ? undefined : () => setEmblem(e.id)}
                            disabled={locked}
                            aria-disabled={locked || undefined}
                            aria-label={`Logo ${e.id}${locked ? " (locked)" : ""}`}
                            title={locked ? "Locked" : undefined}>
                      <svg viewBox="0 0 100 100" width="36" height="36">
                        <g fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                          {e.paths}
                        </g>
                      </svg>
                      {locked && <span className="ts-em-lock" aria-hidden="true">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="ts-footer">
        <div className="ts-foot-hint">
          ▸ <b>STEP {stepLabel.num}</b> {stepLabel.heading}
        </div>
        <button className="ts-btn primary"
                onClick={handleAdvance}
                disabled={step === 'name' && !canContinue}>
          <span>{step === 'emblem' ? 'CONTINUE TO DRAFT' : 'CONFIRM'}</span>
          <span className="ts-btn-arrow">▶</span>
        </button>
      </div>
    </div>
  );
}
