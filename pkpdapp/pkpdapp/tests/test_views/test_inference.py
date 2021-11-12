#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User


class InferenceTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        # create a new inference in demo project
        response = self.client.post("/api/inference/", {
            'name': 'new', 'project': 1
        })
        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )

    def test_inference_project_filter(self):
        response = self.client.get("/api/inference/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertEqual(len(response_data), 1)
