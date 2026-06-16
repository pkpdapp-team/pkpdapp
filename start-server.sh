#!/usr/bin/env bash
# start-server.sh
(python manage.py migrate --no-input)
(memcached -l 127.0.0.1 -p 11211 -m "${MEMCACHED_MEMORY_MB:-64}" -U 0) &
(gunicorn pkpdapp.wsgi:application --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
