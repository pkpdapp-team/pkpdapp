#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from pkpdapp.models import (
    Simulation,
    SimulationSlider,
)
from pkpdapp.tests.utils import setup_pk_inference


class TestSimulation(TestCase):
    def setUp(self):
        self.dataset, self.biomarker_type, self.model = setup_pk_inference()
        self.simulation = Simulation.objects.create(
            name="bob",
            project=self.model.project,
            time_max=30,
            time_max_unit=self.biomarker_type.display_time_unit,
        )

    @unittest.skip("not implemented yet")
    def test_quickfit(self):
        possible_params = self.model.variables.filter(constant=True).values(
            "qname", "default_value"
        )
        true_params = {
            param["qname"]: param["default_value"] for param in possible_params[:2]
        }
        print(true_params)
        sliders = []
        for param in possible_params[:2]:
            sliders.append(
                SimulationSlider.objects.create(
                    simulation=self.simulation,
                    variable=self.model.variables.get(qname=param["qname"]),
                )
            )
        self.simulation.sliders.set(sliders)

        params = {
            param["qname"]: {
                "value": 2 * param["default_value"] + 0.1,
                "min": 0.1 * param["default_value"],
                "max": 10 * param["default_value"],
            }
            for param in possible_params[:2]
        }
        fitted_params = self.simulation.quickfit(
            params=params,
        )
        # the true data values are equal to the default values
        for param in fitted_params:
            self.assertAlmostEqual(
                fitted_params[param],
                true_params[param],
            )
