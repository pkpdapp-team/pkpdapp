#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

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
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )

        url = reverse('simulate-pharmacodynamic', args=(m.pk,))
        data = {
            'outputs': ['myokit.tumour_volume', 'myokit.time'],
            'initial_conditions': {
                'myokit.tumour_volume': 1.5,
            },
            'variables': {
                'myokit.lambda_0': 1.1,
                'myokit.lambda_1': 1.2,
                'myokit.kappa': 1.3,
                'myokit.drug_concentration': 1.4,
            },
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual(
            list(response.data.keys()),
            [
                Variable.objects.get(qname=qname, pd_model=m).id
                for qname in data['outputs']
            ]
        )

        url = reverse('simulate-pharmacodynamic', args=(123,))
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_simulate_pkpd(self):
        project = Project.objects.get(
            name='demo',
        )
        pk_model = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model'
        )
        biomarker_type = BiomarkerType.objects.get(
            name='DemoDrug Concentration',
            dataset__name='usecase0'
        )
        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )
        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        pkpd_model = CombinedModel.objects.create(
            name='my wonderful model',
            pk_model=pk_model,
            pd_model=pd_model,
            dose_compartment='central',
            protocol=protocol,
            project=project,
        )

        url = reverse('simulate-dosed-pharmacokinetic', args=(pkpd_model.pk,))
        data = {
            'outputs': ['PD.tumour_volume', 'myokit.time'],
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
