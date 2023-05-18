#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests
from django.db.utils import IntegrityError
from pkpdapp.models import (
    Variable, Unit,
    PharmacokineticModel,
)

def TestVariableModel(TestCase):
    def test_variable_creation(self):
        n = 'variable name'
        u = Unit.objects.get(symbol='mg')
        lb = 0.001
        ub = 3.1415
        s = 'LN'
        ls = 'LG'
        pk = PharmacokineticModel.objects\
            .get(name='one_compartment_pk_model')

        v = Variable.objects.create(
            name=n,
            unit=u,
            scale=s,
            pk_model=pk,
            lower_bound=lb,
            upper_bound=ub
        )
        self.assertTrue(isinstance(v, Variable))

        with self.assertRaises(IntegrityError) as context:
            Variable.objects.create(
                name=n,
                unit=u,
                scale=s,
                lower_bound=lb,
                upper_bound=ub
            )
        err_msg = 'variable must belong to a model'
        self.assertTrue(err_msg in str(context.exception))

        with self.assertRaises(IntegrityError) as context:
            Variable.objects.create(
                name=n,
                unit=u,
                scale=ls,
                lower_bound=0,
                upper_bound=ub
            )
        err_msg = 'log scale must have a lower bound greater than zero'
        self.assertTrue(err_msg in str(context.exception))
