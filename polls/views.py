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

from django.http import HttpResponse  # , Http404
# from django.template import loader  # this is the lengthy version
from django.shortcuts import get_object_or_404, render

from .models import Question


# def index(request):
#     latest_question_list = Question.objects.order_by('-pub_date')[:5]
#     template = loader.get_template('polls/index.html')
#     context = {
#         'latest_question_list': latest_question_list,
#     }
#     return HttpResponse(template.render(context, request))

def index(request):
    latest_question_list = Question.objects.order_by('-pub_date')[:5]
    context = {'latest_question_list': latest_question_list}
    return render(request, 'polls/index.html', context)


# def detail(request, question_id):
#     try:
#         question = Question.objects.get(pk=question_id)
#     except Question.DoesNotExist:
#         raise Http404("Question does not exist")
#     return render(request, 'polls/detail.html', {'question': question})

def detail(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    return render(request, 'polls/detail.html', {'question': question})


def results(request, question_id):
    response = "You're looking at the results of question %s."
    return HttpResponse(response % question_id)


def vote(request, question_id):
    return HttpResponse("You're voting on question %s." % question_id)
