#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import Project


class DosedPkModelTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_pk_project_filter(self):
        response = self.client.get("/api/dosed_pharmacokinetic/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertEqual(len(response_data), 0)

    def test_cannot_create_in_read_only_project(self):
        user = User.objects.get(username='demo2')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        project = Project.objects.get(name='demo')
        response = self.client.post(
            "/api/dosed_pharmacokinetic/",
            data={
                'name': 'test',
                'project': project.id
            }
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

