# PR: Add Microsoft Entra ID (Azure AD) SSO authentication

## Title

feat: add Microsoft Entra ID (Azure AD) SSO authentication

## Description

Adds support for Microsoft Entra ID (formerly Azure AD) as an OAuth identity provider alongside the existing Google OAuth and email-based authentication methods. Users can now sign in with their Microsoft organizational account via a "Sign in with Microsoft" button on the login page.

The implementation follows the same feature-flag pattern used by Google OAuth: auto-detected from configuration when all required environment variables are present, or explicitly controlled via `ENABLE_AZURE_AD_AUTH`.

## Changes

### `src/app/api/auth/[...nextauth]/route.ts`

- Import `AzureADProvider` from `next-auth/providers/azure-ad`
- Add `isAzureAdAuthEnabled()` function that checks for `ENABLE_AZURE_AD_AUTH` flag and required env vars (`AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `NEXTAUTH_URL`); mirrors the existing `isGoogleAuthEnabled()` pattern
- Add `getAppBasePath()` and `buildAppPath()` helpers to derive the application base path from `NEXTAUTH_URL`, ensuring NextAuth sign-in/error page redirects work correctly when the app is deployed under a sub-path (e.g. `/vexa`)
- Register `AzureADProvider` conditionally in the providers array
- Update NextAuth `pages.signIn` and `pages.error` to use `buildAppPath()` for base-path awareness
- Extend the `signIn` callback to handle `account.provider === "azure-ad"` in addition to `"google"`, so Azure AD users are created/authenticated via the Vexa Admin API the same way Google users are

### `src/app/login/page.tsx`

- Remove direct `signIn` import from `next-auth/react`
- Add `withBasePath` import from `@/lib/base-path` for base-path-aware fetch calls
- Add `azureAdOAuth` to the `HealthStatus` interface and fallback error state
- Add generic `signInWithProvider()` function that manually fetches a CSRF token and POSTs to the NextAuth sign-in endpoint for a given provider (`"google"` or `"azure-ad"`), replacing the previous `signIn()` call — this approach is base-path compatible
- Refactor `handleGoogleSignIn()` to delegate to `signInWithProvider("google")`
- Add `handleAzureAdSignIn()` that delegates to `signInWithProvider("azure-ad")`
- Introduce `isAzureAdAuthEnabled` and `isOAuthEnabled` flags to generalize OAuth UI logic (card description, email input autofocus, submit button variant) so they apply to both Google and Azure AD
- Render a "Sign in with Microsoft" button (with Microsoft four-square logo) when Azure AD is configured
- Both OAuth buttons render independently — either or both can be active simultaneously

### `src/app/api/health/route.ts`

- Add `"entra-id"` to the `authMode` union type in the `HealthStatus` interface
- Add `azureAdOAuth` check object to health status (configured, optional, error)
- Add Azure AD configuration validation block that checks `ENABLE_AZURE_AD_AUTH`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, and `NEXTAUTH_URL`
- When Azure AD is fully configured, set `authMode` to `"entra-id"`
- Adjust Google OAuth `authMode` assignment so it doesn't overwrite `"entra-id"` when both are configured (Entra ID takes precedence in `authMode` label)
- Remove duplicate `nextAuthUrl` declaration (now shared with Azure AD check above)

### `README.md`

- Add `ENABLE_AZURE_AD_AUTH`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` to the environment variables table
- Add a new "Microsoft Entra ID (Azure AD OAuth)" documentation section with setup instructions covering app registration in the Entra admin center, redirect URI configuration, and required environment variables
- Update the auth precedence note to mention Entra ID OAuth alongside Google OAuth

## Environment Variables

| Variable | Description |
|---|---|
| `ENABLE_AZURE_AD_AUTH` | Enable/disable Azure AD OAuth (`true`/`false`, auto-detected if omitted) |
| `AZURE_AD_CLIENT_ID` | Application (client) ID from Entra app registration |
| `AZURE_AD_CLIENT_SECRET` | Client secret value from Entra app registration |
| `AZURE_AD_TENANT_ID` | Directory (tenant) ID from Entra |

## Test Plan

- [ ] Verify app starts without Azure AD env vars (no regression, Google/email auth unaffected)
- [ ] Set `ENABLE_AZURE_AD_AUTH=false` — confirm "Sign in with Microsoft" button does not appear
- [ ] Configure all four Azure AD env vars + `ENABLE_AZURE_AD_AUTH=true` — confirm button appears
- [ ] Click "Sign in with Microsoft" — confirm redirect to Microsoft login and successful callback
- [ ] Verify user is created in Vexa Admin API on first Azure AD sign-in
- [ ] Verify session contains correct user data after Azure AD sign-in
- [ ] Test with both Google and Azure AD enabled simultaneously — both buttons should render
- [ ] Check `/api/health` reports `azureAdOAuth.configured: true` and `authMode: "entra-id"` when configured
- [ ] Test deployment under a sub-path (e.g. `/vexa`) — sign-in redirects should include the base path
