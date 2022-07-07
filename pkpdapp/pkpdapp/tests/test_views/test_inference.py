#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import status
import pprint
import pymc3
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from pkpdapp.models import (
    Inference, Dataset,
    PharmacokineticModel, DosedPharmacokineticModel,
    Protocol, Unit,
    LogLikelihood,
    Project, BiomarkerType,
    InferenceMixin, Algorithm,
    PharmacodynamicModel,
)


class TestInferenceWizardView(APITestCase):
    def setUp(self):
        self.project = Project.objects.get(
            name='demo',
        )

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_population_and_covariates_inference(self):
        pd_dataset = Dataset.objects.get(
            name='lxf_control_growth'
        )

        pd_biomarker_names = [
            'Tumour volume', 'Body weight'
        ]

        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        pd_output_name = 'myokit.tumour_volume'
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
                'form': 'PD',
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

        response = self.client.post(
            "/api/inference/wizard", data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        print(response_data)

        # check inference fields
        self.assertEqual(response_data['name'], 'my inference run')
        self.assertEqual(response_data['project'], self.project.id)
        self.assertEqual(response_data['initialization_strategy'], 'R')

        # check number of log_likelihoods, and that the population_parameter is there
        self.assertEqual(len(response_data['log_likelihoods']), 16)
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
        pd_dataset = Dataset.objects.get(
            name='lxf_control_growth'
        )

        pd_biomarker_name = 'Tumour volume'

        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        pd_output_name = 'myokit.tumour_volume'
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
        self.assertEqual(len(response_data['log_likelihoods']), 14)
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == 'tumour_growth_inhibition_model_koch':
                found_it = True
                self.assertEqual(len(ll['parameters']), 5)
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

    def test_pk_inference_runs(self):
        pk_dataset = Dataset.objects.get(
            name='usecase0'
        )
        pk_biomarker_name = 'DemoDrug Concentration'

        biomarker_type = BiomarkerType.objects.get(
            name=pk_biomarker_name,
            dataset__name=pk_dataset.name,
        )
        biomarker_type.display_unit = Unit.objects.get(
            symbol='g/L'
        )
        biomarker_type.save()
        pk = PharmacokineticModel.objects\
            .get(name='three_compartment_pk_model')

        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )

        pk_model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pk_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )
        pk_output_name = 'central.drug_c_concentration'
        pk_parameter_names = [
            v.qname for v in pk_model.variables.filter(constant=True)
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
                'form': 'PK',
                'id': pk_model.id
            },
            'dataset': pk_dataset.id,

            # Model parameters
            'parameters': [
                {
                    'name': pk_parameter_names[0],
                    'form': 'N',
                    'parameters': [0, 1],
                },
                {
                    'name': pk_parameter_names[1],
                    'form': 'U',
                    'parameters': [-1, 1],
                },
                {
                    'name': pk_parameter_names[2],
                    'form': 'F',
                    'parameters': [0.1],
                }
            ],
            # output
            'observations': [
                {
                    'model': pk_output_name,
                    'biomarker': pk_biomarker_name,
                    'noise_form': 'N',
                    'noise_param_form': 'F',
                    'parameters': [123.3],
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
        self.assertEqual(len(response_data['log_likelihoods']), 17)
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == 'my wonderful model':
                found_it = True
                self.assertEqual(len(ll['parameters']), 10)
                model_id = ll['id']
        self.assertTrue(found_it)

        # check that the output log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'][:len(pk_output_name)] == pk_output_name:
                found_it = True
                self.assertEqual(len(ll['parameters']), 2)
                self.assertEqual(ll['parameters'][0]['name'],
                                 pk_output_name)
                self.assertEqual(ll['form'], 'N')
                sigma_ll = ll['parameters'][1]['child']
                self.assertEqual(ll['parameters'][0]['child'], model_id)
        self.assertTrue(found_it)

        # check that the sigma log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['id'] == sigma_ll:
                found_it = True
                self.assertEqual(ll['value'], 123.3)
                self.assertEqual(ll['form'], 'F')
        self.assertTrue(found_it)

        # check that the param 1 log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == pk_parameter_names[1]:
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
                self.assertEqual(ll['value'], -1)
        self.assertTrue(found_it)

    def test_usecase1(self):
        pk_dataset = Dataset.objects.get(
            name='usecase1'
        )
        pk_biomarker_name = 'DemoDrug Concentration'

        biomarker_type = BiomarkerType.objects.get(
            name=pk_biomarker_name,
            dataset__name=pk_dataset.name,
        )
        biomarker_type.display_unit = Unit.objects.get(
            symbol='g/L'
        )
        biomarker_type.save()
        pk = PharmacokineticModel.objects\
            .get(name='three_compartment_pk_model')

        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )

        pk_model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pk_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )
        drug_c_amount = pk_model.variables.get(
            qname='central.drug_c_amount'
        )
        drug_c_amount.default_value = 0
        drug_c_amount.save()

        pk_output_name = 'central.drug_c_concentration'
        pk_parameter_names = [
            v.qname for v in pk_model.variables.filter(constant=True)
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
                'form': 'PK',
                'id': pk_model.id
            },
            'dataset': pk_dataset.id,

            # Model parameters
            'parameters': [
                {
                    'name': pk_parameter_names[0],
                    'form': 'N',
                    'parameters': [0.5, 0.01],
                },
                {
                    'name': pk_parameter_names[1],
                    'form': 'U',
                    'parameters': [0.1, 0.2],
                },
                {
                    'name': pk_parameter_names[2],
                    'form': 'F',
                    'parameters': [0.1],
                }
            ],
            # output
            'observations': [
                {
                    'model': pk_output_name,
                    'biomarker': pk_biomarker_name,
                    'noise_form': 'N',
                    'noise_param_form': 'F',
                    'parameters': [123.3],
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

        # check number of log_likelihoods, and that the 5 model ll's are there
        self.assertEqual(len(response_data['log_likelihoods']), 27)
        found_it = 0
        model_ids = []
        model_name = 'my wonderful model'
        for ll in response_data['log_likelihoods']:
            if ll['name'][:len(model_name)] == model_name:
                found_it += 1
                dbmodel = DosedPharmacokineticModel.objects.get(
                    id=ll['model'][1]
                )
                if dbmodel.protocol.dose_type == 'D':
                    self.assertEqual(len(ll['parameters']), 10)
                elif dbmodel.protocol.dose_type == 'I':
                    self.assertEqual(len(ll['parameters']), 12)
                model_ids.append(ll['id'])
        self.assertEqual(found_it, 5)

        # check that the 5 output log_likelihoods are there and looks ok
        found_it = 0
        for ll in response_data['log_likelihoods']:
            if ll['name'][:len(pk_output_name)] == pk_output_name:
                found_it += 1
                db_ll = LogLikelihood.objects.get(id=ll['id'])
                self.assertEqual(db_ll.subject_group.subjects.count(), 1)
                self.assertEqual(len(ll['parameters']), 2)
                self.assertEqual(ll['parameters'][0]['name'],
                                 pk_output_name)
                self.assertEqual(ll['form'], 'N')
                sigma_ll = ll['parameters'][1]['child']
                self.assertIn(ll['parameters'][0]['child'], model_ids)
        self.assertEqual(found_it, 5)

        # check that the sigma log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['id'] == sigma_ll:
                found_it = True
                self.assertEqual(ll['value'], 123.3)
                self.assertEqual(ll['form'], 'F')
        self.assertTrue(found_it)

        # check that the param 1 log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == pk_parameter_names[1]:
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
            log_posterior.to_search([0.5, 0.12])
        )

    def test_errors(self):
        pd_dataset = Dataset.objects.get(
            name='lxf_control_growth'
        )

        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
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
            'max_number_of_iterations': 11,
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
                {
                    'name': pd_parameter_names[3],
                    'form': 'N',
                    'parameters': [('cant use a tuple',), 1],
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
        self.assertIn(
            'str or number',
            response.data['parameters'][3]['parameters'][0]
        )
        self.assertIn('model', response.data['observations'][0])
        self.assertIn('biomarker', response.data['observations'][0])


class TestInferenceViews(APITestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='DemoDrug Concentration',
            dataset__name='usecase0'
        )
        biomarker_type.display_unit = Unit.objects.get(
            symbol='g/L'
        )
        biomarker_type.save()
        pk = PharmacokineticModel.objects\
            .get(name='three_compartment_pk_model')

        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )

        model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pk_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )

        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=model.variables.first(),
            inference=self.inference,
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'central.drug_c_concentration',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = biomarker_type
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

        # set uniform prior on everything, except amounts
        for param in log_likelihood.parameters.all():
            if '_amount' in param.name:
                param.set_fixed(0)
            else:
                param.set_uniform_prior(0.0, 0.1)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_chains_view(self):
        self.inference_mixin.run_inference()

        chain = self.inference_mixin.inference.chains.first()

        response = self.client.get(
            "/api/inference_chain/{}/".format(chain.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('data' in response.data)

    def test_run_inference_errors(self):
        log_likelihoods = list(self.inference.log_likelihoods.all())
        log_likelihoods[0].name = log_likelihoods[1].name
        log_likelihoods[0].save()

        response = self.client.post(
            "/api/inference/{}/run".format(self.inference.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('log_likelihoods' in errors)
        self.assertTrue('identical names' in errors['log_likelihoods'])

        inference_no_log_likelihood = Inference.objects.create(
            name='bad bob',
            project=self.inference.project,
        )

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_log_likelihood.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('log_likelihoods' in errors)
        self.assertTrue(
            'least one log_likelihood' in errors['log_likelihoods']
        )
