#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import django
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from pkpdapp.models import Project, Compound
django.setup()


class BiomarkerTypeTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_bt_project_filter(self):
        compound = Compound.objects.create(name='demo')
        project = Project.objects.create(name='demo', compound=compound)
        response = self.client.get(
            "/api/biomarker_type/?project_id={}".format(project.pk)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) == 0)
