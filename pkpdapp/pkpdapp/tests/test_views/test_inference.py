#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import status
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal, Project, BiomarkerType,
    PriorNormal, PriorUniform,
)


class TestObjectiveFunctionSerializer(APITestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        variables = model.variables.all()
        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        LogLikelihoodLogNormal.objects.create(
            sigma=2.0,
            variable=variables[1],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
        )
        PriorUniform.objects.create(
            lower=1.0,
            upper=2.0,
            variable=variables[0],
            inference=self.inference,
        )

        user = User.objects.get(username='demo')
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_run_inference(self):
        response = self.client.post(
            "/api/inference/{}/run".format(self.inference.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        running_inference = response.data
        self.assertEqual(running_inference['name'], self.inference.name)
        self.assertEqual(running_inference['read_only'], True)

    def test_run_inference_errors(self):
        inference_no_model = Inference.objects.create(
            name='bad bob',
            project=self.inference.project,
        )

        model = self.inference.pd_model
        inference_no_prior = Inference.objects.create(
            name='bad bob',
            pd_model=model,
            project=self.inference.project,
        )

        inference_no_objective_function = Inference.objects.create(
            name='bad bob',
            pd_model=model,
            project=self.inference.project,
        )

        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=model.variables.first(),
            inference=inference_no_prior,
            biomarker_type=biomarker_type
        )

        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            variable=model.variables.first(),
            inference=inference_no_objective_function,
        )

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_model.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('pd_model' in errors)

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_prior.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('priors' in errors)

        response = self.client.post(
            "/api/inference/{}/run".format(inference_no_objective_function.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data
        self.assertTrue('objective_functions' in errors)
