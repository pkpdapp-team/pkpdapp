#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import unittest
from django.test import TestCase


class TestOptimise(TestCase):

    # creates a CombinedModel that represents exponential decay with two parameters
    # the model is created from an mmt string that defines the model in Myokit
    def _exponential_model(self):
        raise NotImplementedError("Optimisation is not yet implemented.")

    # creates a dataset with a single biomarker type and two subject groups
    # the two subject groups are each "dosed"
    # at t = 0 and t = n, where n is different for each group,
    # the dosing levels are different for each group, and the data is generated
    # from the exponential model with some noise uses myokit_model_mixin.simulate
    # to generate the data, and then adds some noise to it
    #
    # For manual verification, plots of the data and the simulation at the true parameter values should be generated and saved to files.
    def _exponential_data(self):
        raise NotImplementedError("Optimisation is not yet implemented.")

    # tests the myokit_model_mixin.optimise method on the exponential model and data
    # the bounds used are tight and the initial guess is close to the true values,
    # so the optimisation should succeed
    @unittest.skip("not implemented yet")
    def test_optimise(self):
        raise NotImplementedError("Optimisation is not yet implemented.")
