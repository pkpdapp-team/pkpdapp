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
from . import api
from rest_framework import routers
from rest_framework.urlpatterns import format_suffix_patterns

router = routers.DefaultRouter()
router.register('dataset', api.DatasetView, basename='dataset')
router.register('users', api.UserView, basename='user')
router.register('project', api.ProjectView, basename='project')
router.register('dose', api.DoseView, basename='dose')
router.register('protocol', api.ProtocolView, basename='protocol')
router.register(
    'pharmacokinetic', api.PharmacokineticView,
    basename='pharmacokinetic'
)
router.register(
    'pharmacodynamic', api.PharmacodynamicView,
    basename='pharmacodynamic'
)
router.register(
    'dosed_pharmacokinetic', api.DosedPharmacokineticView,
    basename='dosed_pharmacodynamic'
)
router.register(
    'pkpd_model', api.PkpdView,
    basename='pkpd_model'
)

# TODO: Move django_plotly_dash to the app that is actually using it!
urlpatterns = [
    path('admin/doc/', include('django.contrib.admindocs.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('api/', include(router.urls), name='api'),
    path('api/dosed_pharmacokinetic/<int:pk>/simulate',
         api.SimulatePkView.as_view()),
    path('api/pharmacodynamic/<int:pk>/simulate',
         api.SimulatePdView.as_view()),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.authtoken')),
    path('api-auth/', include('rest_framework.urls'))
]

urlpatterns = format_suffix_patterns(urlpatterns)
