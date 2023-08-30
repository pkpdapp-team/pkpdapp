#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from pkpdapp.models import (
    PharmacodynamicModel, Variable,
    Project,
    CombinedModel,
    PharmacokineticModel,
    BiomarkerType,
    Protocol,

)
from django.contrib.auth.models import User

from rest_framework import status
from django.urls import reverse

from rest_framework.test import APITestCase, APIClient


class TestSimulateView(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_simulate(self):
        pd = PharmacodynamicModel.objects.get(
            name='tumour_growth_gompertz',
            read_only=False,
        )
        m= CombinedModel.objects.create(
            name='my wonderful model',
            pd_model=pd,
        )

        url = reverse('simulate-combined-model', args=(m.pk,))
        data = {
            'outputs': ['PDCompartment.TS', 'environment.t'],
            'variables': {
                'PDCompartment.TS0': 1.1,
            },
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        outputs = response.data.get('outputs')
        self.assertCountEqual(
            list(outputs.keys()),
            [
                Variable.objects.get(qname=qname, dosed_pk_model=m).id
                for qname in data['outputs']
            ]
        )

        url = reverse('simulate-combined-model', args=(123,))
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
