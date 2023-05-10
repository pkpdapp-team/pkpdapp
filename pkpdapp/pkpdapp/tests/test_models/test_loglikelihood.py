#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

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


class TestInferenceMixinPkModel(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        self.biomarker_type = BiomarkerType.objects.get(
            name='DemoDrug Concentration',
            dataset__name='usecase0'
        )
        pk = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model'
        )
        protocol = Protocol.objects.get(
            subjects__dataset=self.biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )
        self.model = CombinedModel.objects.create(
            name='test model',
            pk_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )
        self.inference = Inference.objects.create(
            name='test',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )

    def test_create_parameters(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            biomarker_type=self.biomarker_type,
            form=LogLikelihood.Form.MODEL
        )
        self.assertEqual(log_likelihood.parameters.count(), 10)
        self.assertEqual(
            log_likelihood.parameters.filter(name='central.size').count(),
            1
        )
        self.assertEqual(log_likelihood.outputs.count(), 8)

    def test_add_output_model(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            biomarker_type=self.biomarker_type,
            form=LogLikelihood.Form.MODEL
        )

        output_model = LogLikelihood.objects.create(
            inference=self.inference,
            form=LogLikelihood.Form.NORMAL
        )

        # add the output_model
        mean_param = output_model.parameters.get(parent_index=0)
        mean_param.child = log_likelihood
        possible_outputs = self.model.variables.filter(
            constant=False
        )
        mean_param.variable = possible_outputs[0]
        mean_param.save()

        self.assertEqual(
            output_model.children.filter(id=log_likelihood.id).count(), 1
        )

    def test_create_pymc3_model(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'central.drug_c_concentration',
            'peripheral_1.drug_p1_concentration',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = self.biomarker_type
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                output.parent.delete()

        # add a prior on the first param
        first_param = log_likelihood.parameters.first()
        prior_name = first_param.name
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.save()

        model = outputs[0].create_pymc3_model(outputs[1])

        # check everything is in there
        model[prior_name]
        for name in output_names:
            model[name]

        model.logp({prior_name: 0.3})

        # check we can run predictive posteriors
        model.fastfn([
            model[log_likelihood.name + outputs[0].name]
        ])

    def test_equations(self):
        # create model N(2 * 1.0, 1.0) using an equation
        normal = LogLikelihood.objects.create(
            inference=self.inference,
            name='normal',
            form=LogLikelihood.Form.NORMAL
        )
        mean, sigma = normal.get_noise_log_likelihoods()
        mean.name = 'double it'
        mean.form = LogLikelihood.Form.EQUATION
        mean.description = '2 * arg0'
        mean.save()

        fixed = LogLikelihood.objects.create(
            inference=self.inference,
            name='untransformed mean',
            value=1.0,
            form=LogLikelihood.Form.FIXED,
        )
        LogLikelihoodParameter.objects.create(
            parent=mean,
            child=fixed,
            parent_index=0,
            name='x'
        )

        sigma.value = 1.0
        sigma.save()

        model = normal.create_pymc3_model()

        # check everything is in there
        for name in ['normal']:
            model[name]

        # equation will shift max likelihood point from 1.0 => 2.0
        self.assertLess(
            model.logp({'normal': 1.0}),
            model.logp({'normal': 2.0})
        )

    def test_population_model(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'central.drug_c_concentration',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = self.biomarker_type
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                output.parent.delete()
        values, times, subjects = outputs[0].get_data()
        n_subjects = len(set(subjects))

        # first param a new rv is drawn for each subject, set length
        first_param = log_likelihood.parameters.first()
        first_param.length = n_subjects
        first_param.save()
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.biomarker_type = self.biomarker_type
        first_param.child.save()

        model = outputs[0].create_pymc3_model()

        model.logp({first_param.name: [0.3] * n_subjects})


class TestInferenceMixinPdModel(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        self.biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )

        self.model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )

        self.inference = Inference.objects.create(
            name='test',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )

    def test_create_pymc3_model(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'myokit.tumour_volume'
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = self.biomarker_type
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                output.parent.delete()

        # add a prior on the first param
        first_param = log_likelihood.parameters.first()
        prior_name = first_param.child.name
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.save()

        model = outputs[0].create_pymc3_model()

        # check everything is in there
        model[prior_name]
        for name in output_names:
            model[name]

        model.logp({prior_name: 0.3})

        # check we can run predictive posteriors
        model.fastfn([
            model[log_likelihood.name + outputs[0].name]
        ])

    def test_population_model_with_covariate(self):
        log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'myokit.tumour_volume'
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = self.biomarker_type
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                output.parent.delete()
        values, times, subjects = outputs[0].get_data()
        n_subjects = len(set(subjects))
        print('n_subjects', n_subjects)

        # first param is sampled from a normal distribution with a mean
        # derived from subject body weight
        first_param = log_likelihood.parameters.first()
        body_weight_biomarker_type = BiomarkerType.objects.get(
            name='Body weight',
            dataset__name='lxf_control_growth'
        )
        first_param.length = n_subjects
        first_param.save()
        first_param.child.biomarker_type = body_weight_biomarker_type
        first_param.child.time_independent_data = True
        first_param.child.form = LogLikelihood.Form.NORMAL
        first_param.child.save()

        # use a covariate to adjust the mean of the normal according to body
        # weight
        mean, sigma = first_param.child.get_noise_log_likelihoods()
        mean.form = LogLikelihood.Form.EQUATION
        mean.description = '1.0 if arg0 < 20 else 2.0'

        mean.biomarker_type = body_weight_biomarker_type
        mean.time_independent_data = True
        mean.save()
        body_weight = LogLikelihood.objects.create(
            name='Body weight',
            inference=self.inference,
            form=LogLikelihood.Form.FIXED,
            biomarker_type=body_weight_biomarker_type,
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

        model = outputs[0].create_pymc3_model()

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
