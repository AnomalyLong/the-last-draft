// ── Inline (feed) splash variants — shared client/server ─────────────────────
//
// The source of truth for WHICH splashes exist and which one ships by default.
// Lives in shared/ because three places need the same list:
//
//   client  src/splashConfig.js      — resolves the variant to render
//   server  core/inlineSplash.ts     — validates + stores the global setting
//   admin   components/AdminOverlay  — renders one row per variant
//
// See src/splashConfig.js for the resolution order (device override → global
// admin setting → this default) and why the global value is cached locally.

export const SPLASH_VARIANTS = ['classic', 'court'] as const;

export type SplashVariant = (typeof SPLASH_VARIANTS)[number];

/** What ships when no admin has ever touched the global setting. */
export const DEFAULT_SPLASH: SplashVariant = 'court';

export const isSplashVariant = (v: unknown): v is SplashVariant =>
  typeof v === 'string' && (SPLASH_VARIANTS as readonly string[]).includes(v);
