<a href="https://pkpdapp.herokuapp.com">
    <img src="./pkpdapp/pkpdapp/static/images/logo_pkpdapp_with_text_no_boundary.svg" alt="PKPDApp logo" align="right">
</a>

[![Unit tests on multiple python versions](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(python%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![Unit tests on multiple operating systems](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(OS%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![codecov](https://codecov.io/gh/pkpdapp-team/pkpdapp/branch/master/graph/badge.svg)](https://codecov.io/gh/pkpdapp-team/pkpdapp)

# PKPDApp

PKPDApp is an open source web-based application to explore, analyse and model the pharmacokinetics and pharmacodynamics of chemical compounds. The app is currently under heavy development, however a preliminary version is being deployed with Heroku and can be found under https://pkpdapp.herokuapp.com/.

## Installation - production

Use these instructions for deploying the application in a production environment. Instructions for developers can be found below.

### `.env.prod` file

The configuration of the production application is stored in the `.env.prod` file. Edit this file and variables to correspond to your particular setup. The variables are described below:

- `DEBUG`: set to 0 for production
- `HOST_NAME`: the host name of the application
- `SECRET_KEY`: a large random string used for cryptographic signing
- `POSTGRES_PASSWORD`: password for postgres database specified in `docker-compose.yml` (not needed if using your own database)
- `DATABASE_URL`: URL of a postgres database (e.g. postgres://username:password@postgres:5432/postgres). Do not alter this if you are using the
  postgres service in the `docker-compose.yml` file.

- `RABBITMQ_DEFAULT_USER`: username for rabbitmq server (optional)
- `RABBITMQ_DEFAULT_PASS`: password for rabbitmq server (optional)

The following variables are used for LDAP authentication (optional):

- `AUTH_LDAP_USE`: set to 1 to use LDAP authentication
- `AUTH_LDAP_SERVER_URI`: URI of LDAP server (e.g. ldap://ldap.forumsys.com:389)

For direct binding:

- `AUTH_LDAP_DIRECT_BIND`: set to 1 to bind directly to LDAP server (see [here](https://django-auth-ldap.readthedocs.io/en/latest/authentication.html#direct-bind)
- `AUTH_LDAP_BIND_DN_TEMPLATE`: template for direct binding (e.g. `uid=%(user)s,dc=example,dc=com`)

For search/bind, connecting to the LDAP server either anonymously or with a fixed account and searching for the distinguished name of the authenticating user.

- `AUTH_LDAP_BIND_DN`: distinguished name of an authorized user (e.g. `cn=read-only-admin,dc=example,dc=com`)
- `AUTH_LDAP_BIND_PASSWORD`: password for the authorized user
- `AUTH_LDAP_SEARCH_BASE`: where to perform the search (e.g. `ou=mathematicians,dc=example,dc=com`)
- `AUTH_LDAP_SEARCH_FILTER`: search filter based on authenticated username (`uid=%(user)s`)
- `AUTH_LDAP_USER_GROUP`: (optional) authentication will only succeed if user is in this LDAP group (e.g. `cn=user,ou=groups,dc=example,dc=com`). If not set, then any user in the search base will be authenticated.
- `AUTH_LDAP_ADMIN_GROUP`: (optional) user must be in this LDAP group to be a superuser (e.g. `cn=admin,ou=groups,dc=example,dc=com`). If not set, then no user will be a superuser.


### SSL Certificate

The application uses SSL certificates for HTTPS. You will need to supply your
own SSL certificate and key. These should be placed in the `.certs/` directory
in the root folder (this folder needs to be created) and named `pkpdapp.crt` and
`pkpdapp.key` respectively.

### PostgreSQL database

The application uses a PostgreSQL database. You can either supply your own
database and set the `DATABASE_URL` variable in the `.env.prod` file, or the
`docker-compose.yml` file contains a postgres service that can be used, along
with the `DATABASE_URL` variable already set in the `.env.prod` file.

If you are using your own database, you can delete the postgres service from the
`docker-compose.yml` file.

### Containers

The application is deployed using docker containers and docker-compose, so you will need to install these.

You can build a docker image and run the image inside the container with commands below (run these commands in the root directory of the repository):

```bash
$ docker-compose build
$ docker-compose up
```

You should be able to see the web application at [127.0.0.1](127.0.0.1).

To leave the container running in the background, use

```bash
$ docker-compose up -d
```

## Installation - development

If you are interested in developing PKPDApp with us, or just run the app locally, you can clone the repository and follow the installation instructions below.

NOTE: the current version of the frontend does not currently use the rabbitmq server, so you can skip the installation of rabbitmq for the moment (later iterations of the frontend will use the rabbitmq server).

### Django backend

1. Install sundials, python dev libraries and rabbitmq server
    - Ubuntu-latest:
    ```bash
    apt-get install libsundials-dev python3-dev rabbitmq-server
    ```
    Note: if you are in WSL then the rabbitmq server will not automatically start, you 
    can start it manually using `sudo -u rabbitmq rabbitmq-server`
    - MacOS-latest:
    ```bash
    brew install sundials rabbitmq
    ```
    Note: to restart rabbitmq after an upgrade: brew services restart rabbitmq
    - Windows-latest:
    Sundials will be installed automatically by installing the app.


5. Set environment variables

  - Edit the `.env` file in the root of the repository and edit the following environment
  variables to correspond to your particular setup. The most important
  variables to alter are those corresponding to secret keys and passwords, others
  you can probably leave as-is.

6. Install requirements

  - Create a new virtual environment (optional) then install the requirements

```bash
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

5. Create database

```bash
cd pkpdapp
python manage.py migrate
```

5. Run RabbitMQ (optional)

```bash
celery -A pkpdapp worker --loglevel=INFO
```

5. Run local server

```bash
python manage.py runserver
```

6. (Optional) Create admin user

```bash
python manage.py createsuperuser
```

### React frontend

Running the frontend will require a local installation of Node.js. On Ubuntu 20.04 LTS, 
for example, you can install using `snap`

```bash
sudo snap install node --classic
```

It is also useful to install the `yarn` package manager

```bash
npm install --global yarn
```

Navigate to the `frontend/` directory and install the Node.js dependencies

```bash
cd frontend
yarn install
```

You can run the frontend using 

```bash
yarn start
```

You should be able to see the pkpd web app at [127.0.0.1:3000](127.0.0.1:3000).



## Code testing

We run a range of tests each time a commit is pushed to an open pull request
using Github Actions. Passing these tests is prerequisite for merging a pull
request. Some of these can be run locally as described below:

- copyright tests: `python run-tests.py --copyright`
- code style: `flake8`
- unit tests: `python manage.py test` runs everything; to run a single test in
a file (say) called `test_models.py` use
`python manage.py test pkpdapp.tests.test_models`
- code coverage tests: can't be done locally

## Generating OpenAPI spec

The front-end communicates with the back-end using a REST API. The API can be
described using the OpenAPI specification. To generate the OpenAPI
specification, run the following command:

```bash
python manage.py spectacular --color --file schema.yml
```

## Generating RTX Query API class

The front-end uses the Redux Toolkit RTX Query tool to automatically generate a
client for the api based on the OpenAPI spec described above. To generate the
client, run the following command in the frontend directory:

```bash
npx @rtk-query/codegen-openapi openapi-config.json
```

# Running the cache

Install the cache using

```bash
$ sudo apt install memcached
```

Run memcached using

```bash
$ memcached -p 11211
```

## License
PKPDApp is fully open source. For more information about its license, see [LICENSE.md](LICENSE.md).
