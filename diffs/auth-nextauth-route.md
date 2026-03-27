# auth/[...nextauth]/route.ts — Cookie Config & Base Path Fix

## Summary

Two related fixes for deployments behind SSL-terminating reverse proxies or when a `basePath` is configured:

1. **Redirect callback** — changed the fallback redirect from `${baseUrl}/` to `${baseUrl}${buildAppPath("/")}` so it respects the app's base path.
2. **Explicit cookie configuration** — added a full `cookies` block with explicit names (no `__Host-` / `__Secure-` prefixes) and security flags derived from `NEXTAUTH_URL` at runtime.

## Why

NextAuth auto-detects secure cookie prefixes based on the request, which breaks in environments where the app is behind a reverse proxy that terminates SSL. The proxy forwards HTTP internally, so NextAuth sees a non-HTTPS request and omits the `Secure` flag — or vice versa, uses `__Host-`/`__Secure-` prefixes that don't match cookies set earlier. Explicit cookie config makes the behavior deterministic and tied to `NEXTAUTH_URL`.

## Files Changed

- `src/app/api/auth/[...nextauth]/route.ts`
  - `redirect` callback: use `buildAppPath("/")` as the fallback redirect target
  - Added `useSecureCookies` flag derived from `NEXTAUTH_URL`
  - Added explicit `cookies` config for: `sessionToken`, `callbackUrl`, `csrfToken`, `pkceCodeVerifier`, `state`
