#
# This file contains the core views of the app.
#

from django.views import generic


class IndexView(generic.base.TemplateView):
    template_name = 'index.html'

    def get_context_data(self):
        """
        Returns the specifications of the web page.
        """
        context = {}
        return context


class GenericView(generic.base.TemplateView):
    template_name = 'generic.html'

    def get_context_data(self):
        """
        Returns the specifications of the web page.
        """
        context = {}
        return context
