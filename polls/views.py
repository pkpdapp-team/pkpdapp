#
# Creates views that can be called by mapping them to urls.
#

from django.http import HttpResponse


def index(request):
    """Defines a particular view, that can be called by mapping it to a url."""
    return HttpResponse("Hello, world. You're at the polls index.")
