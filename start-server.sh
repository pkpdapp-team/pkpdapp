#!/usr/bin/env bash
# start-server.sh
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] ; then
    (python manage.py createsuperuser --no-input)
fi
(python manage.py migrate --no-input)
(celery -A pkpdapp worker --loglevel=INFO) &
(gunicorn pkpdapp.wsgi:application --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
