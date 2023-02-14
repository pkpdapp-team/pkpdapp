#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from urllib.request import urlretrieve

from django.contrib.auth.models import User
from django.core.files import File
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/'   # noqa: E501
BASE_URL_MODELS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/'   # noqa: E501


def faux_test_file(url, ending='.csv'):
    tempname, _ = urlretrieve(url)
    file = File(open(tempname, 'rb'))
    file.name = 'test' + ending
    return file


class DatasetTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_dataset_creation(self):
        data = {"name": "hello", "datatime": "", "description": "bye"}
        response = self.client.post("/api/dataset/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.data
        self.assertEqual(response_data["name"], data["name"])
        self.assertEqual(response_data["description"], data["description"])

        keys = response_data.keys()
        present_keys = ['name', 'datetime', 'description', 'subjects',
                        'biomarker_types']
        for k in present_keys:
            self.assertTrue(k in keys)

    def test_dataset_project_filter(self):
        response = self.client.get("/api/dataset/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertGreater(len(response_data), 0)
