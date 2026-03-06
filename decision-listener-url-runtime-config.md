# Move Decision Listener URL to Runtime Config

## PR Title

**refactor: move decision listener URL from build-time env var to runtime config**

## Description

Replaces the hard-coded `NEXT_PUBLIC_DECISION_LISTENER_URL` environment variable usage across all components with the centralized runtime config system (`useRuntimeConfig` hook). This ensures the decision listener URL is fetched from the server at runtime (via `/api/config`) rather than baked in at build time, consistent with how `wsUrl` and `apiUrl` are already handled.

## Changes

### `src/app/api/config/route.ts`
- Added `decisionListenerUrl` to the runtime config API response, sourced from `NEXT_PUBLIC_DECISION_LISTENER_URL` env var (defaults to `http://localhost:8765`).

### `src/hooks/use-runtime-config.ts`
- Added `decisionListenerUrl` field to the `RuntimeConfig` interface.
- Added `getDecisionListenerUrl()` synchronous helper (mirrors existing `getWsUrl()` / `getApiUrl()` pattern).

### `src/app/tracker/page.tsx`
- Removed local `DECISION_LISTENER_URL` constant.
- Uses `useRuntimeConfig()` hook to obtain the URL at runtime.
- Guards `fetchConfig` with `isRuntimeConfigLoading` to avoid fetching before the URL is available.
- Updated `useCallback` dependency arrays accordingly.

### `src/components/anthology/entity-chip.tsx`
- Removed local `DECISION_LISTENER_URL` constant.
- Uses `useRuntimeConfig()` hook; derives `decisionListenerUrl` from config.
- Updated enrichment SSE URL construction and `useCallback` deps.

### `src/components/anthology/meeting-anthology.tsx`
- Removed local `DECISION_LISTENER_URL` constant.
- Uses `useRuntimeConfig()` hook for decision listener URL.
- Updated all fetch/SSE calls and dependency arrays (`load`, `connectSSE`, `fetchSummary`).

### `src/components/decisions/decisions-panel.tsx`
- Removed local `DECISION_LISTENER_URL` constant.
- Uses `useRuntimeConfig()` hook for decision listener URL.
- Updated SSE connection and history-load fetch calls and dependency arrays.

## Motivation

- **Consistency**: All external service URLs now flow through the same runtime config mechanism.
- **Deployability**: The decision listener URL can be changed per-environment without rebuilding the frontend.
- **Single source of truth**: Eliminates 4 duplicate `DECISION_LISTENER_URL` constants scattered across components.

## Files Changed (6)

| File | Change |
|------|--------|
| `src/app/api/config/route.ts` | Expose `decisionListenerUrl` in config API |
| `src/hooks/use-runtime-config.ts` | Add field + sync getter |
| `src/app/tracker/page.tsx` | Use runtime config hook |
| `src/components/anthology/entity-chip.tsx` | Use runtime config hook |
| `src/components/anthology/meeting-anthology.tsx` | Use runtime config hook |
| `src/components/decisions/decisions-panel.tsx` | Use runtime config hook |

## Test Plan

- [ ] Verify `/api/config` response includes `decisionListenerUrl`
- [ ] Verify tracker page loads config from the listener using the runtime URL
- [ ] Verify entity chip enrichment SSE connects to the correct URL
- [ ] Verify meeting anthology SSE and summary fetch use the correct URL
- [ ] Verify decisions panel SSE and history load use the correct URL
- [ ] Verify fallback to `http://localhost:8765` works when env var is not set
