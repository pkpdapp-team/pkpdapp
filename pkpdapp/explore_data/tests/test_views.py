#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase
from django.urls import reverse


class TestIndexView(SimpleTestCase):
    """
    Tests the index view.
    """
    def test_view_url(self):
        response = self.client.get(reverse('explore_data:index'))
        self.assertEquals(response.status_code, 200)

    def test_view_uses_correct_template(self):
        response = self.client.get(reverse('explore_data:index'))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'explore_data/index.html')

    def test_index_contains_correct_html(self):
        response = self.client.get(reverse('explore_data:index'))
        contents = 'Analyse Pharmacokinetics'
        self.assertContains(response, contents)
        contents = 'Analyse Pharmacodynamics'
        self.assertContains(response, contents)
