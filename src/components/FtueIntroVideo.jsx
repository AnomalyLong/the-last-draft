import React from 'react';
import videoSrc from '../videos/MBAtest1080.mp4';

export function FtueIntroVideo({ onDone }) {
  const videoRef = React.useRef(null);
  // Mobile browsers (iOS Safari especially) block autoplay of unmuted media.
  // Start muted so the video begins immediately, then unmute on the first tap.
  const [muted, setMuted] = React.useState(true);
  const [needsTap, setNeedsTap] = React.useState(true);
  const [canSkip, setCanSkip] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  const finish = () => { onDone?.(); };

  const handleClick = () => {
    if (needsTap) {
      // First tap: unmute + ensure play started within a user gesture.
      setMuted(false);
      setNeedsTap(false);
      const v = videoRef.current;
      if (v) {
        v.muted = false;
        v.play().catch(() => {});
      }
      // Allow skip after a short delay so this tap doesn't double as a skip.
      setTimeout(() => setCanSkip(true), 800);
      return;
    }
    if (canSkip) finish();
  };

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
        muted={muted}
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
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
          background: 'rgba(0,0,0,0.7)', padding: '8px 14px', borderRadius: 2,
          letterSpacing: 2, pointerEvents: 'none',
          animation: 'tappulse 1.4s ease-in-out infinite',
        }}>▸ TAP TO ENABLE SOUND</div>
      )}
      {canSkip && !needsTap && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          color: '#fff', fontFamily: 'monospace', fontSize: 12,
          background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 2,
          letterSpacing: 1, pointerEvents: 'none',
        }}>TAP TO SKIP</div>
      )}
    </div>
  );
}
