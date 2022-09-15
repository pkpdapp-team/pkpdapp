#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from http import HTTPStatus
from urllib.request import urlretrieve

from django.contrib.auth.models import User
from django.core.files import File
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import BiomarkerType, Dataset

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
        self.assertEquals(response.status_code, HTTPStatus.BAD_REQUEST)
        self.assertIn(error_message, str(response.data['csv'][0]))

    def test_create_dataset_from_csv(self):
        dataset = Dataset.objects.create(
            name='dataset_for_csv',
            datetime=timezone.now(),
        )

        # test incorrect file format
        self._assert_file_upload_error(
            dataset.pk,
            filename='TCB4dataset.xls',
            error_message='invalid continuation byte',
            ending='.xls'
        )

        # incorrect cols
        self._assert_file_upload_error(
            dataset.pk,
            filename='TCB4dataset_without_dose_group.csv',
            error_message='does not have the following columns'
        )

        # test works correctly when file of right format
        file = faux_test_file(BASE_URL_DATASETS + 'TCB4dataset.csv')
        response = self.client.put(
            '/api/dataset/{}/csv/'.format(dataset.pk),
            data={
                'csv': file
            },
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)
        biomarker_types_in_file = [
            'IL2', 'IL10', 'IL6', 'IFNg', 'TNFa', 'Cells'
        ]
        biomarker_types_in_response = [
            BiomarkerType.objects.get(id=bt_id).name
            for bt_id in response.data['biomarker_types']
        ]
        self.assertCountEqual(
            biomarker_types_in_file,
            biomarker_types_in_response,
        )
        # check they are in the database as as well
        self.assertCountEqual(
            biomarker_types_in_file,
            dataset.biomarker_types.values_list('name', flat=True),
        )

        # check with another file
        file = faux_test_file(BASE_URL_DATASETS + 'demo_pk_data_upload.csv')
        response = self.client.put(
            '/api/dataset/{}/csv/'.format(dataset.pk),
            data={
                'csv': file
            },
        )
        self.assertEquals(response.status_code, HTTPStatus.OK)

        # check the right biomarker_types are there
        biomarker_types_in_file = [
            'Docetaxel', 'Red blood cells', 'Hemoglobin',
            'Platelets ', 'White blood cells',
            'Neutrophiles absolute', 'Lymphocytes absolute',
            'Monocytes absolute', 'Eosinophils absolute',
            'Basophils absolute',
        ]
        self.assertCountEqual(
            dataset.biomarker_types.values_list('name', flat=True),
            biomarker_types_in_file
        )

        # check the right number of subjects and protocols added
        self.assertEqual(dataset.subjects.count(), 66)
        protocols = set([
            subject.protocol for subject in dataset.subjects.all()
        ])
        self.assertEqual(len(protocols), 39)
