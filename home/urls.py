#
# Links views to urls, so that they can be called.
#

from django.urls import path

from . import views

app_name = 'home'

# Generalised version
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('generic/', views.GenericView.as_view(), name='generic'),
    path('old/', views.OldIndexView.as_view(), name='old_index'),
    path('<int:pk>/', views.DetailView.as_view(), name='detail'),
    path('<int:pk>/results/', views.ResultsView.as_view(), name='results'),
    path('<int:question_id>/vote/', views.vote, name='vote'),
]

# more explicit version
# urlpatterns = [
#     # ex: /polls/
#     path('', views.index, name='index'),
#     # ex: /polls/5/
#     path('<int:question_id>/', views.detail, name='detail'),
#     # ex: /polls/5/results/
#     path('<int:question_id>/results/', views.results, name='results'),
#     # ex: /polls/5/vote/
#     path('<int:question_id>/vote/', views.vote, name='vote'),
# ]
