[![Unit tests on multiple python versions](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(python%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![Unit tests on multiple operating systems](https://github.com/pkpdapp-team/pkpdapp/workflows/Unit%20tests%20(OS%20versions)/badge.svg)](https://github.com/pkpdapp-team/pkpdapp/actions)
[![codecov](https://codecov.io/gh/pkpdapp-team/pkpdapp/branch/master/graph/badge.svg)](https://codecov.io/gh/pkpdapp-team/pkpdapp)

# PKPDApp

PKPDApp is a web-based application to explore, analyse and model the pharmacokinetics and pharmacodynamics of chemical compounds. The app is currently under development, but we hope to release a beta-version soon. 

## Installation - development

1. Install sundials
    - Ubuntu-latest
```bash
$ apt-get install libsundials-dev
```

2. Install app and requirements

```bash
$ pip install -e .
```

3. Create database

```bash
$ cd pkpdapp
$ python manage.py migrate
```

4. Create admin user

```bash
$ python manage.py createsuperuser
```

5. Run local server

```bash
$ python manage.py runserver
```


## Installation - docker with nginx and gunicorn

Build the image using docker

```bash
$ docker build -t pkpdapp .
```

Run the server

```bash
$ docker run -it -p 8020:8020 -e DJANGO_SUPERUSER_USERNAME=admin -e 
DJANGO_SUPERUSER_PASSWORD=sekret1 -e DJANGO_SUPERUSER_EMAIL=admin@example.com     
pkpdapp
```


## License
PKPDApp is fully open source. For more information about its license, see [LICENSE.md](LICENSE.md).


