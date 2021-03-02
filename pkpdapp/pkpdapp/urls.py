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
         views.DatasetDetailView.as_view(),
         name='dataset-detail'),
    path('dataset/list/', views.DatasetListView.as_view(),
         name='dataset-list'),
    path('dataset/add/', views.DatasetCreate.as_view(), name='dataset-add'),
    path('dataset/create/', views.dataset.create, name='dataset-create'),
    path('dataset/biomarkers/',
         views.dataset.select_biomarkers,
         name='dataset-biomarkers'),
    path('dataset/<int:pk>/update/',
         views.DatasetUpdate.as_view(),
         name='dataset-update'),
    path('dataset/<int:pk>/',
         views.DatasetDetailView.as_view(),
         name='dataset-detail'),
    path('dataset/<int:pk>/delete/',
         views.DatasetDelete.as_view(),
         name='dataset-delete'),
    path('explore_data/', include('explore_data.urls')),
    path('pd_model/list/',
         views.PharmacodynamicModelListView.as_view(),
         name='pd_model-list'),
    path('pd_model/add/',
         views.PharmacodynamicModelCreate.as_view(),
         name='pd_model-add'),
    path('pd_model/add/project/<int:project>/',
         views.PharmacodynamicModelCreate.as_view(),
         name='pd_model-add-to-project'),
    path('pd_model/<int:pk>/update/',
         views.PharmacodynamicModelUpdate.as_view(),
         name='pd_model-update'),
    path('pd_model/<int:pk>/',
         views.PharmacodynamicModelDetailView.as_view(),
         name='pd_model-detail'),
    path('pd_model/<int:pk>/delete/',
         views.PharmacodynamicModelDeleteView.as_view(),
         name='pd_model-delete'),
    path('dosed_pk_model/add/project/<int:project>/',
         views.DosedPharmacokineticModelCreate.as_view(),
         name='dosed_pk_model-add-to-project'),
    path('dosed_pk_model/<int:pk>/update',
         views.DosedPharmacokineticModelUpdate.as_view(),
         name='dosed_pk_model-update'),
    path('dosed_pk_model/<int:pk>',
         views.DosedPharmacokineticModelDetail.as_view(),
         name='dosed_pk_model-detail'),
    path('pk_model/<int:pk>',
         views.PharmacokineticModelDetail.as_view(),
         name='pk_model-detail'),
    path('project/',
         views.ProjectDetailView.as_view(),
         name='selected-project-detail'),
    path('project/list/', views.ProjectListView.as_view(),
         name='project-list'),
    path('project/add/', views.ProjectCreate.as_view(), name='project-add'),
    path('project/<int:pk>/update/',
         views.ProjectUpdate.as_view(),
         name='project-update'),
    path('project/<int:pk>/',
         views.ProjectDetailView.as_view(),
         name='project-detail'),
    path('project/<int:pk>/delete/',
         views.ProjectDelete.as_view(),
         name='project-delete'),
    path('simulate/', include('simulate.urls')),
    path('generic/', views.GenericView.as_view(), name='generic'),
    path('django_plotly_dash/', include('django_plotly_dash.urls')),
]
