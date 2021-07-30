from django.test import TestCase
from pkpdapp.models import (
    Variable, Unit, DosedPharmacokineticModel,
    PharmacokineticModel, PharmacodynamicModel,
)
from django.utils import timezone

def TestVariableModel(TestCase):
    def test_variable_creation(self):
        n = 'This is a variable'
        u = Unit.objects.get(symbol='mg')
        lb = 0.001
        ub = 3.1415
        s='LN'
        ls='LG'
        pk = PharmacokineticModel.objects\
            .get(name='one_compartment_pk_model')

        v=Variable.objects.create(
            name=n,
            unit=u,
            scale=s,
            pk_model=pk,
            lower_bound=lb,
            upper_bound=ub
        )
        self.assertTrue(isinstance(v, Variable))

        #missing model
        v1=Variable.objects.create(
            name=n,
            unit=u,
            scale=s,
            lower_bound=lb,
            upper_bound=ub
        )
        self.assertFalse(isinstance(v1, Variable))

        #wrong log scale
        v2=Variable.objects.create(
            name=n,
            unit=u,
            scale=ls,
            lower_bound=0,
            upper_bound=ub
        )
        self.assertFalse(isinstance(v2, Variable))