#
# Creates views that can be called by mapping them to urls.
#
# Each view is responsible for one of two things: return HttpResponse, or
# raising exception Http404.
#
# All functionality of the of the webpage lies within the views. They can
# can be used to read records from database, use a template system, or use
# any other third party python package.
#
# NOTE: Always separate functions from design by using templates. This makes
# webpage more modular and easier to update and maintain.
#

from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views import generic
from django.utils import timezone

from .models import Choice, Question


class IndexView(generic.base.TemplateView):
    template_name = 'home/index.html'

    def get_context_data(self):
        """
        Returns the specifications of the web page.
        """
        context = {
            'app_name': 'PKPDApp'
        }
        return context


class OldIndexView(generic.ListView):
    template_name = 'home/old_index.html'
    context_object_name = 'latest_question_list'

    def get_queryset(self):
        """
        Return the last five published questions (not including those set to be
        published in the future).
        """
        return Question.objects.filter(
            pub_date__lte=timezone.now()
        ).order_by('-pub_date')[:5]


class DetailView(generic.DetailView):
    model = Question
    template_name = 'home/detail.html'

    def get_queryset(self):
        """
        Excludes any questions that aren't published yet.
        """
        return Question.objects.filter(pub_date__lte=timezone.now())


class ResultsView(generic.DetailView):
    model = Question
    template_name = 'home/results.html'


def vote(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    try:
        selected_choice = question.choice_set.get(pk=request.POST['choice'])
    except (KeyError, Choice.DoesNotExist):
        # Redisplay the question voting form.
        return render(request, 'home/detail.html', {
            'question': question,
            'error_message': "You didn't select a choice.",
        })
    else:
        selected_choice.votes += 1
        selected_choice.save()
        # Always return an HttpResponseRedirect after successfully dealing
        # with POST data. This prevents data from being posted twice if a
        # user hits the Back button.
        return HttpResponseRedirect(reverse('home:results', args=(
            question.id,)))
