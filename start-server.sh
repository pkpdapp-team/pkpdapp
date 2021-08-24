#!/usr/bin/env bash
# start-server.sh
cd pkpdapp; gunicorn pkpdapp.wsgi:application --bind :8000 --workers 3
