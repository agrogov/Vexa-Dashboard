# PR: Add Azure OpenAI provider support for AI chat

## Title

feat: add Azure OpenAI as an AI provider for the chat endpoint

## Description

Adds Azure OpenAI as a supported AI provider in the chat API route. This allows the AI chat feature to use models deployed on Azure OpenAI Service instead of (or in addition to) direct OpenAI or Anthropic APIs. The implementation uses the existing `createOpenAI` SDK with a custom fetch wrapper to handle Azure-specific authentication and API versioning requirements.

## Changes

### `src/app/api/ai/chat/route.ts`

- Read the new `AI_API_VERSION` environment variable alongside existing `AI_API_KEY` and `AI_BASE_URL`
- Add a `"azure"` case to the `getModel()` provider switch statement
- The Azure provider creates an OpenAI-compatible client via `createOpenAI` with a custom `fetch` wrapper that:
  - Appends `api-version` query parameter to every request URL (from `AI_API_VERSION` env var) if not already present
  - Sets the `api-key` header (Azure's expected auth header) if not already set
  - Removes the standard `authorization` header to avoid conflicts with Azure's auth mechanism
  - Handles both `Request` object and plain URL string fetch signatures
- Validates that both `AI_API_KEY` and `AI_BASE_URL` are provided when the `"azure"` provider is selected, throwing descriptive errors if missing
- Strips trailing slash from `AI_BASE_URL` before use

## Environment Variables

| Variable | Description |
|---|---|
| `AI_API_KEY` | Azure OpenAI API key (existing, now also used for Azure) |
| `AI_BASE_URL` | Azure OpenAI endpoint URL, e.g. `https://<resource>.openai.azure.com/openai/deployments/<deployment>` |
| `AI_API_VERSION` | Azure OpenAI API version, e.g. `2024-02-15-preview` (new) |

The AI provider is selected via the runtime config's `provider` field — set it to `"azure"` to use Azure OpenAI.

## Test Plan

- [ ] Verify existing providers (`openai`, `anthropic`) still work without regression
- [ ] Configure `provider: "azure"` with valid `AI_API_KEY`, `AI_BASE_URL`, and `AI_API_VERSION` — confirm chat responses are returned
- [ ] Verify `api-version` query parameter is appended to outgoing requests
- [ ] Verify `api-key` header is set and `authorization` header is removed
- [ ] Test with missing `AI_API_KEY` — confirm descriptive error is thrown
- [ ] Test with missing `AI_BASE_URL` — confirm descriptive error is thrown
- [ ] Test with trailing slash in `AI_BASE_URL` — confirm it is stripped correctly
