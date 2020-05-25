from django.urls import path

from . import views

# namespace for template and view calls form other apps
app_name = 'simulate'

# url patterns within the `simulate` app
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
]
