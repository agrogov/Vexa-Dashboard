# PR: Add configurable base path for sub-path deployments

## Title

feat: add configurable base path support for deploying under a sub-path

## Description

Adds support for deploying the Vexa Dashboard under a configurable sub-path (e.g. `/vexa`) via the `NEXT_PUBLIC_BASE_PATH` environment variable. This is required for reverse-proxy setups where the app is served at a non-root URL.

The implementation introduces a shared `base-path.ts` utility library with `withBasePath()` and `stripBasePath()` helpers, then updates all API fetch calls, static asset references, and client-side route matching across the entire application to be base-path aware. The Next.js config is updated to set `basePath` and `assetPrefix` conditionally, and the Dockerfile accepts the base path as a build argument.

## Changes

### Core Infrastructure

#### `src/lib/base-path.ts` (NEW)

- Reads `NEXT_PUBLIC_BASE_PATH` env var and normalizes it (strips trailing slash)
- Exports `basePath` — the raw normalized base path string
- Exports `withBasePath(path)` — prepends the base path to a given route or asset path
- Exports `stripBasePath(path)` — removes the base path prefix from a pathname (for route matching)

#### `next.config.ts`

- Add `normalizeBasePath()` helper to sanitize the env var (trim, ensure leading slash)
- Conditionally set `basePath` and `assetPrefix` in the Next.js config when `NEXT_PUBLIC_BASE_PATH` is set

#### `Dockerfile`

- Accept `NEXT_PUBLIC_BASE_PATH` as a build-time `ARG` in the builder stage
- Set it as `ENV` so it's available during `npm run build`

#### `build_image.sh` (NEW)

- Docker build script that passes `--build-arg NEXT_PUBLIC_BASE_PATH=/vexa` to the build command

### API Fetch Calls — `withBasePath()` Applied

#### `src/lib/api.ts`

- Wrap all Vexa API fetch paths (`/api/vexa/...`) with `withBasePath()`

#### `src/lib/admin-api.ts`

- Wrap all admin API fetch paths (`/api/vexa/...` admin endpoints) with `withBasePath()`

#### `src/stores/auth-store.ts`

- Wrap auth API paths: `/api/auth/send-magic-link`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/oauth-callback`

#### `src/stores/admin-auth-store.ts`

- Wrap admin auth paths: `/api/auth/admin-verify`, `/api/auth/admin-logout`

#### `src/hooks/use-runtime-config.ts`

- Wrap `/api/config` fetch

#### `src/hooks/use-live-transcripts.ts`

- Wrap `/api/config` fetch

#### `src/hooks/use-vexa-websocket.ts`

- Wrap `/api/config` fetch

#### `src/app/settings/page.tsx`

- Wrap `/api/config` and `/api/ai/config` fetches

#### `src/app/auth/verify/page.tsx`

- Wrap `/api/auth/verify` fetch

#### `src/app/login/page.tsx`

- Wrap `/api/health` fetch, CSRF token fetch, and NextAuth sign-in POST paths
- Replace `next-auth/react` `signIn()` with a manual `signInWithProvider()` that uses base-path-aware URLs

#### `src/components/admin/admin-guard.tsx`

- Wrap `/api/auth/admin-verify` fetch

#### `src/components/ai/ai-chat-panel.tsx`

- Wrap `/api/ai/config` fetch and `/api/ai/chat` streaming endpoint

#### `src/components/mcp/mcp-config-button.tsx`

- Wrap `/api/config` fetch and MCP icon asset path

### Static Asset Paths — `withBasePath()` Applied

#### `src/app/layout.tsx`

- Wrap favicon/icon metadata paths (`/icons/vexadark.svg`)

#### `src/app/page.tsx`

- Wrap Discord and GitHub icon paths on the home page

#### `src/app/meetings/[id]/page.tsx`

- Wrap platform icon paths (Google Meet, Teams, etc.)
- Use `basePath` export for building shareable URLs: `${window.location.origin}${basePath || ""}`

#### `src/components/ui/logo.tsx`

- Wrap logo SVG paths (`/icons/vexalight.svg`, `/icons/vexadark.svg`)

#### `src/components/meetings/meeting-card.tsx`

- Wrap meeting platform icon paths (Google Meet, Teams)

#### `src/components/transcript/transcript-viewer.tsx`

- Use `basePath` export for building shareable transcript URLs

### Route Matching — `stripBasePath()` Applied

#### `src/components/auth/auth-provider.tsx`

- Strip base path from `pathname` before checking against protected/public route patterns

#### `src/components/layout/app-layout.tsx`

- Strip base path from `pathname` before highlighting active navigation items

### NextAuth Base-Path Awareness

#### `src/app/api/auth/[...nextauth]/route.ts`

- Add `getAppBasePath()` to extract the app base path from `NEXTAUTH_URL`
- Add `buildAppPath()` to construct base-path-prefixed routes
- Update `pages.signIn` and `pages.error` to use `buildAppPath("/login")` so NextAuth redirects to the correct URL under a sub-path

### Other

#### `src/stores/meetings-store.ts`

- Wrap API calls with `withBasePath()` where applicable

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Sub-path to serve the app under (e.g. `/vexa`). Leave empty for root deployment. Passed as a build-time arg for Docker and available at runtime via Next.js public env. |

## Test Plan

- [ ] Verify the app works at root (`/`) when `NEXT_PUBLIC_BASE_PATH` is unset (no regression)
- [ ] Set `NEXT_PUBLIC_BASE_PATH=/vexa` and verify the app loads at `/vexa`
- [ ] Verify all API calls work under the sub-path (auth, meetings, transcripts, AI chat, admin)
- [ ] Verify static assets (logos, icons) load correctly under the sub-path
- [ ] Verify OAuth sign-in flows (Google, Azure AD) redirect correctly with the base path
- [ ] Verify email magic-link auth works under the sub-path
- [ ] Verify navigation highlighting works correctly (active item detection)
- [ ] Verify auth-provider route protection works (redirect to `/vexa/login` not `/login`)
- [ ] Verify shareable meeting/transcript URLs include the base path
- [ ] Build Docker image with `--build-arg NEXT_PUBLIC_BASE_PATH=/vexa` and verify it works
- [ ] Verify `build_image.sh` produces a working image
