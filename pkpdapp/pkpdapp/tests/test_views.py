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
from pkpdapp.models import (
    Dataset, PharmacodynamicModel,
    Project, BiomarkerType, Biomarker
)
from http import HTTPStatus
from urllib.request import urlretrieve
import pandas as pd
from django.core.files import File


BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/'   # noqa: E501
BASE_URL_MODELS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/'   # noqa: E501


def faux_test_file(url, ending='.csv'):
    tempname, _ = urlretrieve(url)
    file = File(open(tempname, 'rb'))
    file.name = 'test' + ending
    return(file)


def test_file_upload_error(cls, filename, error_message, ending=".csv"):
    file = faux_test_file(BASE_URL_DATASETS + filename, ending)
    response = cls.client.post(
        reverse('dataset-create'),
        data={
            'name': 'updated name',
            'description': 'update description',
            'datetime': '',
            'file': file
        },
        follow=True
    )
    cls.assertEquals(response.status_code, HTTPStatus.OK)
    cls.assertContains(response, error_message)


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
    Tests the dataset views.
    """
    def setUp(self):
        self.test_dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        self.test_dataset2 = Dataset.objects.create(
            name='my_cool_dataset2',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )

    def test_create_form(self):
        response = self.client.get(reverse('dataset-create'))
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_create.html')

        # test incorrect file format
        test_file_upload_error(self,
                               filename='test_data_incorrect.xls',
                               error_message='THIS IS NOT A CSV FILE.',
                               ending='.xls')

        # incorrect cols
        base = 'time_data_incorrect'
        for i in range(5):
            if i == 0:
                filename_t = base
            else:
                filename_t = base + str(i)
            test_file_upload_error(self,
                                   filename=filename_t + '.csv',
                                   error_message='FILE DOES NOT CONTAIN')
        test_file_upload_error(self,
                               filename='time_data_incorrect5.csv',
                               error_message='THIS FILE HAS TOO MANY COLUMNS')

        # test works correctly when file of right format
        num_datasets = len(Dataset.objects.all())
        file = faux_test_file(BASE_URL_DATASETS + 'test_data.csv')
        response = self.client.post(
            reverse('dataset-create'),
            data={
                'name': 'updated name',
                'description': 'update description',
                'datetime': '',
                'administration_type': 'T1',
                'file': file
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertEquals(
            response.redirect_chain[0][0],
            reverse('dataset-biomarkers')
        )
        # check new dataset added
        num_datasets1 = len(Dataset.objects.all())
        self.assertEquals(num_datasets1 - num_datasets, 1)

    def test_biomarkerunit_form(self):
        num_biomarker_type = len(BiomarkerType.objects.all())
        num_biomarker = len(Biomarker.objects.all())
        data = pd.read_csv(BASE_URL_DATASETS + 'test_data.csv')
        bts_unique = data["biomarker type"].unique().tolist()
        session = self.client.session
        session['bts_unique'] = bts_unique
        session['data_raw'] = data.to_json()
        session.save()

        response = self.client.get(reverse('dataset-biomarkers'))
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_create.html')

        response = self.client.post(
            reverse('dataset-biomarkers'),
            data={'form-TOTAL_FORMS': '2',
                  'form-INITIAL_FORMS': '0',
                  'form-0-unit': 'cm3',
                  'form-0-description': 'update description',
                  'form-1-unit': 'g',
                  'form-1-description': 'update description1'
                  },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_create.html')
        self.assertContains(response, 'Uploaded dataset')

        # check biomarker types have been saved
        num_biomarker_type1 = len(BiomarkerType.objects.all())
        self.assertEquals(num_biomarker_type1 - num_biomarker_type, 2)

        # check biomarkers have been saved
        num_biomarker1 = len(Biomarker.objects.all())
        self.assertEquals(num_biomarker1 - num_biomarker, len(data))

    def test_list_view(self):
        response = self.client.get(reverse('dataset-list'))
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_list.html')
        self.assertContains(response, self.test_dataset.name)
        self.assertContains(response, self.test_dataset2.name)

    def test_update_form(self):
        response = self.client.get(
            reverse('dataset-update', args=[self.test_dataset.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_form.html')
        self.assertContains(response, self.test_dataset.name)

        response = self.client.post(
            reverse('dataset-update', args=[self.test_dataset.id]),
            data={
                'name': 'updated name',
                'description': 'update description',
            },
            follow=True
        )
        self.assertEquals(
            response.redirect_chain[0][0],
            reverse('dataset-detail', args=[self.test_dataset.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        new_dataset = Dataset.objects.get(id=self.test_dataset.id)
        self.assertEquals(new_dataset.name, 'updated name')

    def test_add_form(self):
        response = self.client.get(
            reverse('dataset-add')
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_form.html')

        response = self.client.post(
            reverse('dataset-add'),
            data={
                'name': 'add name',
                'description': 'add description',
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        new_dataset = Dataset.objects.get(name='add name')

        self.assertRedirects(
            response,
            reverse('dataset-detail', args=[new_dataset.id])
        )

    def test_delete_form(self):
        response = self.client.get(
            reverse('dataset-delete', args=[self.test_dataset2.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'dataset_confirm_delete.html')
        Dataset.objects.get(id=self.test_dataset2.id)

        response = self.client.post(
            reverse('dataset-delete', args=[self.test_dataset2.id]),
            follow=True
        )
        self.assertRedirects(response, reverse('dataset-list'))
        with self.assertRaises(Dataset.DoesNotExist):
            Dataset.objects.get(id=self.test_dataset2.id)

    def test_view_uses_correct_template(self):
        response = self.client.get(
            reverse('dataset-detail', args=[self.test_dataset.id])
        )
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'dataset_detail.html')

    def test_index_contains_correct_html(self):
        response = self.client.get(
            reverse('dataset-detail', args=[self.test_dataset.id])
        )
        self.assertContains(response, self.test_dataset.name)
        self.assertContains(response, self.test_dataset.description)


class TestPharmodynamicModelView(TestCase):
    """
    Tests the pd_model view.
    """
    def setUp(self):
        self.test_model = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        self.test_model2 = PharmacodynamicModel.objects.create(
            name='my_cool_model2',
            description='description for my cool model',
        )
        self.test_project = Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
        )
        self.credentials = {
            'username': 'testuser',
            'password': 'secret',
            'email': 'test@test.com',
        }
        self.test_user = User.objects.create_user(**self.credentials)
        self.client.post(
            reverse('login'), self.credentials, follow=True)

    def test_list_view(self):
        response = self.client.get(reverse('pd_model-list'))
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'pd_model_list.html')
        self.assertContains(response, self.test_model.name)
        self.assertContains(response, self.test_model2.name)

    def test_update_form(self):
        response = self.client.get(
            reverse('pd_model-update', args=[self.test_model.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'pd_model_form.html')
        self.assertContains(response, self.test_model.name)

        response = self.client.post(
            reverse('pd_model-update', args=[self.test_model.id]),
            data={
                'name': 'updated name',
                'description': 'update description',
                'model_type': 'PK',
                'sbml': 'test',
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertEquals(
            response.redirect_chain[0][0],
            reverse('pd_model-detail', args=[self.test_model.id])
        )
        new_model = PharmacodynamicModel.objects.get(id=self.test_model.id)
        self.assertEquals(new_model.name, 'updated name')

    def test_add_form(self):
        response = self.client.get(
            reverse('pd_model-add')
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'pd_model_form.html')

        file = faux_test_file(BASE_URL_MODELS + 'tgi_Koch_2009.xml',
                              ending='xml')
        response = self.client.post(
            reverse('pd_model-add'),
            data={
                'name': 'add name',
                'description': 'add description',
                'model_type': 'PK',
                'sbml': file,
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        new_model = PharmacodynamicModel.objects.get(name='add name')

        self.assertEquals(
            response.redirect_chain[0][0],
            reverse('pd_model-detail', args=[new_model.id])
        )
        self.assertEquals(new_model.name, 'add name')

        file = faux_test_file(BASE_URL_DATASETS + 'test_data.csv',
                              ending='csv')
        response = self.client.post(
            reverse('pd_model-add'),
            data={
                'name': 'add name2',
                'description': 'add description',
                'model_type': 'PK',
                'sbml': file,
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertContains(response, 'does not seem to be valid XML')
        with self.assertRaises(PharmacodynamicModel.DoesNotExist):
            PharmacodynamicModel.objects.get(name='add name2')

    def test_add_to_project_form(self):
        response = self.client.get(
            reverse('pd_model-add-to-project',
                    args=[self.test_project.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'pd_model_form.html')

        file = faux_test_file(BASE_URL_MODELS + 'tgi_Koch_2009.xml',
                              ending='xml')
        response = self.client.post(
            reverse(
                'pd_model-add-to-project', args=[self.test_project.id]
            ),
            data={
                'name': 'add name to project',
                'description': 'add description',
                'model_type': 'PK',
                'sbml': file,
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTrue(
            PharmacodynamicModel.objects.filter(
                name='add name to project'
            ).exists()
        )
        self.assertTrue(
            self.test_project.pd_models.filter(
                name='add name to project'
            ).exists()
        )

    def test_delete_form(self):
        response = self.client.get(
            reverse('pd_model-delete', args=[self.test_model2.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'pd_model_confirm_delete.html')
        PharmacodynamicModel.objects.get(id=self.test_model2.id)

        response = self.client.post(
            reverse('pd_model-delete', args=[self.test_model2.id]),
            follow=True
        )
        self.assertRedirects(response, reverse('pd_model-list'))
        with self.assertRaises(PharmacodynamicModel.DoesNotExist):
            PharmacodynamicModel.objects.get(id=self.test_model2.id)

    def test_view_uses_correct_template(self):
        response = self.client.get(
            reverse('pd_model-detail', args=[self.test_model.id])
        )
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'pd_model_detail.html')

    def test_index_contains_correct_html(self):
        response = self.client.get(
            reverse('pd_model-detail', args=[self.test_model.id])
        )
        self.assertContains(response, self.test_model.name)
        self.assertContains(response, self.test_model.description)


class TestProjectView(TestCase):
    """
    Tests the project view.
    """
    def setUp(self):
        self.test_model = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        self.test_dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
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
        self.test_project.pd_models.add(self.test_model)
        self.test_project.users.add(self.test_user)
        self.test_user.profile.selected_project = self.test_project
        self.test_user.profile.save(update_fields=["selected_project"])

    def test_list_view(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)
        response = self.client.get(reverse('project-list'))
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'project_list.html')
        self.assertContains(response, self.test_project.name)
        self.assertContains(response, self.test_project2.name)

    def test_update_form(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)
        response = self.client.get(
            reverse('project-update', args=[self.test_project.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'project_form.html')
        self.assertContains(response, self.test_project.name)

        response = self.client.post(
            reverse('project-update', args=[self.test_project.id]),
            data={
                'name': 'updated name',
                'description': 'update description',
                'users': [self.test_user.id],
                'pk_models': [],
                'pd_models': [self.test_model.id],
                'datasets': [self.test_dataset.id]
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        self.assertRedirects(
            response,
            reverse('project-detail', args=[self.test_project.id])
        )
        new_project = Project.objects.get(id=self.test_project.id)
        self.assertEquals(new_project.name, 'updated name')

    def test_add_form(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)

        response = self.client.get(
            reverse('project-add')
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'project_form.html')

        response = self.client.post(
            reverse('project-add'),
            data={
                'name': 'add name',
                'description': 'add description',
                'users': [self.test_user.id]
            },
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        new_project = Project.objects.get(name='add name')

        self.assertRedirects(
            response,
            reverse('project-detail', args=[new_project.id])
        )
        self.assertEquals(new_project.name, 'add name')

    def test_delete_form(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)

        response = self.client.get(
            reverse('project-delete', args=[self.test_project2.id])
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertTemplateUsed(response, 'project_confirm_delete.html')
        Project.objects.get(id=self.test_project2.id)

        response = self.client.post(
            reverse('project-delete', args=[self.test_project2.id]),
            follow=True
        )
        self.assertRedirects(response, reverse('project-list'))
        with self.assertRaises(Project.DoesNotExist):
            Project.objects.get(id=self.test_project2.id)

    def test_view_not_logged_in(self):
        response = self.client.get(
            '/project/{}/'.format(self.test_project.id)
        )
        self.assertEquals(response.status_code, HTTPStatus.FOUND)
        response = self.client.get('/project/')
        self.assertEquals(response.status_code, HTTPStatus.FOUND)

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
