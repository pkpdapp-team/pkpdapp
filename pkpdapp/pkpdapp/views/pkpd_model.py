#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import DetailView
from pkpdapp.models import PkpdModel


class PkpdModelDetailView(DetailView):
    model = PkpdModel
    template_name = 'pkpd_model_detail.html'
