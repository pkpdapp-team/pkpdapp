#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from django.db.utils import IntegrityError
from pkpdapp.models import (
    Inference, Dataset, PharmacodynamicModel
)


class TestInference(TestCase):
    def test_inference_creation(self):
        de = 'Inference description'
        sf = 'Score function'
        ll = 'Log likelihood'
        it = 'SA'
        a = 'algorithm'
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            sbml='sbml_here',
        )
        i = Inference.objects.create(
            description=d,
            score_function=sf,
            log_likelihood=ll,
            inference_type=it,
            algorithm=a,
            dataset=d,
            pd_model=m
        )
        self.assertTrue(isinstance(i, Inference))

        with self.assertRaises(IntegrityError) as context:
            i=Inference.objects.create(
                description=d,
                inference_type=it,
                algorithm=a,
                dataset=d,
                pd_model=m
            )
        self.assertTrue('inference must have to a log-likelihood or a score function' in str(context.exception))