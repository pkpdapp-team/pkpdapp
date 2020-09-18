#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase
from django.urls import reverse, resolve

from explore_data.views import IndexView


class TestUrls(SimpleTestCase):
    """
    This class tests the urls of the PKPDApp.
    """

    def test_index(self):
        url = reverse('explore_data:index')
        self.assertEqual(resolve(url).func.view_class, IndexView)
