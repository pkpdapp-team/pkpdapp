#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
Views of the pkpdapp project.

For more information please see
https://docs.djangoproject.com/en/3.0/topics/http/views/.
"""

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
