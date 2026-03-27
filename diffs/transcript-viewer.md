# transcript-viewer.tsx — Base Path for Share API Call

## Summary

Updated the share transcript `fetch` call to use `withBasePath(...)` instead of a bare absolute path.

## Why

When the app is deployed under a sub-path (e.g. `/vexa-dashboard`), bare `/api/...` paths bypass the base path prefix and result in 404 responses. `withBasePath` prepends the configured `basePath` so the request routes correctly in all deployment environments.

## Files Changed

- `src/components/transcript/transcript-viewer.tsx`
  - Added `withBasePath` to the import from `@/lib/base-path`
  - `POST /api/vexa/transcripts/.../share` fetch call now uses `withBasePath(...)`
