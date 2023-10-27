#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import Project, PharmacokineticModel, CombinedModel, PharmacodynamicModel
import numpy as np


class CombinedModelTestCase(APITestCase):
    def setUp(self):
        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_pk_project_filter(self):
        response = self.client.get("/api/combined_model/?project_id=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertEqual(len(response_data), 1)

    def test_cannot_create_in_read_only_project(self):
        user = User.objects.get(username='demo2')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        project = Project.objects.get(name='demo')
        response = self.client.post(
            "/api/combined_model/",
            data={
                'name': 'test',
                'project': project.id
            }
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )
    
    def create_combined_model(self, name, pd=None):
        project = Project.objects.get(name='demo')
        pk = PharmacokineticModel.objects.get(
            name='one_compartment_clinical',
        )
        data={
            'name': name,
            'project': project.id,
            'pk_model': pk.id,
            'mappings': [],
            'derived_variables': [],
        }
        if pd is not None:
            data['pd_model'] = pd.id
        response = self.client.post(
            "/api/combined_model/",
            data=data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cm = CombinedModel.objects.get(pk=response.data['id'])

        # set up a protocol
        response = self.client.post(
            "/api/protocol/",
            data={
                'name': 'test protocol',
                'project': project.id,
                'doses': [
                    {
                        'start_time': 0,
                        'amount': 1,
                        'duration': 0.001,
                        'repeat_interval': 1,
                        'repeats': 1,
                    }
                ]
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # attach it to the A1 variables
        a1 = cm.variables.get(name='A1')
        response = self.client.patch(
            f"/api/variable/{a1.id}/",
            data={
                'protocol': response.data['id'],
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if pd is not None:
            c1 = cm.variables.get(name='C1')
            drug_c = cm.variables.get(name='C_Drug')

            response = self.client.patch(
                f"/api/combined_model/{cm.id}/",
                data={
                    'mappings': [
                        {
                            'pk_variable': c1.id,
                            'pd_variable': drug_c.id,
                        }
                    ],
                    'derived_variables': [],
                },
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        return response.data
    
    def simulate_combined_model(self, id):
        response = self.client.post(
            f"/api/combined_model/{id}/simulate",
            data={
                'outputs': ['PDCompartment.C_Drug', 'PKCompartment.C1', 'PDCompartment.E'],
                'variables': {},
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys= [ key for key in response.data['outputs'].keys() ]
        return response.data['outputs'][keys[0]], response.data['outputs'][keys[1]], response.data['outputs'][keys[2]]

    
    def test_swap_mapped_pd_model(self):
        pd1 = PharmacodynamicModel.objects.get(
            name='indirect_effects_stimulation_elimination',
        )
        pd2 = PharmacodynamicModel.objects.get(
            name='indirect_effects_inhibition_elimination',
        )
        model1 = self.create_combined_model('test1', pd1)
        model2 = self.create_combined_model('test2', pd2)
        c_drug1, c1_1, e1 = self.simulate_combined_model(model1['id'])
        c_drug2, c1_2, e2 = self.simulate_combined_model(model2['id'])

        # c_drug should be mapped to c1 and equal 
        np.testing.assert_allclose(c_drug1, c1_1, atol=1e-5, rtol=1e-5)

        # swap the pd model for model 1, old mappings should be updated
        cm = CombinedModel.objects.get(pk=model1['id'])
        c1 = cm.variables.get(name='C1')
        c_drug = cm.variables.get(name='C_Drug')
        response = self.client.patch(
            f"/api/combined_model/{model1['id']}/",
            data={
                'pd_model': pd2.id,
                'mappings': [
                    {
                        'pk_variable': c1.id,
                        'pd_variable': c_drug.id,
                    }
                ],
            },
            format='json'
        )
        model1 = response.data

        # simulate the model again
        c_drug3, c1_3, e3 = self.simulate_combined_model(model1['id'])

        # c_drug3 should be mapped to c3 and equal 
        np.testing.assert_allclose(c_drug3, c1_3, atol=1e-5, rtol=1e-5)

        # check that the data is the same as the second simulation
        np.testing.assert_allclose(c_drug3, c_drug2, atol=1e-5, rtol=1e-5)
        np.testing.assert_allclose(c1_3, c1_2, atol=1e-5, rtol=1e-5)
        np.testing.assert_allclose(e3, e2, atol=1e-5, rtol=1e-5)



