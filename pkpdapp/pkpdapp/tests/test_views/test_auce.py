#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import BiomarkerType


class NcaTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_auce_post(self):
        biomarker_type = BiomarkerType.objects.get(
            name='IL2'
        )
        data = {
            'biomarker_type_id': biomarker_type.id,
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
            response.data['biomarker_type_id'],
            (
                "BiomarkerType id {} has a subject "
                "with no dose group amount"
                .format(biomarker_type.id)
            )
        )
