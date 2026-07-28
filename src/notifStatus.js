import React from 'react';
import { trpc } from './trpc.js';

// ── Shared push-notification status ────────────────────────────────────────
// Two independent places read AND mutate this same server state:
//   • the bell dropdown toggle (TitleStrip) — turn push on/off
//   • the `wnotify` featured mission CTA (LobbyScreen) — ENABLE / ✓ ON
//
// If each held its own useState copy they would drift the instant one of them
// mutated: turning push off in the bell would leave the mission row showing
// "✓ ON" until the lobby remounted. So the status lives in one module-level
// cache with subscribers, fetched once per session and updated in place by
// every mutation.
//
// Note the bell is mounted on the draft/collection/events screens too, where
// the missions panel isn't — the cache means those screens don't each refetch.

let state = {
  optedIn: false,
  everOptedIn: false,
  supported: true,
  loaded: false,
};

const subscribers = new Set();
let inflight = null;

const emit = () => {
  for (const fn of subscribers) fn(state);
};

const merge = patch => {
  state = { ...state, ...patch };
  emit();
};

const adopt = s => {
  merge({
    optedIn: !!s?.optedIn,
    everOptedIn: !!s?.everOptedIn,
    // supported:false means the plugin is missing (common in the local
    // playtest emulator) — the UI hides its controls rather than offering
    // buttons that can only fail.
    supported: s?.supported !== false,
    loaded: true,
  });
  return state;
};

// Single-flight: several components mount at once on first paint and would
// otherwise fire duplicate status queries.
export const fetchStatus = (force = false) => {
  if (inflight) return inflight;
  if (state.loaded && !force) return Promise.resolve(state);
  inflight = trpc.notifications.status
    .query()
    .then(adopt)
    .catch(() => {
      // Guests, or the plugin being unavailable. Mark loaded so consumers stop
      // showing a pending state; everOptedIn stays false so the toggle hides.
      merge({ loaded: true, supported: false });
      return state;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

// These intentionally reject on failure so callers can leave their button in
// its previous state and let the user retry.
export const optIn = async () => adopt(await trpc.notifications.optIn.mutate());
export const optOut = async () => adopt(await trpc.notifications.optOut.mutate());

export function useNotifStatus({ enabled = true } = {}) {
  const [snapshot, setSnapshot] = React.useState(state);

  React.useEffect(() => {
    subscribers.add(setSnapshot);
    setSnapshot(state); // resync in case the cache moved before we subscribed
    if (enabled) fetchStatus();
    return () => {
      subscribers.delete(setSnapshot);
    };
  }, [enabled]);

  return snapshot;
}

// Test seam — lets stories/tests drive the UI without a server.
export const __setNotifStatus = patch => merge(patch);

// Dev-only window bridge.
//
// @devvit/notifications cannot initialise under the plain vite dev server —
// every plugin call fails with "Devvit config is not available", so the server
// reports supported:false and the bell toggle correctly hides itself. That
// makes the enabled states impossible to reach locally through the real API.
// Exposing the seam lets tests and manual QA drive the UI directly:
//
//   window.__notifStatus.set({ everOptedIn: true, optedIn: true, supported: true })
//
// Stripped from production builds by the import.meta.env.DEV guard.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__notifStatus = {
    set: __setNotifStatus,
    get: () => ({ ...state }),
  };
}
