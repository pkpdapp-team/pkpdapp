#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.views.generic import TemplateView


class GenericView(TemplateView):
    template_name = 'generic.html'
