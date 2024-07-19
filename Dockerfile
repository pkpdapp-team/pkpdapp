# Using a 2-stage build. This is the builder for javascript frontend

FROM node:20 as build

ENV YARN_VERSION 4.2.2
RUN yarn policies set-version $YARN_VERSION

RUN mkdir -p /app/frontend
WORKDIR /app/frontend
COPY frontend-v2/package.json /app/frontend
COPY frontend-v2/yarn.lock /app/frontend/
COPY frontend-v2/.yarnrc.yml /app/frontend/
COPY frontend-v2/.yarn /app/frontend/.yarn

RUN yarn install --immutable

COPY frontend-v2 /app/frontend/
COPY .env.prod /app/
COPY .env.prod /app/frontend/.env

# use git on the host to set REACT_APP_VERSION to the current git commit
ARG GIT_COMMIT_ID
ENV VITE_APP_VERSION=$GIT_COMMIT_ID

RUN yarn build

FROM python:3.10

# install libsundials-dev
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y libsundials-dev memcached

# install nginx
RUN apt-get install nginx vim -y --no-install-recommends
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
RUN chown www-data:www-data /etc/nginx/sites-available/default

# install envsubst and git
RUN apt-get install -y gettext-base 

# clean up apt
RUN apt-get clean
RUN apt-get autoclean
RUN apt-get autoremove
RUN rm -rf /var/lib/apt/lists/*

# install dependencies
COPY ./requirements.txt /
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y build-essential libsasl2-dev python3-dev libldap2-dev libssl-dev

RUN pip install  -r requirements.txt

# install server code
WORKDIR /app
COPY ./pkpdapp .

RUN python manage.py collectstatic --noinput
RUN python manage.py migrate --noinput

# copy the built frontend (needs to be after we install nginx)
COPY --from=build /app/frontend/build /usr/share/nginx/html

# we're running as the www-data user, so make the files owned by this user
RUN chown -R www-data:www-data .

# make /var/www/.config dir and make it writable (myokit writes to it)
RUN mkdir -p /var/www/.config
RUN chown -R www-data:www-data /var/www

# gunicorn and nginx needs to write to a few places
RUN chown -R www-data:www-data /var/lib/nginx /run /tmp

# server setup files
COPY nginx.default.template .
COPY start-server.sh .
RUN chown -R www-data:www-data nginx.default.template start-server.sh

# run as www-data
USER www-data

# start server using the port given by the environment variable $PORT
# nginx config files don't support env variables so have to do it manually
# using envsubst
STOPSIGNAL SIGTERM
CMD /bin/bash -c "envsubst '\$PORT' < ./nginx.default.template > /etc/nginx/sites-available/default" && "./start-server.sh"
