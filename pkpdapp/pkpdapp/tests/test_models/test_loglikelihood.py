#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import (
    Algorithm,
    BiomarkerType,
    CombinedModel,
    Inference,
    LogLikelihood,
    LogLikelihoodParameter,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Protocol,
)
from pkpdapp.tests import create_pd_inference



class TestInferenceMixinPdModel(TestCase):
    def setUp(self):
        self.inference, self.log_likelihood, self.biomarker_type, self.covariate_biomarker_type, self.model, _ = create_pd_inference(sampling=True)

    def test_create_pymc3_model(self):

        # add a prior on the first param
        first_param = self.log_likelihood.parameters.first()
        prior_name = first_param.child.name
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.save()

        output = self.log_likelihood.parents.first()
        model = output.create_pymc3_model()

        # check everything is in there
        model[prior_name]
        model[output.name]
        model.logp({prior_name: 0.3})

        # check we can run predictive posteriors
        model.fastfn([
            model[self.log_likelihood.name + output.name]
        ])

    def test_population_model_with_covariate(self):
        output = self.log_likelihood.parents.first()
        
        values, times, subjects = output.get_data()
        n_subjects = len(set(subjects))
        print('n_subjects', n_subjects)

        # first param is sampled from a normal distribution with a mean
        # derived from subject body weight
        first_param = self.log_likelihood.parameters.first()
        first_param.length = n_subjects
        first_param.save()
        first_param.child.biomarker_type = self.covariate_biomarker_type 
        first_param.child.time_independent_data = True
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.save()

        # use a covariate to adjust the mean of the normal according to body
        # weight
        mean, sigma = first_param.child.get_noise_log_likelihoods()
        mean.form = LogLikelihood.Form.EQUATION
        mean.description = '1.0 if arg0 < 20 else 2.0'

        mean.biomarker_type = self.covariate_biomarker_type 
        mean.time_independent_data = True
        mean.save()
        body_weight = LogLikelihood.objects.create(
            name='Body weight',
            inference=self.inference,
            form=LogLikelihood.Form.FIXED,
            biomarker_type=self.covariate_biomarker_type,
            time_independent_data=True,
        )
        body_weight_values, _, subjects = body_weight.get_data()
        LogLikelihoodParameter.objects.create(
            name='Body weight',
            parent=mean,
            child=body_weight,
            parent_index=0,
            length=len(subjects)
        )
        sigma.value = 0.01
        sigma.save()

        model = output.create_pymc3_model()

        model.logp({first_param.child.name: [0.3] * n_subjects})

        max_logp = model[first_param.child.name].logp({
            first_param.child.name: [
                1.0 if value < 20 else 2.0
                for value in body_weight_values
            ]
        })
        lower_logp = model[first_param.child.name].logp({
            first_param.child.name: [1.0] * n_subjects
        })
        self.assertLess(lower_logp, max_logp)
