#!/usr/bin/env bash
#
# certbot --deploy-hook script. certbot runs this (as root) after a certificate
# is successfully issued or renewed.
#
# Why this is needed: certbot writes the private key as root-only (mode 0600)
# inside directories that are not group-traversable. nginx runs *inside the app
# container as the non-root www-data user* and reads the cert over the read-only
# /etc/letsencrypt bind mount, so without this it cannot read the key and fails
# to (re)start. We grant the container's group read + directory traverse on the
# Let's Encrypt files (group-only, NOT world-readable), then reload nginx so it
# picks up the renewed certificate.
#
# certbot stores the path to this hook in the renewal config, so it is re-run
# automatically on every renewal (re-applying the permissions, which certbot
# resets each time).
set -euo pipefail

# Repo directory = the location of this script (it lives at the repo root).
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The compose invocation for the running app stack (base + certbot override).
COMPOSE=(docker compose -f "$REPO_DIR/docker-compose.yml" -f "$REPO_DIR/docker-compose.certbot.yml")

# Group that nginx runs as *inside the container*. Ask the container directly
# rather than hardcoding, so this is correct regardless of the base image. Bind
# mounts share gids numerically between host and container, so the numeric gid
# is what matters for the chgrp below. Falls back to 33 (Debian's static
# www-data gid, which the current python:3.x-bookworm image uses) if the lookup
# fails for any reason.
NGINX_GID="$("${COMPOSE[@]}" exec -T app id -g www-data 2>/dev/null | tr -d '[:space:]')"
if ! [[ "$NGINX_GID" =~ ^[0-9]+$ ]]; then
  NGINX_GID=33
fi

# Grant the container's group read access + directory traversal on the live and
# archive trees. The private key becomes 0640 root:<gid> (group-readable, not
# world-readable); the directories become group-traversable.
chgrp -R "$NGINX_GID" /etc/letsencrypt/live /etc/letsencrypt/archive
chmod -R g+rX /etc/letsencrypt/live /etc/letsencrypt/archive

# Reload nginx inside the running app container so it serves the new cert.
"${COMPOSE[@]}" exec -T app nginx -s reload
