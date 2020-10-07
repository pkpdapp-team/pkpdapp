#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase
from django.urls import reverse, resolve

from pkpdapp.views import IndexView, GenericView


class TestUrls(SimpleTestCase):
    """
    This class tests the urls of the PKPDApp.
    """

    def test_index(self):
        url = reverse('index')
        self.assertEqual(resolve(url).func.view_class, IndexView)

    def test_generic(self):
        url = reverse('generic')
        self.assertEqual(resolve(url).func.view_class, GenericView)
