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
    Unit,
)
from django.contrib.auth.models import User

from rest_framework import status
from django.urls import reverse

from rest_framework.test import APITestCase, APIClient


class TestSimulateView(APITestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(
            name="test project", compound=self.compound
        )
        self.dataset = Dataset.objects.create(name="test dataset", project=self.project)

        self.user = User.objects.create_user(username="testuser", password="12345")
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_simulate(self):
        pd = PharmacodynamicModel.objects.get(
            name="tumour_growth_gompertz",
            read_only=False,
        )
        pk = PharmacokineticModel.objects.get(
            name="one_compartment_clinical",
        )
        m = CombinedModel.objects.create(
            name="my wonderful model",
            pd_model=pd,
            pk_model=pk,
            project=self.project,
        )

        au = Unit.objects.get(symbol="mg")
        tu = Unit.objects.get(symbol="h")
        variable = Variable.objects.get(qname="PKCompartment.A1", dosed_pk_model=m)
        protocol = Protocol.objects.create(
            name="my_cool_protocol",
            compound=self.compound,
            amount_unit=au,
            time_unit=tu,
            variable=variable,
        )
        subject_group = SubjectGroup.objects.create(
            name="my_cool_group",
        )
        Subject.objects.create(
            id_in_dataset=1,
            dataset=self.dataset,
            group=subject_group,
            protocol=protocol,
        )

        url = reverse("simulate-combined-model", args=(m.pk,))
        data = {
            "outputs": ["PDCompartment.TS", "environment.t"],
            "variables": {
                "PDCompartment.TS0": 1.1,
            },
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # With no distributions, simulate returns the uncertainty shape from a
        # single deterministic run: sample_count == 1 and std all zeros.
        for sim in response.data:
            self.assertEqual(sim["sample_count"], 1)
            self.assertTrue(len(sim["time"]) > 0)
            outputs = sim.get("outputs")
            self.assertCountEqual(
                list(outputs.keys()),
                [
                    str(Variable.objects.get(qname=qname, dosed_pk_model=m).id)
                    for qname in data["outputs"]
                ],
            )
            for summary in outputs.values():
                self.assertIn("mean", summary)
                self.assertIn("std", summary)
                self.assertIn("quantiles", summary)
                self.assertTrue(all(s == 0.0 for s in summary["std"]))

        legacy_data = {**data, "use_diffsol": False}
        response = self.client.post(url, legacy_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        invalid_data = {**data, "use_diffsol": "not-a-bool"}
        response = self.client.post(url, invalid_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("use_diffsol", response.data.get("error", ""))

        url = reverse("simulate-combined-model", args=(123,))
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def _uncertainty_model(self):
        pd = PharmacodynamicModel.objects.get(
            name='tumour_growth_gompertz',
            read_only=False,
        )
        pk = PharmacokineticModel.objects.get(
            name='one_compartment_clinical',
        )
        return CombinedModel.objects.create(
            name='my wonderful model',
            pd_model=pd,
            pk_model=pk,
            project=self.project,
        )

    def test_simulate_with_distribution(self):
        from pkpdapp.models import Distribution

        m = self._uncertainty_model()
        variable = Variable.objects.get(
            qname='PDCompartment.TS0', dosed_pk_model=m
        )
        Distribution.objects.create(
            variable=variable,
            pdf=Distribution.PDF.LOGNORMAL,
            variance=0.04,
        )

        url = reverse('simulate-combined-model', args=(m.pk,))
        data = {
            'outputs': ['PDCompartment.TS', 'environment.t'],
            'variables': {'PDCompartment.TS0': 1.1},
            'sample_count': 20,
            'seed': 42,
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ts_output_id = str(
            Variable.objects.get(qname='PDCompartment.TS', dosed_pk_model=m).id
        )
        has_spread = False
        for sim in response.data:
            self.assertEqual(sim['sample_count'], 20)
            self.assertTrue(len(sim['time']) > 0)
            summary = sim['outputs'][ts_output_id]
            if any(s > 0.0 for s in summary['std']):
                has_spread = True
        self.assertTrue(has_spread)

        # reproducible with the same seed
        repeated = self.client.post(url, data, format='json')
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, repeated.data)

    def test_simulate_with_correlation(self):
        from pkpdapp.models import Correlation, Distribution

        m = self._uncertainty_model()
        ts0 = Variable.objects.get(qname='PDCompartment.TS0', dosed_pk_model=m)
        cl = Variable.objects.get(qname='PKCompartment.CL', dosed_pk_model=m)
        dist_ts0 = Distribution.objects.create(
            variable=ts0, pdf=Distribution.PDF.LOGNORMAL, variance=0.04
        )
        dist_cl = Distribution.objects.create(
            variable=cl, pdf=Distribution.PDF.LOGNORMAL, variance=0.04
        )
        Correlation.objects.create(
            distribution_1=dist_ts0,
            distribution_2=dist_cl,
            coefficient=0.7,
        )

        url = reverse('simulate-combined-model', args=(m.pk,))
        data = {
            'outputs': ['PDCompartment.TS', 'environment.t'],
            'variables': {'PDCompartment.TS0': 1.1},
            'sample_count': 20,
            'seed': 42,
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ts_output_id = str(
            Variable.objects.get(qname='PDCompartment.TS', dosed_pk_model=m).id
        )
        has_spread = any(
            any(s > 0.0 for s in sim['outputs'][ts_output_id]['std'])
            for sim in response.data
        )
        self.assertTrue(has_spread)

        # correlated sampling is still reproducible with the same seed
        repeated = self.client.post(url, data, format='json')
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, repeated.data)

    def test_simulate_with_logit_distribution_out_of_range(self):
        from pkpdapp.models import Distribution

        m = self._uncertainty_model()
        variable = Variable.objects.get(
            qname='PDCompartment.TS0', dosed_pk_model=m
        )
        Distribution.objects.create(
            variable=variable,
            pdf=Distribution.PDF.LOGIT,
            variance=0.09,
        )

        url = reverse('simulate-combined-model', args=(m.pk,))
        # P = 1.1 is outside (0, 1); logit sampling must reject it
        data = {
            'outputs': ['PDCompartment.TS', 'environment.t'],
            'variables': {'PDCompartment.TS0': 1.1},
            'sample_count': 20,
            'seed': 42,
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
