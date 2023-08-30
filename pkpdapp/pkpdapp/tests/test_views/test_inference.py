#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from rest_framework import status
import codecs
import urllib.request
from urllib.request import urlretrieve

from django.contrib.auth.models import User
from django.core.files import File
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import (
    Algorithm,
    BiomarkerType,
    Dataset,
    CombinedModel,
    Inference,
    InferenceMixin,
    LogLikelihood,
    PharmacodynamicModel,
    PharmacokineticModel,
    PkpdMapping,
    Project,
    Protocol,
    Unit,
)
from pkpdapp.tests import create_pd_inference


class TestInferenceWizardView(APITestCase):
    def setUp(self):
        self.project = Project.objects.get(
            name='demo',
        )

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_population_and_covariates_inference(self):
        inference, log_likelihood, biomarker_type, covariate_biomarker_type, pd_model, pd_dataset = create_pd_inference(sampling=False)
        
        pd_biomarker_names = [
            biomarker_type.name, 
            covariate_biomarker_type.name, 
        ]

        pd_output_name = log_likelihood.parents.first().name
        pd_parameter_names = [
            v.qname for v in pd_model.variables.filter(constant=True)
        ]
        data = {
            # Inference parameters
            'name': "my inference run",
            'project': 1,
            'algorithm': 1,
            'initialization_strategy': 'R',
            'number_of_chains': 4,
            'max_number_of_iterations': 3000,
            'burn_in': 0,

            # Model
            'model': {
                'form': 'PK',
                'id': pd_model.id
            },
            'dataset': pd_dataset.id,
            'grouping': 'subject',

            # Model parameters
            'parameters': [
                {
                    'name': pd_parameter_names[0],
                    'form': 'N',
                    'pooled': False,
                    'parameters': [
                        (
                            r'0.1 * biomarker("{}") + '
                            r'parameter("population_parameter")'
                            .format(pd_biomarker_names[1])
                        ),
                        0.1
                    ]
                },
                {
                    'name': 'population_parameter',
                    'form': 'N',
                    'parameters': [1, 0.1]
                },
            ],

            # output
            'observations': [
                {
                    'model': pd_output_name,
                    'biomarker': pd_biomarker_names[0],
                    'noise_form': 'N',
                    'noise_param_form': 'N',
                    'parameters': [0, 1]
                },
            ]
        }
        print(data)
        response = self.client.post(
            "/api/inference/wizard", data, format='json'
        )

        response_data = response.data
        self.assertEqual(response.status_code, status.HTTP_200_OK)


        # check inference fields
        self.assertEqual(response_data['name'], 'my inference run')
        self.assertEqual(response_data['project'], self.project.id)
        self.assertEqual(response_data['initialization_strategy'], 'R')

        # check number of log_likelihoods, and that the population_parameter is
        # there
        self.assertEqual(len(response_data['log_likelihoods']), 14)
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == 'population_parameter':
                found_it = True
                self.assertEqual(len(ll['parameters']), 2)
        self.assertTrue(found_it)

        # check that the equation log_likelihood looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == 'mean for ' + pd_parameter_names[0]:
                found_it = True
                self.assertEqual(len(ll['parameters']), 2)
                self.assertTrue(
                    ll['description'] == '0.1 * arg0 + arg1' or
                    ll['description'] == '0.1 * arg1 + arg0'
                )
        self.assertTrue(found_it)

        inference = Inference.objects.get(id=response_data['id'])

        inference_mixin = InferenceMixin(inference)
        log_posterior = inference_mixin._pints_log_posterior

        # pymc3_model = log_posterior._model
        # graph = pymc3.model_graph.model_to_graphviz(pymc3_model)
        # graph.render(directory='test', view=True)

        log_posterior(
            log_posterior.to_search([0.5] * log_posterior.n_parameters())
        )

    def test_pd_inference_runs(self):
        inference, log_likelihood, biomarker_type, covariate_biomarker_type, pd_model, pd_dataset = create_pd_inference(sampling=False)
        
        pd_biomarker_name = biomarker_type.name
        pd_output_name = log_likelihood.parents.first().name
        pd_parameter_names = [
            v.qname for v in pd_model.variables.filter(constant=True)
        ]

        data = {
            # Inference parameters
            'name': "test inference run",
            'project': self.project.id,
            'algorithm': Algorithm.objects.get(name='XNES').id,
            'initialization_strategy': 'R',
            'number_of_chains': 4,
            'max_number_of_iterations': 11,
            'burn_in': 0,

            # Model
            'model': {
                'form': 'PD',
                'id': pd_model.id
            },
            'dataset': pd_dataset.id,

            # Model parameters
            'parameters': [
                {
                    'name': pd_parameter_names[0],
                    'form': 'N',
                    'parameters': [1, 0.1],
                },
                {
                    'name': pd_parameter_names[1],
                    'form': 'U',
                    'parameters': [0.1, 0.2],
                },
                {
                    'name': pd_parameter_names[2],
                    'form': 'F',
                    'parameters': [0.1],
                }
            ],
            # output
            'observations': [
                {
                    'model': pd_output_name,
                    'biomarker': pd_biomarker_name,
                    'noise_form': 'N',
                    'noise_param_form': 'N',
                    'parameters': [0, 1],
                },
            ]
        }
        response = self.client.post(
            "/api/inference/wizard", data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data

        # check inference fields
        self.assertEqual(response_data['name'], 'test inference run')
        self.assertEqual(response_data['project'], self.project.id)
        self.assertEqual(response_data['initialization_strategy'], 'R')

        # check number of log_likelihoods, and that the model ll is there
        self.assertEqual(len(response_data['log_likelihoods']), 12)
        found_it = False
        for ll in response_data['log_likelihoods']:
            print('looking in ', ll['name'])
            if ll['name'] == 'my wonderful model':
                found_it = True
                self.assertEqual(len(ll['parameters']), 3)
                model_id = ll['id']
        self.assertTrue(found_it)

        # check that the output log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == pd_output_name:
                found_it = True
                self.assertEqual(len(ll['parameters']), 2)
                self.assertEqual(ll['parameters'][0]['name'],
                                 pd_output_name)
                self.assertEqual(ll['form'], 'N')
                self.assertEqual(
                    ll['biomarker_type'],
                    pd_dataset.biomarker_types.get(name=pd_biomarker_name).id
                )
                self.assertEqual(ll['parameters'][0]['child'], model_id)
                sigma_ll = ll['parameters'][1]['child']
        self.assertTrue(found_it)

        # check that the sigma log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['id'] == sigma_ll:
                found_it = True
                self.assertEqual(ll['form'], 'N')
                self.assertEqual(len(ll['parameters']), 2)
        self.assertTrue(found_it)

        # check that the param 1 log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == pd_parameter_names[1]:
                found_it = True
                self.assertEqual(ll['form'], 'U')
                self.assertEqual(len(ll['parameters']), 2)
                child_id = ll['parameters'][0]['child']
        self.assertTrue(found_it)
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['id'] == child_id:
                found_it = True
                self.assertEqual(ll['form'], 'F')
                self.assertEqual(ll['value'], 0.1)
        self.assertTrue(found_it)

        inference = Inference.objects.get(id=response_data['id'])

        inference_mixin = InferenceMixin(inference)
        log_posterior = inference_mixin._pints_log_posterior

        # pymc3_model = log_posterior._model
        # graph = pymc3.model_graph.model_to_graphviz(pymc3_model)
        # graph.render(directory='test', view=True)

        log_posterior(
            log_posterior.to_search([0.5, 0.12, 0.1])
        )


    def test_errors(self):
        inference, log_likelihood, biomarker_type, covariate_biomarker_type, pd_model, pd_dataset = create_pd_inference(sampling=False)
        
        pd_parameter_names = [
            v.qname for v in pd_model.variables.filter(constant=True)
        ]

        data = {}
        response = self.client.post(
            "/api/inference/wizard", data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('project', response.data)
        self.assertIn('dataset', response.data)
        self.assertIn('model', response.data)
        self.assertIn('parameters', response.data)
        self.assertIn('observations', response.data)

        data = {
            'name': "test inference run",
            'project': self.project.id,
            'algorithm': Algorithm.objects.get(name='XNES').id,
            'initialization_strategy': 'R',
            'number_of_chains': 4,
            'max_number_of_iterations': 2,
            'burn_in': 0,

            'model': {
                'form': 'PD',
                'id': pd_model.id
            },
            'dataset': pd_dataset.id,

            'parameters': [
                {
                    'name': pd_parameter_names[0],
                    'form': 'N',
                    'parameters': ['import pybamm', 1],
                },
                {
                    'name': pd_parameter_names[1],
                    'form': 'N',
                    'parameters': ['1 + parameter("doesnt exist")', 1],
                },
                {
                    'name': pd_parameter_names[2],
                    'form': 'N',
                    'parameters': ['1 + biomarker("doesnt exist")', 1],
                },
            ],
            'observations': [
                {
                    'model': 'not in the model, really',
                    'biomarker': 'not in the dataset',
                    'noise_form': 'N',
                    'noise_param_form': 'N',
                    'parameters': [0, 1],
                },
            ]
        }

        response = self.client.post(
            "/api/inference/wizard", data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            'Expected', response.data['parameters'][0]['parameters'][0]
        )
        self.assertIn(
            'not in list of parameters',
            response.data['parameters'][1]['parameters'][0]
        )
        self.assertIn(
            'not in list of biomarkers',
            response.data['parameters'][2]['parameters'][0]
        )
        self.assertIn('model', response.data['observations'][0])
        self.assertIn('biomarker', response.data['observations'][0])
