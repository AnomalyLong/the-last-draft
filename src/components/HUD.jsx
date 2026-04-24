import React from 'react';
import { ZOOM_W, TOP_BAR, svgToGrid } from '../constants.js';

export function HUD({ homeScore, awayScore, quarter, time, logs, onCommand, players, possession }) {
  const mins = Math.floor(time / 60), secs = time % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const [input, setInput] = React.useState('');
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && input.trim()) { onCommand(input.trim()); setInput(''); }
  };

  const g1 = svgToGrid(players[0].cx, players[0].cy);

  return (
    <g>
      <rect x={0} y={0} width={ZOOM_W} height={TOP_BAR} fill="#111" />
      <foreignObject x={4} y={4} width={185} height={88}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', border: '1px solid #333', borderRadius: '3px', fontFamily: 'monospace', fontSize: '9px', overflow: 'hidden' }}>
          <div ref={logRef} data-testid="debug-log" style={{ flex: 1, overflowY: 'auto', padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {logs.map((log, i) => (
              <div key={i} data-testid={`log-entry-${log.type}`} style={{ color: log.type === 'cmd' ? '#4af' : log.type === 'err' ? '#f55' : '#8f8', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                {log.type === 'cmd' ? `> ${log.text}` : log.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #222', padding: '2px 4px', gap: '3px' }}>
            <span style={{ color: '#4af' }}>{'>'}</span>
            <input data-testid="debug-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: 'monospace', fontSize: '9px', padding: 0 }}
              placeholder="command..." />
          </div>
        </div>
      </foreignObject>
      <text data-testid="score-home-label" x={234} y={38} fill="#aaa" fontSize={11} fontFamily="monospace" textAnchor="start">HOME</text>
      <text data-testid="score-home" x={234} y={68} fill="#fff" fontSize={24} fontFamily="monospace" fontWeight="bold" textAnchor="start">{homeScore}</text>
      <text data-testid="quarter" x={270} y={38} fill="#aaa" fontSize={11} fontFamily="monospace" textAnchor="middle">{`Q${quarter}`}</text>
      <text data-testid="timer" x={270} y={68} fill="#f0f0f0" fontSize={18} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{timeStr}</text>
      <text data-testid="score-away-label" x={306} y={38} fill="#aaa" fontSize={11} fontFamily="monospace" textAnchor="end">AWAY</text>
      <text data-testid="score-away" x={306} y={68} fill="#fff" fontSize={24} fontFamily="monospace" fontWeight="bold" textAnchor="end">{awayScore}</text>
      <text x={404} y={22} fill="#aaa" fontSize={9} fontFamily="monospace" textAnchor="end">char_1</text>
      <text x={404} y={36} fill="#4af" fontSize={10} fontFamily="monospace" textAnchor="end">{`x: ${g1.x}`}</text>
      <text x={404} y={50} fill="#4af" fontSize={10} fontFamily="monospace" textAnchor="end">{`y: ${g1.y}`}</text>
      <text data-testid="possession" x={404} y={64} fontSize={9} fontFamily="monospace" textAnchor="end"
        fill={possession === 'home' ? '#4af' : '#f55'}>
        {possession === 'home' ? 'HOME ball' : 'AWAY ball'}
      </text>
    </g>
  );
}
