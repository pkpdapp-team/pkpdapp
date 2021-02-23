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
    Dataset, Project, Biomarker, BiomarkerType, PkpdModel
)
from http import HTTPStatus
import codecs
import urllib.request


class TestSimulationView(TestCase):
    """
    Tests the index view.
    """

    def setUp(self):
        sbml_url = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009.xml'  # noqa: E501
        with urllib.request.urlopen(sbml_url) as f:
            # parse as csv file
            sbml_string = codecs.decode(f.read(), 'utf-8')
            self.test_model = PkpdModel.objects.create(
                name='test',
                description='test',
                model_type='PK',
                sbml=sbml_string
            )

        self.test_dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
            administration_type='T1',
        )
        self.test_biomarker_type = BiomarkerType.objects.create(
            name='my type',
            dataset=self.test_dataset,
        )
        self.test_biomarker = Biomarker.objects.create(
            time=0.0,
            value=1.0,
            subject_id=1,
            biomarker_type=self.test_biomarker_type
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
        self.test_project.datasets.add(self.test_dataset)
        self.test_project.pkpd_models.add(self.test_model)
        self.test_project.users.add(self.test_user)
        self.test_user.profile.selected_project = self.test_project
        self.test_user.profile.save(update_fields=["selected_project"])

    def test_view_url_by_name(self):
        response = self.client.post(
            reverse('login'), self.credentials, follow=True)

        response = self.client.get(
            reverse('simulate:simulation'),
            follow=True
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
