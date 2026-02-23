# Production Installation Guide

This guide covers deploying PKPDApp in a production environment using Docker containers.

## Get the Code

First clone the repository:

```bash
git clone https://github.com/pkpdapp-team/pkpdapp.git
cd pkpdapp
```

## Environment Configuration

### `.env.prod` File

The configuration of the production application is stored in the `.env.prod` file in the root directory. Edit this file and variables to correspond to your particular setup, in particular make sure `HOST_NAME`, `DATABASE_URL` is set correctly and that `SECRET_KEY` is altered from the default. The variables are described below:

**Core Settings:**

- `DEBUG`: set to 0 for production
- `HOST_NAME`: the host name of the application
- `SECRET_KEY`: a large random string used for cryptographic signing
- `DATABASE_URL`: URL of a postgres database (e.g. postgres://username:password@postgres:5432/postgres). Note that any special characters in the password must be url-encoded. E.g. `postgres://user:p#ssword!@localhost/foobar` should be written as `postgres://user:p%23ssword!@localhost/foobar`.
- `ENABLE_SIGNUP`: set to 'true' to enable user sign up

**LDAP Authentication (Optional):**

The following variables are used for LDAP authentication:

- `AUTH_LDAP_USE`: set to 1 to use LDAP authentication
- `AUTH_LDAP_SERVER_URI`: URI of LDAP server (e.g. ldap://ldap.forumsys.com:389)

For direct binding:

- `AUTH_LDAP_DIRECT_BIND`: set to 1 to bind directly to LDAP server (see [here](https://django-auth-ldap.readthedocs.io/en/latest/authentication.html#direct-bind)
- `AUTH_LDAP_BIND_DN_TEMPLATE`: template for direct binding (e.g. `uid=%(user)s,dc=example,dc=com`)

For search/bind, connecting to the LDAP server either anonymously or with a fixed account and searching for the distinguished name of the authenticating user:

- `AUTH_LDAP_BIND_DN`: distinguished name of an authorized user (e.g. `cn=read-only-admin,dc=example,dc=com`)
- `AUTH_LDAP_BIND_PASSWORD`: password for the authorized user
- `AUTH_LDAP_SEARCH_BASE`: where to perform the search (e.g. `ou=mathematicians,dc=example,dc=com`)
- `AUTH_LDAP_SEARCH_BASE{i}`: additional search bases (optional, `i` can be one of `[2, 3, 4, 5]`). e.g. `AUTH_LDAP_SEARCH_BASE2=ou=scientists,dc=example,dc=com`
- `AUTH_LDAP_SEARCH_FILTER`: search filter based on authenticated username (`uid=%(user)s`)
- `AUTH_LDAP_USER_GROUP`: (optional) authentication will only succeed if user is in this LDAP group (e.g. `cn=user,ou=groups,dc=example,dc=com`). If not set, then any user in the search base will be authenticated.
- `AUTH_LDAP_ADMIN_GROUP`: (optional) user must be in this LDAP group to be a superuser (e.g. `cn=admin,ou=groups,dc=example,dc=com`). If not set, then no user will be a superuser.

**PrediLogin Authentication (Optional):**

The following variables are used for PrediLogin authentication:

- `AUTH_PREDILOGIN_USE`: set to 1 to use PrediLogin authentication
- `AUTH_PREDILOGIN_BASE_URL`: URL of PrediLogin API (e.g. <https://predilogin.example.com/api>)
- `AUTH_PREDILOGIN_API_KEY`: API key for PrediLogin (e.g. `your_api_key_here`)
- `AUTH_PREDILOGIN_ADMIN_GROUP`: user must be in this group to be a superuser (e.g. `admin`)
- `AUTH_PREDILOGIN_USER_GROUP`: authentication will only succeed if user is in this group (e.g. `user`)

### Frontend Environment Variables

There are also a number of frontend variables that can be set in `frontend-v2/.env`:

- `VITE_APP_ROCHE`: set to true to enable Roche branding
- `VITE_APP_HELP_URL`: url of help page shown on login
- `VITE_APP_GA_ID`: Google Analytics ID to enable analytics.
- `VITE_ENABLE_SIGNUP`: set to true to enable user sign up
- `VITE_APP_ACK_TXT`: Acknowledgment text for login and signup pages

## SSL Certificate

The application uses SSL certificates for HTTPS. You will need to supply your own SSL certificate and key. These should be placed in the `.certs/` directory in the root folder (this folder needs to be created) and named `pkpdapp.crt` and `pkpdapp.key` respectively.

## PostgreSQL Database

The application uses a PostgreSQL database. You should supply your own database and set the `DATABASE_URL` variable in the `.env.prod` file appropriately.

## Help Pages & Tutorials

To add tutorial videos to the application, you will need to create a csv file with the following columns (the first line of the csv file should be the column names):

- `Title`: title of the video
- `Type`: tab in which the video will be displayed (either `Tutorial X` where `X` is a number, `Project`, `Drug`, `Model`, `Trial Design`  or `Simulation`)
- `Link`: link to the video
- `Keywords`: keywords associated with the video (optional)

This file should be placed in the `pkpdapp/static/` directory and named `tutorial_videos.csv`.

To link to an external help page url, set the `REACT_APP_HELP_URL` variable in the `.env.prod` file to the url of the help page.

## Docker Deployment

The application is deployed using docker containers and docker-compose, so you will need to install these.

### Build the Containers

To build the containers, run the following command in the root directory of the repository. This runs a script that builds the containers (using `docker compose build`):

```bash
./build.sh
```

### Run the Application

You can run the container with:

```bash
docker-compose up
```

You should be able to see the web application at [127.0.0.1](127.0.0.1).

To leave the container running in the background, use:

```bash
docker-compose up -d
```
