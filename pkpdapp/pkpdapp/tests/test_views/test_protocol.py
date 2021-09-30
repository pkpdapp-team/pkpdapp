#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import Dataset


class ProtocolTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_dataset_protocol_no_update(self):
        dataset = Dataset.objects.get(name='lxf_control_growth')
        data = {
            'name': 'test',
            'dataset': dataset.id,
        }
        response = self.client.post("/api/protocol/", data)
        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(response.data['name'], data['name'])

        new_data = {
            'name': 'test_new',
            'dataset': dataset.id,
        }
        protocol_id = response.data['id']

        response = self.client.put(
            "/api/protocol/{}/".format(protocol_id), new_data
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )
        response = self.client.patch(
            "/api/protocol/{}/".format(protocol_id), new_data
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_protocol_without_dataset_can_update(self):
        data = {
            'name': 'test2',
        }
        response = self.client.post("/api/protocol/", data)
        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(response.data['name'], data['name'])

        new_data = {
            'id': response.data['id'],
            'name': 'test_new',
        }

        protocol_id = response.data['id']

        response = self.client.put(
            "/api/protocol/{}/".format(protocol_id), new_data
        )
        self.assertEqual(
            response.status_code, status.HTTP_200_OK
        )
        response = self.client.patch(
            "/api/protocol/{}/".format(protocol_id), new_data
        )
        self.assertEqual(
            response.status_code, status.HTTP_200_OK
        )
