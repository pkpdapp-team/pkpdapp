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

router = routers.DefaultRouter()
router.register('dataset', api.DatasetView, basename='dataset')
router.register('user', api.UserView, basename='user')
router.register('subject', api.SubjectView, basename='subject')
router.register('project', api.ProjectView, basename='project')
router.register('project_access', api.ProjectAccessView,
                basename='project_access')
router.register('dose', api.DoseView, basename='dose')
router.register('unit', api.UnitView, basename='unit')
router.register('variable', api.VariableView, basename='variable')
router.register('protocol', api.ProtocolView, basename='protocol')
router.register('biomarker_type', api.BiomarkerTypeView,
                basename='biomarker_type')
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
    'inference', api.InferenceView,
    basename='inference'
)
router.register(
    'algorithm', api.AlgorithmView,
    basename='algorithm'
)
router.register(
    'inference_chain', api.InferenceChainView,
    basename='inference_chain'
)

urlpatterns = [
    path('admin/doc/', include('django.contrib.admindocs.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('api/', include(router.urls), name='api'),
    path('api/nca/', api.NcaView.as_view(), name='nca'),
    path('api/auce/', api.AuceView.as_view(), name='auce'),
    path('api/dosed_pharmacokinetic/<int:pk>/simulate',
         api.SimulatePkView.as_view(), name='simulate-dosed-pharmacokinetic'),
    path(
        'api/inference/wizard',
        api.InferenceWizardView.as_view(),
        name='inference-wizard'
    ),
    path(
        'api/inference/<int:pk>/stop',
        api.StopInferenceView.as_view(),
        name='stop-inference'
    ),
    path('api/pharmacodynamic/<int:pk>/simulate',
         api.SimulatePdView.as_view(), name='simulate-pharmacodynamic'),
    path('api/csrf/', api.get_csrf, name='auth-csrf'),
    path('api/login/', api.login_view, name='auth-login'),
    path('api/logout/', api.logout_view, name='auth-logout'),
    path('api/session/', api.SessionView.as_view(), name='auth-session'),
    path('api/whoami/', api.WhoAmIView.as_view(), name='auth-whoami'),
    path('api-auth/', include('rest_framework.urls'))
]
