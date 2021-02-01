#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import SimpleTestCase, TestCase
from django.core import mail
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
import re
from pkpdapp.models import Dataset, PkpdModel, Project


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


class TestDatasetView(TestCase):
    """
    Tests the dataset view.
    """
    def setUp(self):
        self.test_dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
            administration_type='T1',
        )
        self.test_dataset2 = Dataset.objects.create(
            name='my_cool_dataset2',
            datetime=timezone.now(),
            description='description for my cool dataset',
            administration_type='T1',
        )

    def test_view_uses_correct_template(self):
        response = self.client.get('/dataset/{}/'.format(self.test_dataset.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'dataset_detail.html')

    def test_update_form(self):
        response = self.client.get('/dataset/{}/update/'.format(self.test_dataset.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'dataset_form.html')
        self.assertContains(response, self.test_dataset.name)

    def test_add_form(self):
        response = self.client.get('/dataset/add/'.format(self.test_dataset.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'dataset_form.html')
        self.assertContains(response, 'Update Dataset')

    def test_delete_form(self):
        response = self.client.get('/pkpd_model/{}/delete'.format(self.test_dataset2.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'dataset_confirm_delete.html')
        Dataset.objects.get(id=self.test_dataset2.id)

    def test_index_contains_correct_html(self):
        response = self.client.get('/dataset/{}/'.format(self.test_dataset.id))
        self.assertContains(response, self.test_dataset.name)
        self.assertContains(response, self.test_dataset.description)


class TestPkpdModelView(TestCase):
    """
    Tests the pkpd_model view.
    """
    def setUp(self):
        self.test_model = PkpdModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        self.test_model2 = PkpdModel.objects.create(
            name='my_cool_model2',
            description='description for my cool model',
        )

    def test_update_form(self):
        response = self.client.get('/pkpd_model/{}/update/'.format(self.test_model.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'pkpd_model_form.html')
        self.assertContains(response, self.test_model.name)

    def test_add_form(self):
        response = self.client.get('/pkpd_model/add/'.format(self.test_model.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'pkpd_model_form.html')
        self.assertContains(response, 'Update Model')

    def test_delete_form(self):
        response = self.client.get('/pkpd_model/{}/delete'.format(self.test_model2.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'pkpd_model_confirm_delete.html')
        PkpdModel.objects.get(id=self.test_model2.id)

    def test_view_uses_correct_template(self):
        response = self.client.get(
            '/pkpd_model/{}/'.format(self.test_model.id)
        )
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'pkpd_model_detail.html')

    def test_index_contains_correct_html(self):
        response = self.client.get(
            '/pkpd_model/{}/'.format(self.test_model.id)
        )
        self.assertContains(response, self.test_model.name)
        self.assertContains(response, self.test_model.description)


class TestProjectView(TestCase):
    """
    Tests the project view.
    """
    def setUp(self):
        self.test_model = PkpdModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        self.test_dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
            administration_type='T1',
        )
        self.credentials = {
            'username': 'testuser',
            'password': 'secret',
            'email': 'test@test.com',
        }
        self.test_user = User.objects.create_user(**self.credentials)

        self.test_project = Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
        )
        self.test_project2 = Project.objects.create(
            name='my_cool_project2',
            description='description for my cool project2',
        )
        self.test_project.datasets.add(self.test_dataset)
        self.test_project.pkpd_models.add(self.test_model)
        self.test_project.users.add(self.test_user)
        self.test_user.profile.selected_project = self.test_project
        self.test_user.profile.save(update_fields=["selected_project"])

    def test_update_form(self):
        response = self.client.get('/project/{}/update/'.format(self.test_project.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'project_form.html')
        self.assertContains(response, self.test_project.name)

    def test_add_form(self):
        response = self.client.get('/project/add/'.format(self.test_project.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'project_form.html')
        self.assertContains(response, 'Update Project')

    def test_delete_form(self):
        response = self.client.get('/project/{}/delete'.format(self.test_project2.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'project_confirm_delete.html')
        Project.objects.get(id=self.test_project2.id)

    def test_view_not_logged_in(self):
        response = self.client.get('/project/{}/'.format(self.test_project.id))
        self.assertEquals(response.status_code, 404)
        response = self.client.get('/project/')
        self.assertEquals(response.status_code, 404)

    def test_view_uses_correct_template(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)
        response = self.client.get('/project/{}/'.format(self.test_project.id))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'project_detail.html')
        response = self.client.get('/project/')
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'project_detail.html')

    def test_index_contains_correct_html(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)
        response = self.client.get('/project/{}/'.format(self.test_project.id))
        self.assertContains(response, self.test_project.name)
        self.assertContains(response, self.test_project.description)
        self.assertContains(response, self.test_model.name)
        self.assertContains(response, self.test_dataset.name)
        self.assertContains(response, self.test_user.username)
        response = self.client.get('/project/')
        self.assertContains(response, self.test_project.name)


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
        url = re.findall(
            r"(?P<url>https?://[^\s]+)",
            mail.outbox[0].body
        )

        # url we want is the second one
        url = url[1]

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
