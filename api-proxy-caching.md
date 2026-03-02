# PR: Fix API proxy caching and query string forwarding

## Title

fix: disable caching and forward query params in Vexa API proxy

## Description

Fixes two issues in the Next.js API proxy route that forwards requests to the upstream Vexa API: query string parameters were silently dropped, and Next.js caching (both Data Cache and browser/CDN caching) could return stale responses.

## Changes

### `src/app/api/vexa/[...path]/route.ts`

- Add `export const dynamic = "force-dynamic"` and `export const revalidate = 0` at module level to prevent Next.js from statically optimizing or ISR-caching the proxy route
- Read `request.nextUrl.search` and append it to the upstream URL so query parameters (e.g. `?meeting_id=...`, `?skip=0&limit=100`) are forwarded to the Vexa API — previously they were silently stripped
- Add `cache: "no-store"` and `next: { revalidate: 0 }` to the upstream `fetch()` options to bypass the Next.js Data Cache
- Add `Cache-Control: no-store` response header to both JSON and empty/204 responses so browsers and CDNs don't cache proxy responses

### `src/app/api/config/route.ts`

- Remove extraneous blank line (formatting only)

## Test Plan

- [ ] Call `/api/vexa/transcripts/google_meet/abc123?meeting_id=42` — verify `?meeting_id=42` reaches the upstream Vexa API
- [ ] Verify proxy responses include `Cache-Control: no-store` header (check via browser DevTools Network tab)
- [ ] Make two identical requests in quick succession — verify both hit the upstream (no stale cache)
- [ ] Verify `GET /api/vexa/meetings` still works (no regression from `force-dynamic`)
- [ ] Verify 204 responses from upstream are passed through correctly with cache headers
