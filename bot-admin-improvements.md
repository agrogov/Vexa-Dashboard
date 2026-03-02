# PR: Improve bot stop reliability and error handling in admin panel

## Title

fix: improve bot stop reliability and handle missing platform data in admin bots page

## Description

Fixes runtime errors and improves UX in the admin bots management page. The bot status API can return entries with missing `platform` or `native_meeting_id` fields, which caused crashes when trying to build lookup keys or call the stop endpoint. The stop button was also only shown for active meetings, making it impossible to clean up stuck bots from failed meetings.

## Changes

### `src/app/admin/bots/page.tsx`

- **Filter invalid bot entries**: Filter out running bot records missing `platform` or `native_meeting_id` before storing them in state, preventing downstream key-building errors
- **Guard `handleStopBot` parameters**: Change `platform` and `nativeId` parameters to optional/nullable with an early-return guard clause and user-facing error toast when either is missing
- **Precompute `runningBotKeys` set**: Build a `Set` of `platform:nativeId` keys from running bots for O(1) lookup instead of repeated array scans
- **Expand stop button visibility (`canStop`)**: Replace the simple `isActive` gate with a comprehensive `canStop` check that shows the stop button when:
  - The meeting is active (requested, joining, awaiting_admission, active)
  - A running bot process exists for the meeting (even if status doesn't say active)
  - The meeting has failed but still has a `bot_container_id` (orphaned container cleanup)
- **Contextual stop confirmation**: The confirmation dialog description now varies based on meeting status — "stop the transcription bot" for active meetings, "attempt to stop any remaining bot process" for failed/other meetings

## Test Plan

- [ ] Open admin bots page when bot status API returns entries with null/missing platform — verify no crash
- [ ] Verify "Stop" button appears for active meetings
- [ ] Verify "Stop" button appears for failed meetings that have a `bot_container_id`
- [ ] Verify "Stop" button appears for meetings with a running bot process (even if meeting status is not active)
- [ ] Verify "Stop" button does NOT appear for meetings without `platform` or `platform_specific_id`
- [ ] Click "Stop" on an active meeting — verify confirmation says "stop the transcription bot"
- [ ] Click "Stop" on a failed meeting — verify confirmation says "attempt to stop any remaining bot process for this failed meeting"
- [ ] Verify stopping a bot still works end-to-end (bot is actually stopped)
