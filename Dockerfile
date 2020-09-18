FROM python:3.6-slim-stretch

# install libsundials-serial-dev
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y libsundials-serial-dev

# install nginx
RUN apt-get install nginx vim -y --no-install-recommends
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
RUN chown www-data:www-data /etc/nginx/sites-available/default

# install envsubst
RUN apt-get install -y gettext-base

# clean up apt
RUN apt-get clean
RUN apt-get autoclean
RUN apt-get autoremove
RUN rm -rf /var/lib/apt/lists/*

# install app and dependencies
RUN pip install --upgrade pip 
COPY ./ /pkpdapp
RUN cd /pkpdapp && pip install --no-cache-dir -r requirements.txt 
RUN python /pkpdapp/pkpdapp/manage.py migrate --noinput
RUN python /pkpdapp/pkpdapp/manage.py collectstatic --noinput

WORKDIR /pkpdapp

# we're running as the www-data user, so make the files owned by this user
RUN chown -R www-data:www-data /pkpdapp

# make /var/www/.config dir and make it writable (myokit writes to it)
RUN mkdir -p /var/www/.config
RUN chown -R www-data:www-data /var/www

# gunicorn needs to write to tmp 
RUN chown -R www-data:www-data /tmp

# nginx needs to write to a few places
RUN chown -R www-data:www-data /var/lib/nginx /run

# run as www-data
USER www-data

# start server using the port given by the environment variable $PORT
# nginx config files don't support env variables so have to do it manually
# using envsubst
STOPSIGNAL SIGTERM
CMD /bin/bash -c "envsubst '\$PORT' < /pkpdapp/nginx.default.template > /etc/nginx/sites-available/default" && "/pkpdapp/start-server.sh"
