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

from django.http import HttpResponse

from .models import Question


def index(request):
    latest_question_list = Question.objects.order_by('-pub_date')[:5]
    output = ', '.join([q.question_text for q in latest_question_list])
    return HttpResponse(output)


def detail(request, question_id):
    return HttpResponse("You're looking at question %s." % question_id)


def results(request, question_id):
    response = "You're looking at the results of question %s."
    return HttpResponse(response % question_id)


def vote(request, question_id):
    return HttpResponse("You're voting on question %s." % question_id)
