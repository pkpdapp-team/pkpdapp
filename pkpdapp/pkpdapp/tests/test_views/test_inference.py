#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from pkpdapp.models import (
    Inference, PharmacodynamicModel,
    PharmacokineticModel, DosedPharmacokineticModel,
    Protocol, Unit,
    LogLikelihood,
    Project, BiomarkerType,
    PriorUniform, MyokitForwardModel,
    InferenceMixin, Algorithm, InferenceChain, InferenceResult,
    InferenceFunctionResult,
)


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
        print(errors)
        self.assertTrue('log_likelihoods' in errors)
        self.assertTrue('least one log_likelihood' in errors['log_likelihoods'])
