#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import (
    PharmacodynamicModel, CombinedModel
)


class VariableTestCase(APITestCase):
    def setUp(self):
        self.pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_gompertz',
        )

        self.dosed_pk_model = \
            CombinedModel.objects.create(
                pd_model=self.pd_model,
            )

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_dosed_pk_project_filter(self):
        response = self.client.get(
            "/api/variable/?dosed_pk_model_id={}".format(
                self.dosed_pk_model.id
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertGreater(len(response_data), 0)
