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

        v=Variable.objects.create(
            name=n,
            unit=u,
            lower_bound=lb,
            upper_bound=ub
        )
        self.assertTrue(isinstance(v, Variable))