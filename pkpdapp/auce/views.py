#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic



class SimulationView(generic.base.TemplateView):
    template_name = 'auce/explore.html'
