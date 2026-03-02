# Vexa Dashboard

Open-source web UI for [Vexa](https://github.com/Vexa-ai/vexa): join meetings, watch live transcripts, manage users/tokens, and review transcript history.

Main backend repo: [Vexa](https://github.com/Vexa-ai/vexa)

## Quick Start (Docker)

```bash
docker run --rm -p 3000:3000 \
  -e VEXA_API_URL=http://your-vexa-host:8056 \
  -e VEXA_ADMIN_API_KEY=your_admin_api_key \
  vexaai/vexa-dashboard:latest
```

Then open `http://localhost:3000`.

## Local Development

```bash
git clone https://github.com/Vexa-ai/Vexa-Dashboard.git
cd Vexa-Dashboard
npm install
cp .env.example .env.local
npm run dev
```

Local dev server runs on `http://localhost:3001`.

## Recording Playback (Post-Meeting)

On completed meetings, the meeting detail page can show an audio playback strip (if a recording exists) and highlight transcript segments during playback. Clicking a segment seeks the audio.

Backend requirements:
- Vexa must expose recordings in the transcript response (so the dashboard can discover recordings without extra calls).
- `GET /recordings/{recording_id}/media/{media_file_id}/raw` should stream audio with `Range` support (`206`) and `Content-Disposition: inline` so browser seeking works.

Notes:
- The dashboard fetches audio through its own `/api/vexa/...` proxy to avoid MinIO/S3 CORS issues.

## Zoom Notes

Zoom meeting joins require additional setup in the Vexa backend (Zoom Meeting SDK + OAuth/OBF). See the Vexa repo doc: `docs/zoom-app-setup.md`.

## Required Configuration

| Variable | Required | Notes |
|---|---|---|
| `VEXA_API_URL` | Yes | Vexa API base URL (usually `http://localhost:8056` for local Vexa) |
| `VEXA_ADMIN_API_KEY` | Yes | Admin API key used for auth/user management |
| `VEXA_ADMIN_API_URL` | No | Optional override; defaults to `VEXA_API_URL` |

## Common Optional Configuration

| Area | Variables |
|---|---|
| Session/auth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET` |
| Magic-link email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Google OAuth | `ENABLE_GOOGLE_AUTH`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Zoom OAuth | `ZOOM_OAUTH_CLIENT_ID`, `ZOOM_OAUTH_CLIENT_SECRET`, `ZOOM_OAUTH_REDIRECT_URI`, `ZOOM_OAUTH_STATE_SECRET` |
| AI assistant | `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` |
| Registration policy | `ALLOW_REGISTRATIONS`, `ALLOWED_EMAIL_DOMAINS` |
| Frontend/public URLs | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_TRANSCRIPT_SHARE_BASE_URL`, `NEXT_PUBLIC_VEXA_WS_URL`, `NEXT_PUBLIC_WEBAPP_URL` |

See `.env.example` for a complete template.

## Compose Example

```yaml
services:
  vexa-dashboard:
    image: vexaai/vexa-dashboard:latest
    ports:
      - "3000:3000"
    environment:
      VEXA_API_URL: http://vexa:8056
      VEXA_ADMIN_API_KEY: ${VEXA_ADMIN_API_KEY}
```

## Troubleshooting

- Login or admin routes fail: verify `VEXA_ADMIN_API_KEY` is valid.
- Dashboard loads but data is empty: verify `VEXA_API_URL` is reachable from the container/runtime.
- OAuth callbacks fail: verify `NEXTAUTH_URL` and provider redirect URIs match exactly.

## Screenshots

![Dashboard](docs/screenshots/01-dashboard.png)
![Join Meeting](docs/screenshots/02-join-meeting.png)
![Live Transcript](docs/screenshots/06-live-transcript.png)

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_BOT_NAME` | Default name for transcription bots | `Vexa - Open Source Bot` |
| `AI_MODEL` | AI provider/model (e.g., `openai/gpt-4o`) | - |
| `AI_API_KEY` | API key for AI provider | - |
| `SMTP_HOST` | SMTP server for Magic Link auth | - |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | Sender email address | - |
| `ENABLE_GOOGLE_AUTH` | Enable Google OAuth (`true`/`false`, default: auto-detect from config) | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (required if `ENABLE_GOOGLE_AUTH=true`) | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (required if `ENABLE_GOOGLE_AUTH=true`) | - |
| `ENABLE_AZURE_AD_AUTH` | Enable Azure AD/Entra ID OAuth (`true`/`false`, default: auto-detect from config) | - |
| `AZURE_AD_CLIENT_ID` | Azure AD/Entra ID client ID (required if `ENABLE_AZURE_AD_AUTH=true`) | - |
| `AZURE_AD_CLIENT_SECRET` | Azure AD/Entra ID client secret (required if `ENABLE_AZURE_AD_AUTH=true`) | - |
| `AZURE_AD_TENANT_ID` | Azure AD/Entra ID tenant ID (required if `ENABLE_AZURE_AD_AUTH=true`) | - |
| `NEXTAUTH_URL` | Base URL for NextAuth (e.g., `http://localhost:3000`) | - |
| `NEXTAUTH_SECRET` | Secret for NextAuth (can use `VEXA_ADMIN_API_KEY`) | - |
| `ALLOW_REGISTRATIONS` | Allow new signups | `true` |
| `ALLOWED_EMAIL_DOMAINS` | Restrict signup domains | All |

### AI Providers

```bash
# OpenAI
AI_MODEL=openai/gpt-4o

# Anthropic Claude
AI_MODEL=anthropic/claude-sonnet-4-20250514

# Groq (fast & free)
AI_MODEL=groq/llama-3.3-70b-versatile

# Local Ollama
AI_MODEL=ollama/llama3.2
AI_BASE_URL=http://localhost:11434/v1
```

## 🔐 Authentication Modes

### Google OAuth (Optional - Recommended for Production)

With Google OAuth configured, users can sign in with their Google account.

**To enable Google OAuth:**

1. Set the flag: `ENABLE_GOOGLE_AUTH=true`
2. Configure Google OAuth credentials:
```bash
ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (or your production URL)
4. Copy the Client ID and Client Secret to your environment variables
5. Set `ENABLE_GOOGLE_AUTH=true` to enable Google authentication

**Note:** If `ENABLE_GOOGLE_AUTH` is not set, Google OAuth will be automatically enabled if all required configuration variables are present (backward compatible behavior). Set `ENABLE_GOOGLE_AUTH=false` to explicitly disable Google OAuth.

### Microsoft Entra ID (Azure AD OAuth)

With Entra ID configured, users can sign in with their Microsoft account.

**To enable Entra ID OAuth:**

1. Set the flag: `ENABLE_AZURE_AD_AUTH=true`
2. Configure Entra ID credentials:
```bash
ENABLE_AZURE_AD_AUTH=true
AZURE_AD_CLIENT_ID=your_entra_client_id
AZURE_AD_CLIENT_SECRET=your_entra_client_secret
AZURE_AD_TENANT_ID=your_tenant_id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
```

**Setup Instructions:**
1. Go to [Microsoft Entra admin center](https://entra.microsoft.com/)
2. Register a new application (Single tenant or multi-tenant as needed)
3. Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (or your production URL)
4. Create a client secret and copy the value
5. Set `ENABLE_AZURE_AD_AUTH=true` to enable Entra authentication

**Note:** If `ENABLE_AZURE_AD_AUTH` is not set, Entra ID OAuth will be automatically enabled if all required configuration variables are present. Set `ENABLE_AZURE_AD_AUTH=false` to explicitly disable Entra ID OAuth.

### Magic Link (with SMTP)

With SMTP configured, users receive a secure sign-in link via email. Recommended if not using Google OAuth.

### Direct Login (Default)

Without SMTP or Google OAuth configured, users authenticate with just their email (no verification). Great for development and trusted environments.

**Note:** When Google OAuth or Entra ID OAuth is enabled (via `ENABLE_GOOGLE_AUTH=true`, `ENABLE_AZURE_AD_AUTH=true`, or auto-detected from config), it takes precedence. Email authentication (magic link or direct) will be available as a secondary option. Set the appropriate flag to `false` to disable OAuth and use email authentication only.

## 💻 Local Development

```bash
# Clone
git clone https://github.com/Vexa-ai/vexa-dashboard.git
cd vexa-dashboard

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your values

# Run
npm run dev
```

## 🏗️ Build from Source

```bash
# Build image
docker build -t vexa-dashboard .

# Run
docker run -p 3000:3000 \
  -e VEXA_API_URL=http://your-vexa-instance:8056 \
  -e VEXA_ADMIN_API_URL=http://your-vexa-instance:8057 \
  -e VEXA_ADMIN_API_KEY=your_admin_api_key \
  vexa-dashboard
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Language**: TypeScript
- **AI**: Vercel AI SDK

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related

- [Vexa deployment guide](https://github.com/Vexa-ai/vexa/blob/main/docs/deployment.md)
- [Vexa Lite deployment guide](https://github.com/Vexa-ai/vexa/blob/main/docs/vexa-lite-deployment.md)
- [Vexa API guide](https://github.com/Vexa-ai/vexa/blob/main/docs/user_api_guide.md)

## License

Apache-2.0 (`LICENSE`)
