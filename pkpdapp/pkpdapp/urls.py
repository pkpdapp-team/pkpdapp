#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
URL config of the pkpdapp project.

The `urlpatterns` list routes URLs to views. For more information please see
https://docs.djangoproject.com/en/3.0/topics/http/urls/.
"""

from django.urls import include, path
from django.contrib import admin

from . import views


# TODO: Move django_plotly_dash to the app that is actually using it!
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('generic/', views.GenericView.as_view(), name='generic'),
    path('simulate/', include('simulate.urls')),
    path('django_plotly_dash/', include('django_plotly_dash.urls')),
]
