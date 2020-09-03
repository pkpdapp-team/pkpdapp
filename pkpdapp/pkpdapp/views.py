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

from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = 'index.html'


class GenericView(TemplateView):
    template_name = 'generic.html'
