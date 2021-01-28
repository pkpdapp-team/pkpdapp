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
from django.conf import settings
from django.conf.urls.static import static

from . import views


# TODO: Move django_plotly_dash to the app that is actually using it!
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('admin/doc/', include('django.contrib.admindocs.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),

    path('dataset/<int:pk>/',
         views.DatasetDetailView.as_view(), name='dataset-detail'),

    path('dataset/add/', views.DatasetCreate.as_view(), name='dataset-add'),
    path('dataset/create/', views.dataset.create, name='dataset-create'),
    path(
        'dataset/<int:pk>/update/',
        views.DatasetUpdate.as_view(),
        name='dataset-update'
    ),
    path('dataset/<int:pk>/',
         views.DatasetDetailView.as_view(), name='dataset-detail'),
    path(
        'dataset/<int:pk>/delete/',
        views.DatasetDelete.as_view(),
        name='dataset-delete'
    ),

    path('explore_data/', include('explore_data.urls')),

    path(
        'pkpd_model/add/',
        views.PkpdModelCreate.as_view(),
        name='pkpd_model-add'
    ),
    path(
        'pkpd_model/<int:pk>/update/',
        views.PkpdModelUpdate.as_view(),
        name='pkpd_model-update'
    ),
    path('pkpd_model/<int:pk>/',
         views.PkpdModelDetailView.as_view(), name='pkpd_model-detail'),
    path(
        'pkpd_model/<int:pk>/delete/',
        views.PkpdModelDelete.as_view(),
        name='pkpd_model-delete'
    ),

    path('project/',
         views.ProjectDetailView.as_view(), name='selected-project-detail'),
    path('project/add/', views.ProjectCreate.as_view(), name='project-add'),
    path(
        'project/<int:pk>/update/',
        views.ProjectUpdate.as_view(),
        name='project-update'
    ),
    path('project/<int:pk>/',
         views.ProjectDetailView.as_view(), name='project-detail'),
    path(
        'project/<int:pk>/delete/',
        views.ProjectDelete.as_view(),
        name='project-delete'
    ),

    path('simulate/', include('simulate.urls')),

    path('generic/', views.GenericView.as_view(), name='generic'),
    path('django_plotly_dash/', include('django_plotly_dash.urls')),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
