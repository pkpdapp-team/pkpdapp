#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase
from django.urls import reverse


class TestIndexView(SimpleTestCase):
    """
    Tests the index view.
    """
    def test_index_status_code(self):
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)

    def test_view_url_by_name(self):
        response = self.client.get(reverse('index'))
        self.assertEquals(response.status_code, 200)

    def test_view_uses_correct_template(self):
        response = self.client.get(reverse('index'))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')

    def test_index_contains_correct_html(self):
        response = self.client.get('/')
        contents = (
            'This is the PKPDApp, a web-based application to model the '
            'distribution and effects of drugs.')
        self.assertContains(response, contents[0])
        contents = (
            'The PKPDApp is an open-source project that provides tools '
            'for modelling drug distribution and effects.')
        self.assertContains(response, contents[0])
        contents = '<h2>Explore Data</h2>'
        self.assertContains(response, contents)
        contents = '<h2>Simulate</h2>'
        self.assertContains(response, contents)
        contents = '<h2>Infer Model</h2>'
        self.assertContains(response, contents)

    def test_index_does_not_contain_incorrect_html(self):
        response = self.client.get('/')
        self.assertNotContains(
            response, 'Hi there! I should not be on the page.')


class TestGenericView(SimpleTestCase):
    """
    Tests the generic view.
    """
    def test_index_status_code(self):
        response = self.client.get('/generic/')
        self.assertEquals(response.status_code, 200)

    def test_view_url_by_name(self):
        response = self.client.get(reverse('generic'))
        self.assertEquals(response.status_code, 200)

    def test_view_uses_correct_template(self):
        response = self.client.get(reverse('generic'))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'generic.html')

    def test_index_contains_correct_html(self):
        response = self.client.get('/generic/')
        contents = '<h1>Generic Page - This Page is under Development</h1>'
        self.assertContains(response, contents)

    def test_index_does_not_contain_incorrect_html(self):
        response = self.client.get('/')
        self.assertNotContains(
            response, 'Hi there! I should not be on the page.')
