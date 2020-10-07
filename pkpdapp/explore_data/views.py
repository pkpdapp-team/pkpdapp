#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic


class IndexView(generic.base.TemplateView):
    """
    This view defines the interface to the different data exploration
    workflows.
    """
    template_name = 'explore_data/index.html'
