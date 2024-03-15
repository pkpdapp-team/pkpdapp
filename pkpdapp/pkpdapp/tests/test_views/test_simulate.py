#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.models import (
    PharmacodynamicModel,
    PharmacokineticModel,
    Variable,
    CombinedModel,
    Project,
    Compound,
    Dataset,
    Protocol,
    Subject,
    SubjectGroup,
    Unit
)
from django.contrib.auth.models import User

from rest_framework import status
from django.urls import reverse

from rest_framework.test import APITestCase, APIClient


class TestSimulateView(APITestCase):
    def setUp(self):
        au = Unit.objects.get(symbol='mg')
        tu = Unit.objects.get(symbol='h')
        compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(name='test project', compound=compound)
        self.dataset = Dataset.objects.create(name='test dataset', project=self.project)
        self.protocol = Protocol.objects.create(
            name='my_cool_protocol',
            compound=compound,
            amount_unit=au,
            time_unit=tu,
            mapped_qname='PKCompartment.A1'
        )
        self.subject_group = SubjectGroup.objects.create(
            name='my_cool_group',
        )
        self.subject = Subject.objects.create(
            id_in_dataset=1,
            dataset=self.dataset,
            group=self.subject_group,
            protocol=self.protocol,
        )
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_simulate(self):
        pd = PharmacodynamicModel.objects.get(
            name='tumour_growth_gompertz',
            read_only=False,
        )
        pk = PharmacokineticModel.objects.get(
            name="one_compartment_clinical",
        )
        m = CombinedModel.objects.create(
            name='my wonderful model',
            pd_model=pd,
            pk_model=pk,
            project=self.project,
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

        for sim in response.data:
            outputs = sim.get('outputs')
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
