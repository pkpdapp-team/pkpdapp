#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import BiomarkerType, Dataset


class NcaTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_auce_post(self):
        dataset = Dataset.objects.get(
            name='TCB4dataset'
        )
        biomarker_type = BiomarkerType.objects.get(
            name='IL2',
            dataset=dataset,
        )
        group_type = BiomarkerType.objects.get(
            name='group',
            dataset=dataset,
        )
        dose_type = BiomarkerType.objects.get(
            name='dose',
            dataset=dataset,
        )
        data = {
            'biomarker_type_id': biomarker_type.id,
            'group_type_id': group_type.id,
            'concentration_type_id': dose_type.id,
        }
        response = self.client.post(
            "/api/auce/", data
        )
        self.assertEqual(
            response.status_code, status.HTTP_200_OK
        )

    def test_auce_no_dose_group_amount(self):
        biomarker_type = BiomarkerType.objects.get(
            name='Docetaxel'
        )
        data = {
            'biomarker_type_id': biomarker_type.id,
        }
        response = self.client.post(
            "/api/auce/", data
        )
        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertRegex(
            response.data['group_type_id'],
            (
                'required'
            )
        )
