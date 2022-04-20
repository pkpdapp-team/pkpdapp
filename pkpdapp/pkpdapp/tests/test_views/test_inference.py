#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import status
from django.contrib.auth.models import User
import json
from rest_framework.test import APITestCase, APIClient
from pkpdapp.models import (
    Inference, Dataset,
    PharmacokineticModel, DosedPharmacokineticModel,
    Protocol, Unit,
    LogLikelihood,
    Project, BiomarkerType,
    PriorUniform, MyokitForwardModel,
    InferenceMixin, Algorithm,
    PharmacodynamicModel,
)


class TestNaivePooledInferenceView(APITestCase):
    def setUp(self):
        self.project = Project.objects.get(
            name='demo',
        )

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)


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
            'parameters': {
                pd_parameter_names[0]: {
                    'form': 'N',
                    'parameters': [0, 1],
                },
                pd_parameter_names[1]: {
                    'form': 'U',
                    'parameters': [-1, 1],
                },
                pd_parameter_names[2]: {
                    'form': 'F',
                    'parameters': [0.1],
                }
            },
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
            "/api/inference/naive_pooled", data, format='json'
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
                self.assertEqual(ll['parameters'][0]['child'], model_id)
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
                self.assertEqual(ll['value'], -1)
        self.assertTrue(found_it)

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
            pharmacokinetic_model=pk,
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
            'parameters': {
                pk_parameter_names[0]: {
                    'form': 'N',
                    'parameters': [0, 1],
                },
                pk_parameter_names[1]: {
                    'form': 'U',
                    'parameters': [-1, 1],
                },
                pk_parameter_names[2]: {
                    'form': 'F',
                    'parameters': [0.1],
                }
            },
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
            "/api/inference/naive_pooled", data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data

        # check inference fields
        self.assertEqual(response_data['name'], 'test inference run')
        self.assertEqual(response_data['project'], self.project.id)
        self.assertEqual(response_data['initialization_strategy'], 'R')

        # check number of log_likelihoods, and that the model ll is there
        self.assertEqual(len(response_data['log_likelihoods']), 16)
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == 'my wonderful model':
                found_it = True
                self.assertEqual(len(ll['parameters']), 9)
                model_id = ll['id']
        self.assertTrue(found_it)

        # check that the output log_likelihood is there and looks ok
        found_it = False
        for ll in response_data['log_likelihoods']:
            if ll['name'] == pk_output_name:
                found_it = True
                self.assertEqual(len(ll['parameters']), 2)
                self.assertEqual(ll['parameters'][0]['name'],
                                 pk_output_name)
                self.assertEqual(ll['parameters'][0]['child'], model_id)
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

    def test_errors(self):
        pass


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
            dataset=biomarker_type.dataset,
            subject__id_in_dataset=1,
        )

        model = DosedPharmacokineticModel.objects.create(
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )

        variables = model.variables.all()
        var_names = [v.qname for v in variables]
        m = model.get_myokit_model()
        s = model.get_myokit_simulator()

        forward_model = MyokitForwardModel(
            myokit_model=m,
            myokit_simulator=s,
            outputs="central.drug_c_concentration"
        )

        output_names = forward_model.output_names()
        var_index = var_names.index(output_names[0])

        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type,
            form=LogLikelihood.Form.NORMAL
        )

        # find variables that are being estimated
        parameter_names = forward_model.variable_parameter_names()
        var_indices = [var_names.index(v) for v in parameter_names]
        for i in var_indices:
            param = log_likelihood.parameters.get(
                variable=variables[i]
            )
            if '_amount' in param.name:
                param.value = 0
                param.save()
            else:
                PriorUniform.objects.create(
                    lower=0.0,
                    upper=0.1,
                    log_likelihood_parameter=param,
                )
        noise_param = log_likelihood.parameters.get(
            variable__isnull=True
        )
        PriorUniform.objects.create(
            lower=0.0,
            upper=2.0,
            log_likelihood_parameter=noise_param,
        )
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
        log_likelihood = self.inference.log_likelihoods.first()
        model = log_likelihood.get_model()

        inference_no_prior = Inference.objects.create(
            name='bad bob',
            project=self.inference.project,
        )

        inference_no_log_likelihood = Inference.objects.create(
            name='bad bob',
            project=self.inference.project,
        )

        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )

        LogLikelihood.objects.create(
            form='N',
            variable=model.variables.first(),
            inference=inference_no_prior,
            biomarker_type=biomarker_type
        )

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_prior.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('log_likelihoods' in errors)
        self.assertTrue('prior' in errors['log_likelihoods'])

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_log_likelihood.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('log_likelihoods' in errors)
        self.assertTrue(
            'least one log_likelihood' in errors['log_likelihoods']
        )
