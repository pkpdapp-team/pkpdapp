#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Prior, Variable, PharmacokineticModel
)


class TestPrior(TestCase):
    def test_prior_creation(self):
        n = 'variable name'
        u = Unit.objects.get(symbol = 'mg')
        lb = 0.001
        ub = 3.1415
        s = 'LN'
        ls = 'LG'
        pk = PharmacokineticModel.objects\
            .get(name='one_compartment_pk_model')

        p=Variable.objects.create(
            name = n,
            unit = u,
            scale = s,
            pk_model = pk,
            lower_bound = lb,
            upper_bound = ub
        )
        p = Prior.objects.create(
            variable = p,
            prior_type = 'UN'
        )
        self.assertTrue(isinstance(p, Prior))