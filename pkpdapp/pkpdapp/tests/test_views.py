#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase, TestCase
from django.core import mail
from django.urls import reverse
from django.contrib.auth.models import User
import re


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


class TestRegistrationViews(TestCase):
    """
    Tests the login/logout templates and functionality
    """
    def setUp(self):
        self.credentials = {
            'username': 'testuser',
            'password': 'secret',
            'email': 'test@test.com',
        }
        self.user = User.objects.create_user(**self.credentials)

    def test_login_view(self):
        endpoint = reverse('login')
        response = self.client.get(endpoint)
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/login.html')

    def test_logged_out_view(self):
        endpoint = reverse('logout')
        response = self.client.get(endpoint)
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/logged_out.html')

    def test_password_reset_done(self):
        endpoint = reverse('password_reset_done')
        response = self.client.get(endpoint)
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response,
                                'registration/password_reset_done.html')

    def test_password_reset(self):
        endpoint = reverse('password_reset')
        response = self.client.get(endpoint)
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response,
                                'registration/password_reset_form.html')

    def test_password_done(self):
        endpoint = reverse('password_reset_done')
        response = self.client.get(endpoint)
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response,
                                'registration/password_reset_done.html')

    def test_login(self):
        endpoint = reverse('login')
        response = self.client.post(endpoint, self.credentials, follow=True)
        self.assertTrue(response.context['user'].is_active)

        # check that the home page displays the username
        response = self.client.get('/')
        self.assertContains(response, self.credentials['username'])

    def test_password_reset_workflow(self):
        # post to the password reset form using the user email
        response = self.client.post(
            reverse('password_reset'),
            {'email': self.credentials['email']},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response,
                                'registration/password_reset_done.html')

        # check the email
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            'Password reset on',
            mail.outbox[0].subject
        )
        self.assertIn(
            self.credentials['email'],
            mail.outbox[0].body
        )

        # get the url from the response
        url = re.search(
            "(?P<url>https?://[^\s]+)",
            mail.outbox[0].body
        ).group("url")

        # use this to get the get the password reset confirm form
        response = self.client.get(url, follow=True)

        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response,
                                'registration/password_reset_confirm.html')

        # check we can set a new password
        response = self.client.post(
            url,
            {'new_password1': 'pass', 'new_password2': 'pass'},
        )
        self.assertEquals(response.status_code, 302)
