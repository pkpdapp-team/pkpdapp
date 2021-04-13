#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.views.generic import FormView

from pkpdapp.forms import IndexForm


class IndexView(FormView):
    template_name = 'index.html'
    form_class = IndexForm
    success_url = '/'

    def form_valid(self, form):
        form.change_selected_project()
        return super().form_valid(form)

    def get_form_kwargs(self):
        if self.request.user.is_authenticated:
            return {'user': self.request.user}
        else:
            return {}
