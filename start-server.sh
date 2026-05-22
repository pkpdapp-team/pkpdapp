#!/usr/bin/env bash
# start-server.sh
(memcached -l 127.0.0.1 -p 11211 -m "${MEMCACHED_MEMORY_MB:-64}" -U 0) &
(python manage.py migrate --no-input)
(python update_models.py)
(python update_units.py)
(celery -A pkpdapp worker --loglevel=INFO) &
(gunicorn pkpdapp.wsgi:application --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
