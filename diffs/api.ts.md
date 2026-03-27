# api.ts — Base Path for API Fetch Calls

## Summary

Wrapped bare `/api/...` paths with `withBasePath(...)` across three methods, and relaxed the `meeting_id` type in `getChatMessages` return type from `number` to `number | null`.

## Why

Same root cause as `transcript-viewer.tsx`: bare absolute paths break when the app is deployed under a sub-path. All client-side `fetch` calls must go through `withBasePath` to be routed correctly.

The `meeting_id: number | null` change reflects the actual API contract — the field can be `null` when the meeting has no associated ID yet.

## Files Changed

- `src/lib/api.ts`
  - `deleteMeeting` — `fetch` URL wrapped with `withBasePath`
  - `getChatMessages` — `fetch` URL wrapped with `withBasePath`; return type `meeting_id` changed from `number` to `number | null`
  - `getRecordingAudioUrl` — returned URL wrapped with `withBasePath`
