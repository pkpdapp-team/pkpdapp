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

    def test_dataset_dose_no_update(self):
        dataset = Dataset.objects.get(name='demo_pk_data')
        protocol = dataset.protocols.first()
        dose = protocol.doses.first()

        data = {
            'value': 3.14,
        }

        response = self.client.put(
            "/api/dose/{}/".format(dose.id), data
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )
        response = self.client.patch(
            "/api/dose/{}/".format(dose.id), data
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )
