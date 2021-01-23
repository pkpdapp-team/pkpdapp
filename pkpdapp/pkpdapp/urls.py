#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
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
    path('admin/doc/', include('django.contrib.admindocs.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('dataset/<int:pk>/',
         views.DatasetDetailView.as_view(), name='dataset-detail'),
    path('explore_data/', include('explore_data.urls')),
    path('pkpd_model/<int:pk>/',
         views.PkpdModelDetailView.as_view(), name='pkpd_model-detail'),
    path('project/<int:pk>/',
         views.ProjectDetailView.as_view(), name='project-detail'),
    path('project/',
         views.ProjectDetailView.as_view(), name='selected-project-detail'),
    path('simulate/', include('simulate.urls')),

    path('generic/', views.GenericView.as_view(), name='generic'),
    path('django_plotly_dash/', include('django_plotly_dash.urls')),

]
