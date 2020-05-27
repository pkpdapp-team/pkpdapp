from django.urls import path

from . import views
from . import demo_model_visualisation_app, demo_simulation_dash_board

# namespace for template and view calls form other apps
app_name = 'simulate'

# url patterns within the `simulate` app
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
]
