/**
 * Devvit client shim — used ONLY by `npm run dev:tools` so that the REAL game
 * (src/App.jsx via src/main.jsx) can render outside the Devvit playtest
 * environment. Vite aliases `@devvit/web/client` → this file when the devtools
 * config is active. In production builds the real `@devvit/web/client` is used.
 *
 * This is what makes dev:tools "the real game" instead of a storybook: App.jsx
 * imports getWebViewMode / requestExpandedMode / navigateTo / context /
 * purchase / OrderResultStatus from here and runs unmodified.
 *
 * The Farnsworth canvas loads this harness at ?view=post|mobile|desktop.
 * getWebViewMode() reads that param so the single <App/> renders the same way
 * it would inside Reddit:
 *   ?view=post              → 'inline'   → App shows the inline SplashScreen
 *   ?view=mobile|desktop|…  → 'expanded' → App shows the full game
 * With no param (manual browser use) it defaults to 'expanded'.
 */

function currentView(): string {
  try {
    return new URLSearchParams(window.location.search).get('view') || '';
  } catch {
    return '';
  }
}

export function getWebViewMode(): 'inline' | 'expanded' {
  return currentView() === 'post' ? 'inline' : 'expanded';
}

export function requestExpandedMode(_nativeEvent?: unknown, _entry?: string): void {
  // Outside Reddit there's no host to expand into. In the canvas, the desktop /
  // mobile frames already load ?view=desktop|mobile (expanded), so the inline
  // splash tap is a no-op here.
  console.log('[devvit-shim] requestExpandedMode()');
}

export function navigateTo(url: string): void {
  console.log('[devvit-shim] navigateTo:', url);
  try {
    if (url) window.open(url, '_blank');
  } catch {
    /* ignore */
  }
}

// Devvit emulator integration (Farnsworth). The active user / subreddit are
// injected by Vite at transform time via `import.meta.env.VITE_*` env vars
// that Farnsworth's dev:farnsworth:boot IPC sets on the vite subprocess.
// Farnsworth serializes the per-project emulator config into
// VITE_DEVVIT_EMULATOR_CONFIG_JSON, Vite substitutes the string literal into
// the served bundle, and we parse it at module-load time. A fresh vite is
// required to pick up a changed config — which is exactly what Farnsworth
// does after a cogwheel user switch (stop + boot).
//
// Falls back to the original hardcoded stubs when the env var is not set
// (e.g. running `vite --config vite.devtools.config.ts` standalone, outside
// Farnsworth).
let _username: string = 'dev-user';
let _subredditName: string = 'the_last_draft_dev';
try {
  // @ts-ignore — import.meta.env is a Vite-only extension; the .ts compile
  // doesn't know about it. Vite substitutes this at transform time.
  const json: string = (import.meta.env.VITE_DEVVIT_EMULATOR_CONFIG_JSON as string) || '';
  if (json) {
    const cfg = JSON.parse(json);
    if (cfg.currentUsername) {
      const u = String(cfg.currentUsername).replace(/^u\//, '');
      if (u) _username = u;
    }
    if (cfg.currentSubredditName) {
      const s = String(cfg.currentSubredditName).replace(/^r\//, '');
      if (s) _subredditName = s;
    }
  }
} catch {
  // ignore — fall through to defaults
}

export const context = {
  username: _username,
  postId: 'dev-post',
  subredditName: _subredditName,
  postData: null as unknown,
};

export function showToast(message: string): void {
  console.log('[devvit-shim] showToast:', message);
}

export function showForm(form: unknown): void {
  console.log('[devvit-shim] showForm:', form);
}

// BattlePassScreen.jsx imports these. Payments don't exist outside Reddit, so
// purchase() resolves to a cancelled order and the UI falls back gracefully.
export const OrderResultStatus = {
  Success: 'SUCCESS',
  Cancelled: 'CANCELLED',
  Error: 'ERROR',
} as const;

export async function purchase(_sku: string): Promise<{ status: string }> {
  console.log('[devvit-shim] purchase (no-op outside Reddit):', _sku);
  return { status: OrderResultStatus.Cancelled };
}

export const useDevvitContext = () => context;
