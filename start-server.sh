#!/usr/bin/env bash
# start-server.sh
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] ; then
    (cd pkpdapp; python manage.py createsuperuser --no-input)
fi
(cd pkpdapp; gunicorn pkpdapp.wsgi --bind unix:/run/gunicorn.socket --workers 3) &
nginx -g "daemon off;"
