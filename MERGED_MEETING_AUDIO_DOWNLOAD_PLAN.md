# Merged Meeting Audio Download Plan (Backend + Frontend)

## Goal
Enable users to download one audio file for a meeting, even when the meeting is split into multiple recording sessions/fragments.

## Scope
- Frontend (Vexa Dashboard): add "Download audio" action to the meeting detail page.
- Backend (Vexa API): add a merged-audio endpoint **only for multi-recording meetings** (see §Fast Path).
- Out of scope for v1: video merge, per-speaker tracks, audio normalization, format conversion.

## Actual Storage Structure (Observed)
- MinIO path: `vexa-recordings/recordings/{recording_id}/{session_uid}/{uuid}.wav`
- Each `RecordingData` has exactly **one** audio `MediaFile` (WAV).
- A meeting can have **1 or N** recordings (one per session/reconnect/fragment).
- Existing proxy endpoint: `GET /recordings/{recording_id}/media/{media_file_id}/raw`
- Frontend already constructs this URL via `vexaAPI.getRecordingAudioUrl(recordingId, mediaFileId)`.

## Architecture Decision: Two Paths

### Fast Path — Single Recording Meeting (frontend only, no new backend)
If `recordings.length === 1`, the merged audio _is_ the single existing WAV file.
- Frontend constructs the URL via `vexaAPI.getRecordingAudioUrl(rec.id, audioMedia.id)`.
- Trigger download directly using an `<a download>` click on this URL.
- No new API endpoints. No backend changes.

### Merge Path — Multi-Recording Meeting (new backend endpoint required)
If `recordings.length > 1`, the frontend calls a new backend endpoint that concatenates the N WAV files in order and streams the result.
- Inputs are guaranteed to be WAV (same codec, same source), so **no normalization is needed** — only lossless concatenation.
- This is the only case where new backend work is required.

---

## Backend Design (merge path only)

### 1) New Endpoint
- `GET /meetings/{meeting_id}/artifacts/merged-audio/raw`
  - Collects all `completed` audio media files for the meeting, ordered by `recordings.created_at` ascending.
  - Concatenates WAV files via ffmpeg concat demuxer (lossless, no re-encoding).
  - Streams result directly to the client.
  - Supports `Range` header / `206 Partial Content`.
  - `Content-Disposition: attachment; filename="meeting-<sanitized-id>-<yyyy-mm-dd>-merged.wav"`.
  - Returns `404` with `no_audio_for_meeting` if no completed audio recordings exist.

> **No artifact persistence in v1.** WAV concat is fast (ffmpeg concat demuxer runs at ~10–50× real-time on any reasonable hardware). For a 1-hour meeting, merge takes a few seconds. Streaming on-demand is simpler and avoids storage, TTL, and cache-invalidation complexity entirely. Add persistence only if profiling shows it is needed.

### 2) Fragment Policy
- Include any recording that has at least one `media_files` entry with `type = audio`, **regardless of `status`**.
  - `completed` recordings: always include.
  - `in_progress` recordings with a media file: include — the WAV is real and complete up to the point the session ended (e.g. bot disconnected). This matches the frontend audio player behavior (`page.tsx:162`).
  - `in_progress` recordings with no media file: skip — upload hasn't started yet.
- Sort included recordings by `recordings.created_at` ascending to preserve timeline order.
- If no recordings pass the filter: return `404` with reason `no_audio_for_meeting`.

> **Real example (meeting 84):** recording `539092786547` has `status=in_progress`, `completed_at=null`, but contains a valid 168-second WAV. Excluding it would silently drop the first ~3 minutes of the meeting audio.

### 3) Concurrency
- On-demand streaming: no shared mutable state, no race conditions. Multiple simultaneous requests each get their own ffmpeg process. No locking needed.
- If concurrency becomes a concern, add a simple semaphore limiting parallel ffmpeg processes.

### 4) Security
- Reuse existing auth (`X-API-Key` / user scope).
- Validate user ownership of the meeting before fetching media files.
- Sanitize `Content-Disposition` filename: keep only `[a-zA-Z0-9._-]`, max 200 chars.
- Never expose internal storage paths.

### 5) Error Handling
- No recordings with a media file: `404` + `no_audio_for_meeting`.
- ffmpeg failure: `500` with generic message; log sanitized stderr internally.
- Request timeout: configure a reasonable ffmpeg timeout (e.g. 5 min) to avoid zombie processes.

### 6) Observability
- Log: meeting id, recording count, total duration, concat time, bytes streamed.
- Metric: merge request count, error rate, p95 latency.

---

## Frontend Design

### 1) API Client Updates (`src/lib/api.ts`)
Add one helper alongside the existing `getRecordingAudioUrl`:

```ts
// Returns the URL for a single recording's WAV (existing, no change needed)
getRecordingAudioUrl(recordingId: number, mediaFileId: number): string

// Returns the merged-audio stream URL for a multi-recording meeting
getMergedAudioUrl(meetingId: string): string {
  return withBasePath(`/api/vexa/meetings/${meetingId}/artifacts/merged-audio/raw`);
}
```

### 2) Download Logic (`src/app/meetings/[id]/page.tsx`)
Add a "Download audio" action to the export menu.

```
On click:
  if recordings.length === 0 → show toast "No audio available"
  if recordings.length === 1 → download via getRecordingAudioUrl(rec.id, audioMedia.id)
  if recordings.length > 1  → download via getMergedAudioUrl(meeting.id)
```

Download trigger: programmatically click an `<a href={url} download>` element.
No polling. No status states. No spinner beyond normal browser download progress.

### 3) UX States
- `idle` (has audio): "Download audio" action enabled.
- `idle` (no audio): action disabled with tooltip "No audio available for this meeting."
- No `processing` state needed — single recordings download instantly; multi-recording merges stream fast enough to feel synchronous from the browser's perspective.
- On HTTP error from the merge endpoint: show toast with the error message.

### 4) File Naming
- Single recording: filename comes from `Content-Disposition` set by the existing raw endpoint, or fallback to `recording-<id>.wav`.
- Merged: backend sets `Content-Disposition: attachment; filename="meeting-<sanitized-id>-<yyyy-mm-dd>-merged.wav"`. Frontend fallback: `meeting-<meetingId>-merged.wav`.

---

## API Contract

### GET `/meetings/{meeting_id}/artifacts/merged-audio/raw`

**200/206 — binary stream:**
```
Content-Type: audio/wav
Content-Disposition: attachment; filename="meeting-abc123-2026-03-13-merged.wav"
Accept-Ranges: bytes
```

**404 — no audio:**
```json
{ "detail": "no_audio_for_meeting" }
```

---

## Implementation Phases

### Phase 1 (Frontend — single recording, zero backend work)
- Add "Download audio" action to the export menu.
- For single-recording meetings: construct URL via existing `getRecordingAudioUrl`, trigger `<a download>`.
- For multi-recording meetings: show disabled button with tooltip "Multi-session download coming soon."
- Covers the majority of meetings immediately with no backend changes.

### Phase 2 (Backend + Frontend — multi-recording merge)
- Implement `GET /meetings/{meeting_id}/artifacts/merged-audio/raw` (ffmpeg concat, streaming).
- Add `getMergedAudioUrl()` to API client.
- Enable multi-recording download path in UI.

### Phase 3 (Hardening, if needed)
- Add artifact caching/persistence if on-demand merge proves too slow for very long meetings.
- Concurrency limiter for ffmpeg processes.
- Observability dashboards.

---

## Test Plan

### Backend (Phase 2)
- Single completed recording → streams correct WAV.
- Multiple completed recordings → streams correctly concatenated WAV in time order.
- No recordings → 404 with `no_audio_for_meeting`.
- Mix of `completed` + `in_progress` (with media file) → both included, correct WAV order.
- `in_progress` recording with media file only → included (covers bot-disconnect-at-start case).
- `in_progress` recording with no media file → skipped, not counted.
- All recordings have no media files → 404 with `no_audio_for_meeting`.
- Auth: unauthenticated request → 401; wrong user → 403.
- Range header → 206 with correct byte range.

### Frontend
- Single recording: download triggered with correct URL.
- Multi-recording: download triggered with merge URL.
- No audio: button disabled, tooltip shown.
- HTTP error from merge endpoint: toast shown.

---

## Risks and Mitigations
- **Mixed WAV parameters (sample rate/channels):** Source recordings come from the same bot pipeline so parameters should be uniform. If they diverge, ffmpeg concat will produce audible artifacts. Add a pre-check comparing audio stream parameters across files and log a warning if they differ; add normalization in Phase 3 if needed.
- **Very long meetings (e.g. 4+ hours):** On-demand streaming still works but response latency before first byte may be noticeable. Cache the merged file if this becomes a UX issue.
- **Concurrent downloads of the same meeting:** Each request spawns an independent ffmpeg process. Add a concurrency cap if this causes resource pressure.

## Definition of Done
- User can click "Download audio" in meeting detail and receive a WAV file.
- Single-recording meetings: direct download, no backend involved.
- Multi-recording meetings: seamlessly merged, single WAV file.
- Backend enforces auth.
- Tests cover main success/failure/auth paths.
