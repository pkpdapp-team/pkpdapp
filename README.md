<a href="https://pkpdapp.herokuapp.com">
    <img src="./pkpdapp/pkpdapp/static/images/logo_pkpdapp_with_text_no_boundary.svg" alt="PKPDApp logo" align="right">
</a>

[![Unit tests on multiple python versions](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(python%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![Unit tests on multiple operating systems](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(OS%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![codecov](https://codecov.io/gh/pkpdapp-team/pkpdapp/branch/master/graph/badge.svg)](https://codecov.io/gh/pkpdapp-team/pkpdapp)

# PKPDApp

PKPDApp is an open source web-based application to explore, analyse and model the pharmacokinetics and pharmacodynamics of chemical compounds. The app is currently under heavy development, however a preliminary version is being deployed with Heroku and can be found under https://pkpdapp.herokuapp.com/.

## Installation - development

If you are interested in developing PKPDApp with us, or just run the app locally, you can clone the repository and follow the installation instructions below.

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

5. Run RabbitMQ

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


## Installation - production

Alternatively you can build a docker image and run the image inside the container with commands below.

```bash
$ docker-compose build
$ docker-compose up
```

You should be able to see the web application at [127.0.0.1](127.0.0.1).

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
python manage.py generateschema --file schema.yml
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
