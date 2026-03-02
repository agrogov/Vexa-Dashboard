# PR: Docker hardening for Infobip internal deployment

## Title

chore: switch to Infobip Docker registry and trust internal Root CA

## Description

Prepares the Docker build for internal Infobip deployment by switching to the private container registry and installing the Infobip Root CA so the app can make HTTPS calls to internal services.

## Changes

### `.gitignore`

- Add `.idea` to ignored files (JetBrains IDE project directory)

### `Dockerfile`

- Switch base images from `node:20-alpine` to `docker.ib-ci.com/node:20-alpine` (Infobip internal registry) for both builder and runner stages
- Install `ca-certificates` and `curl` in the runner stage
- Fetch and trust the Infobip Root CA (`http://ca.infobip.com/crl/RootCA.crt`) so outbound HTTPS calls to internal services succeed
- Set `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt` so Node.js respects the system CA bundle

## Test Plan

- [ ] Build Docker image using `docker.ib-ci.com` registry — verify image builds successfully
- [ ] Run container and verify HTTPS calls to Infobip internal services succeed (CA trusted)
- [ ] Verify `NODE_EXTRA_CA_CERTS` is set in the running container (`docker exec ... printenv`)
- [ ] Verify `.idea` directory is ignored by git
