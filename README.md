[![Unit tests on multiple python versions](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(python%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![Unit tests on multiple operating systems](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(OS%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![codecov](https://codecov.io/gh/pkpdapp-team/pkpdapp/branch/master/graph/badge.svg)](https://codecov.io/gh/pkpdapp-team/pkpdapp)

# PKPDApp

PKPDApp is a web-based application to explore, analyse and model the pharmacokinetics and pharmacodynamics of chemical compounds. The app is currently under heavy development, however a preliminary version is being deployed with Heroku and can be found under https://pkpdapp.herokuapp.com/. 

## Installation - development

If you are interested in developing PKPDApp with us, or just run the app locally, you can clone the repository and follow the installation instructions below.

1. Install sundials
    - Ubuntu-latest:
    ```bash
    $ apt-get install libsundials-dev
    ```
    - MacOS-latest:
    ```bash
    $ brew install sundials
    ```
    - Windows-latest:
    Sundials will be installed automatically by installing the app.
    
2. Install app and requirements

```bash
$ pip install -e .
```

3. Create database

```bash
$ cd pkpdapp
$ python manage.py migrate
```

4. Collect static files
```bash
$ python manage.py collectstatic
```

5. Run local server

```bash
$ python manage.py runserver
```

6. (Optional) Create admin user

```bash
$ python manage.py createsuperuser
```

You should be able to see the pkpd web app at [127.0.0.1:8000](127.0.0.1:8000).


## Installation - docker with nginx and gunicorn

Alternatively you can build a docker image and run the image inside the container with commands below.

```bash
$ docker build -t pkpdapp .
```

Run the server

```bash
$ docker run -it -p 8020:8020 \
                 -e PORT=8020 \
                 -e DEBUG=1 \
                 -e SECRET_KEY=aLargeRandomSecretKey \
                 -e DJANGO_SUPERUSER_USERNAME=admin \
                 -e DJANGO_SUPERUSER_PASSWORD=sekret1 \
                 -e DJANGO_SUPERUSER_EMAIL=admin@example.com \
                 pkpdapp
```

You should be able to see the pkpd web app at [127.0.0.1:8020](127.0.0.1:8020).


## License
PKPDApp is fully open source. For more information about its license, see [LICENSE.md](LICENSE.md).


