#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import Project


class PdModelTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_pd_project_filter(self):
        response = self.client.get("/api/pharmacodynamic/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertGreater(len(response_data), 0)

    def test_pd_serializer(self):
        response = self.client.get("/api/pharmacodynamic/1/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_edit_read_only_project(self):
        user = User.objects.get(username='demo2')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        project = Project.objects.get(name='demo')
        response = self.client.post(
            "/api/pharmacodynamic/",
            data={
                'name': 'test',
                'project': project.id
            }
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

        response = self.client.put(
            "/api/pharmacodynamic/1/",
            data={
                'name': 'test',
                'project': project.id
            }
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )
