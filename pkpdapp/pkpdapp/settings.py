#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
Django settings for pkpdapp project.

Generated by 'django-admin startproject' using Django 3.0.5.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/.

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/.
"""

import os
import dj_database_url
import ldap
from django_auth_ldap.config import LDAPSearch

# Set BASE_DIR to two directories up
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

SECRET_KEY = os.environ.get("SECRET_KEY", default='foo')

DEBUG = int(os.environ.get("DEBUG", default=0))

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'pkpdapp.herokuapp.com']

# Application definition - to use any of those you need to run `manage.py
# migrate` first

INSTALLED_APPS = [
    # standard Django apps
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # external apps
    'dpd_static_support',
    'django_extensions',
    'djoser',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',

    # internal apps
    'pkpdapp',
]

use_ldap = os.environ.get('AUTH_LDAP_USE', False)
if use_ldap:
    AUTHENTICATION_BACKENDS = [
        "django_auth_ldap.backend.LDAPBackend",
        "django.contrib.auth.backends.ModelBackend",
    ]
    AUTH_LDAP_SERVER_URI = os.environ.get(
        'AUTH_LDAP_SERVER_URI',
        'ldap://ldap.forumsys.com:389'
    )

    use_direct_bind = os.environ.get('AUTH_LDAP_DIRECT_BIND', True)
    if use_direct_bind:
        AUTH_LDAP_USER_DN_TEMPLATE = os.environ.get(
            'AUTH_LDAP_BIND_DN_TEMPLATE',
            'uid=%(user)s,dc=example,dc=com'
        )
    else:
        AUTH_LDAP_BIND_DN = os.environ.get(
            'AUTH_LDAP_BIND_DN',
            'cn=read-only-admin,dc=example,dc=com'
        )
        AUTH_LDAP_BIND_PASSWORD = os.environ.get(
            'AUTH_LDAP_BIND_PASSWORD',
            'password'
        )
        AUTH_LDAP_USER_SEARCH = LDAPSearch(
            os.environ.get(
                'AUTH_LDAP_SEARCH_BASE',
                'ou=mathematicians,dc=example,dc=com'
            ),
            ldap.SCOPE_SUBTREE, "(uid=%(user)s)"
        )

DJOSER = {
    'PASSWORD_RESET_CONFIRM_URL': 'reset-password/{uid}/{token}',
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'SEND_ACTIVATION_EMAIL': True,
    'SEND_CONFIRMATION_EMAIL': True,
    'PASSWORD_CHANGED_EMAIL_CONFIRMATION': True,
    'SERIALIZERS': {},
    'PERMISSIONS': {
        'activation': ['rest_framework.permissions.AllowAny'],
        'password_reset': ['rest_framework.permissions.AllowAny'],
        'password_reset_confirm': ['rest_framework.permissions.AllowAny'],
        'set_password': ['djoser.permissions.CurrentUserOrAdmin'],
        'username_reset': ['rest_framework.permissions.AllowAny'],
        'username_reset_confirm': ['rest_framework.permissions.AllowAny'],
        'set_username': ['djoser.permissions.CurrentUserOrAdmin'],
        'user_create': ['rest_framework.permissions.AllowAny'],
        'user_delete': ['djoser.permissions.CurrentUserOrAdmin'],
        'user': ['djoser.permissions.CurrentUserOrAdmin'],
        'user_list': ['djoser.permissions.CurrentUserOrAdmin'],
        'token_create': ['rest_framework.permissions.AllowAny'],
        'token_destroy': ['rest_framework.permissions.IsAuthenticated'],
    },
}


# django rest framework library
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}


CRISPY_TEMPLATE_PACK = 'bootstrap4'

MARKDOWNIFY_MARKDOWN_EXTENSIONS = [
    'mdx_math',
]

MARKDOWNIFY_WHITELIST_TAGS = [
    'a',
    'abbr',
    'acronym',
    'b',
    'blockquote',
    'em',
    'i',
    'li',
    'ol',
    'p',
    'strong',
    'ul',
    'h',
    'script',
]

MARKDOWNIFY_WHITELIST_ATTRS = [
    'href',
    'src',
    'alt',
    'type',
]

MARKDOWNIFY_WHITELIST_STYLES = [
    'color',
    'font-weight',
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://" + os.environ.get('HOST_NAME', 'bamad.herokuapp.com')
]

CORS_ALLOW_ALL_ORIGINS = True

CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'pkpdapp.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'pkpdapp', 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


X_FRAME_OPTIONS = 'SAMEORIGIN'

# WSGI_APPLICATION = 'bamad.wsgi.application'

# authentication cookie settings
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_HTTPONLY = True

# PROD ONLY
# CSRF_COOKIE_SECURE = True
# SESSION_COOKIE_SECURE = True


WSGI_APPLICATION = 'pkpdapp.wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        'OPTIONS': {
            # 'timeout': 20,
        }
    }
}

DATABASE_URL = os.environ.get('DATABASE_URL')
db_from_env = dj_database_url.config(
    default=DATABASE_URL, conn_max_age=500, ssl_require=False
)
DATABASES['default'].update(db_from_env)


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME':
        'django.contrib.auth.password_validation.'
        'UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
        'MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
        'CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
        'NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Media files (such as data sets and model files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

STATICFILES_DIRS = [
]

# Staticfiles finders for locating dash app assets and related files
STATICFILES_FINDERS = [
    # Django default finders
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

# Forever cachable files and compression support
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Redirect to home URL after login (Default redirects to /accounts/profile/)
LOGIN_REDIRECT_URL = '/'


EMAIL_HOST = os.environ.get("EMAIL_HOST", default=None)
if EMAIL_HOST is None:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_PORT = os.environ.get("EMAIL_PORT", default='foo')
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", default='foo')
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", default='foo')
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL",
                                    default='webmaster@localhost')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
    }
}

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL",
                                    default='webmaster@localhost')

CLOUDAMQP_URL = os.environ.get("CLOUDAMQP_URL", default=None)
if CLOUDAMQP_URL is None:
    CELERY_BROKER_URL = [
        'amqp://',
        'amqp://{}:{}@pkpdapp_rabbitmq:5672'.format(
            os.environ.get("RABBITMQ_DEFAULT_USER",
                           default='guest'),
            os.environ.get("RABBITMQ_DEFAULT_PASS",
                           default='guest')
        )
    ]
else:
    CELERY_BROKER_URL = CLOUDAMQP_URL

CELERY_BROKER_TRANSPORT_OPTIONS = {
    'max_retries': 3,
    'interval_start': 0,
    'interval_step': 0.2,
    'interval_max': 0.5,
}
