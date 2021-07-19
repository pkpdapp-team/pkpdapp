#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from urllib.request import urlretrieve
from django.core.files import File
from django.urls import reverse
from http import HTTPStatus
from django.utils import timezone
from pkpdapp.models import Dataset

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/'   # noqa: E501
BASE_URL_MODELS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/'   # noqa: E501


def faux_test_file(url, ending='.csv'):
    tempname, _ = urlretrieve(url)
    file = File(open(tempname, 'rb'))
    file.name = 'test' + ending
    return(file)


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
                        'biomarker_types', 'protocols']
        for k in present_keys:
            self.assertTrue(k in keys)

    def test_dataset_project_filter(self):
        response = self.client.get("/api/dataset/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertGreater(len(response_data), 0)

    def _assert_file_upload_error(
            self, pk, filename, error_message, ending=".csv"
    ):
        file = faux_test_file(BASE_URL_DATASETS + filename, ending)
        response = self.client.put(
            '/api/dataset/{}/csv/'.format(pk),
            data={
                'csv': file
            },
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        self.assertContains(response, error_message)

    def test_create_dataset_from_csv(self):
        dataset = Dataset.objects.create(
            name='dataset_for_csv',
            datetime=timezone.now(),
        )

        # test incorrect file format
        self._assert_file_upload_error(
            dataset.pk,
            filename='test_data_incorrect.xls',
            error_message='THIS IS NOT A CSV FILE.',
            ending='.xls'
        )

        # incorrect cols
        base = 'time_data_incorrect'
        for i in range(5):
            if i == 0:
                filename_t = base
            else:
                filename_t = base + str(i)
            self._assert_file_upload_error(
                dataset.pk,
                filename=filename_t + '.csv',
                error_message='FILE DOES NOT CONTAIN'
            )
        self._assert_file_upload_error(
            dataset.pk,
            filename='time_data_incorrect5.csv',
            error_message='THIS FILE HAS TOO MANY COLUMNS'
        )

        # test works correctly when file of right format
        file = faux_test_file(BASE_URL_DATASETS + 'test_data.csv')
        response = self.client.put(
            '/api/dataset/{}/csv'.format(dataset.pk),
            data={
                'csv': file
            },
            follow=True
        )
        self.assertCountEqual(
            dataset.biomarker_types.values_list('name', flat=True),
            ['Tumour volume', 'Body weight']
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        # make sure if we do it again it doesn't add extra biomarker_types
        file = faux_test_file(BASE_URL_DATASETS + 'test_data.csv')
        response = self.client.put(
            '/api/dataset/{}/csv'.format(dataset.pk),
            data={
                'csv': file
            },
            follow=True
        )
        self.assertCountEqual(
            dataset.biomarker_types.values_list('name', flat=True),
            ['Tumour volume', 'Body weight']
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)




