#!/usr/bin/env bash
# start-server.sh

# Render the nginx config from the template. SSL_CERT_PATH / SSL_KEY_PATH may
# themselves contain a ${HOST_NAME} placeholder (the certbot deploy sets the
# cert path to /etc/letsencrypt/live/${HOST_NAME}/...). Expand that here, inside
# the container, where HOST_NAME is reliably set from .env.prod. Compose-level
# ${HOST_NAME} substitution can't do this because it reads the shell / root .env
# at parse time, not the container's env_file (so it would resolve to empty).
export SSL_CERT_PATH="$(printf '%s' "$SSL_CERT_PATH" | envsubst '$HOST_NAME')"
export SSL_KEY_PATH="$(printf '%s' "$SSL_KEY_PATH" | envsubst '$HOST_NAME')"
envsubst '$PORT $HOST_NAME $SSL_CERT_PATH $SSL_KEY_PATH' \
  < ./nginx.default.template > /etc/nginx/sites-available/default

(python manage.py migrate --no-input)
(memcached -l 127.0.0.1 -p 11211 -m "${MEMCACHED_MEMORY_MB:-64}" -U 0) &
(gunicorn pkpdapp.wsgi:application --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
