#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import BiomarkerType, Protocol


class NcaTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_nca_post(self):
        biomarker_type = BiomarkerType.objects.get(
            name='Docetaxel'
        )
        protocol = Protocol.objects.get(
            name='demo_pk_data-Docetaxel-5335'
        )
        subject = protocol.subjects.first()
        data = {
            'subject_id': subject.id,
            'biomarker_type_id': biomarker_type.id,
        }
        response = self.client.post(
            "/api/nca/", data
        )
        self.assertEqual(
            response.status_code, status.HTTP_200_OK
        )

    def test_nca_post_fail_no_subject(self):
        biomarker_type = BiomarkerType.objects.get(
            name='Docetaxel'
        )
        protocol = Protocol.objects.get(
            name='demo_pk_data-Docetaxel-5109'
        )
        subject = protocol.subjects.first()
        data = {
            'subject_id': subject.id,
            'biomarker_type_id': biomarker_type.id,
        }
        response = self.client.post(
            "/api/nca/", data
        )
        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertRegex(
            response.data['biomarker_type'],
            (
                "BiomarkerType {} does not have measurements "
                "for subject id"
                .format(biomarker_type.id)
            )
        )
