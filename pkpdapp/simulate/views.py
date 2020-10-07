#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic


class BuildModelView(generic.base.TemplateView):
    """
    This view defines the interface to build a model for simulation.
    """
    template_name = 'simulate/build_model.html'


class SimulationView(generic.base.TemplateView):
    """
    This class defines the interface for model simulation.
    """
    template_name = 'simulate/simulation.html'
