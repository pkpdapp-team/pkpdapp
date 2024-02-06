#!/usr/bin/env bash
# start-server.sh
(python manage.py migrate --no-input)
(python update_models.py)
(celery -A pkpdapp worker --loglevel=INFO) &
(gunicorn pkpdapp.wsgi:application --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
