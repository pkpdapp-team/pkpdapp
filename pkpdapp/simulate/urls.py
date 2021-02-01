#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.urls import path

from . import apps, views  # noqa

# Configure simulate app.
# This also sets up the Dash apps defined in apps.py
app_name = 'simulate'

# Define URL patterns
urlpatterns = [
    path('', views.BuildModelView.as_view(), name='build-model'),
    path('simulation', views.SimulationView.as_view(), name='simulation'),
]
