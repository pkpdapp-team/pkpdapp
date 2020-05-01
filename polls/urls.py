#
# Links views to urls, so that they can be called.
#

from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
]
