#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic


class IndexView(generic.base.TemplateView):
    """
    This class organises the simulate workflow of the PKPDApp.
    """
    template_name = 'simulate/index.html'

    def get_context_data(self):
        """
        Returns the specifications of the web page.
        """
        context = {}
        return context
