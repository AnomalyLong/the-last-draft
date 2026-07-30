import React from 'react';
import videoSrc from '../videos/MBAtest1080.mp4';
import { audioSettings, musicVolume, subscribeAudioSettings } from '../sound/audioSettings.js';

export function FtueIntroVideo({ onDone }) {
  const videoRef = React.useRef(null);
  // Mobile browsers (iOS Safari especially) block autoplay of unmuted media.
  // Start muted so the video begins immediately, then unmute on the first tap.
  const [tapMuted, setTapMuted] = React.useState(true);
  // The global mute from the title-strip speaker button. Tracked as state (not
  // read inline) so flipping mute while the video plays re-renders and silences
  // it immediately. This video used to keep its own `muted` flag only, which is
  // why it kept playing audio through a global mute.
  const [globalMuted, setGlobalMuted] = React.useState(() => audioSettings.muted);
  React.useEffect(
    () => subscribeAudioSettings((s) => setGlobalMuted(s.muted)),
    [],
  );
  const effectiveMuted = tapMuted || globalMuted;
  const [needsTap, setNeedsTap] = React.useState(true);
  const [canSkip, setCanSkip] = React.useState(false);
  const [confirmSkip, setConfirmSkip] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [ready, setReady] = React.useState(false);
  const confirmTimerRef = React.useRef(null);

  const finish = () => { onDone?.(); };

  const handleClick = () => {
    if (needsTap) {
      // First tap: lift the autoplay mute + ensure play started within a user
      // gesture. A global mute still wins — the tap clears the autoplay gate,
      // it does not override the user's mute setting.
      setTapMuted(false);
      setNeedsTap(false);
      const v = videoRef.current;
      if (v) {
        v.muted = audioSettings.muted;
        v.volume = musicVolume();
        v.play().catch(() => {});
      }
      // Allow skip after a short delay so this tap doesn't double as a skip.
      setTimeout(() => setCanSkip(true), 800);
      return;
    }
    if (!canSkip) return;
    if (!confirmSkip) {
      // First skip-tap: ask for confirmation. Auto-clear after a few seconds
      // so an idle tap doesn't permanently arm the skip.
      setConfirmSkip(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmSkip(false), 3000);
      return;
    }
    // Second tap while confirm is showing → actually skip.
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    finish();
  };

  React.useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, []);

  // Keep the live element in sync — `volume` has no JSX equivalent, and muted
  // must be forced imperatively for flips that happen after mount.
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = effectiveMuted;
    v.volume = musicVolume();
  }, [effectiveMuted, globalMuted]);

  return (
    <div
      data-testid="ftue-intro-video"
      onClick={handleClick}
      style={{
        position: 'absolute', inset: 0, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 10,
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        playsInline
        muted={effectiveMuted}
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
        onCanPlay={() => setReady(true)}
        onPlaying={() => setReady(true)}
        onEnded={finish}
        onError={(e) => setError(e.currentTarget.error?.message || 'video failed to load')}
        style={{
          width: '100%', height: '100%', objectFit: 'contain', display: 'block',
          opacity: ready ? 1 : 0,
          transition: 'opacity 120ms linear',
          background: '#000',
        }}
      />
      {!ready && !error && (
        <div style={{
          position: 'absolute', inset: 0, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'ftueSpin 700ms linear infinite',
          }} />
          <style>{`@keyframes ftueSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          color: '#ff6b6b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center',
          background: 'rgba(0,0,0,0.8)', padding: '12px 16px', borderRadius: 2,
        }}>VIDEO ERROR: {error}<br/><br/>(tap anywhere to continue)</div>
      )}
      {needsTap && !error && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
          background: 'rgba(0,0,0,0.7)', padding: '8px 14px', borderRadius: 2,
          letterSpacing: 2, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          animation: 'tappulse 1.4s ease-in-out infinite',
        }}>
          <span style={{ lineHeight: 1 }}>
            {globalMuted ? 'TAP TO CONTINUE' : 'TAP TO ENABLE SOUND'}
          </span>
          <span style={{
            fontSize: 22, lineHeight: 1, display: 'block',
            animation: 'fingerTap 1s ease-in-out infinite',
          }}>👆</span>
          <style>{`@keyframes fingerTap { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
        </div>
      )}
      {canSkip && !needsTap && !confirmSkip && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          color: '#fff', fontFamily: 'monospace', fontSize: 12,
          background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 2,
          letterSpacing: 1, pointerEvents: 'none',
        }}>TAP TO SKIP</div>
      )}
      {confirmSkip && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#ffeb3b', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
          background: 'rgba(0,0,0,0.85)', padding: '8px 14px', borderRadius: 2,
          letterSpacing: 2, pointerEvents: 'none',
          border: '1px solid #ffeb3b',
        }}>SKIP INTRO? TAP AGAIN</div>
      )}
    </div>
  );
}
