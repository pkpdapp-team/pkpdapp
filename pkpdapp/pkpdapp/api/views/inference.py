#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, views, status
from rest_framework.response import Response
import json
import numbers
import re
from pyparsing import (
    ParseException,
)
from pkpdapp.utils import (
    ExpressionParser
)
from pkpdapp.api.views import (
    ProjectFilter, InferenceFilter
)
from pkpdapp.api.serializers import (
    InferenceSerializer,
    InferenceChainSerializer,
    AlgorithmSerializer,
)
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm, Dataset,
    DosedPharmacokineticModel, PharmacodynamicModel,
    SubjectGroup, BiomarkerType, LogLikelihoodParameter,
    LogLikelihood, Protocol, Project, Subject,
)


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]


class InferenceWizardView(views.APIView):
    """
    expecting data in the form:
    {

        # Inference parameters
        'id': 1
        'name': "my inference run",
        'project': 1,
        'algorithm': 2,
        'initialization_strategy': 'R',
        'initialization_inference': 2,
        'number_of_chains': 4,
        'max_number_of_iterations': 3000,
        'burn_in': 0,

        # Model
        'model': {
            'form': 'PK',
            'grouping': 'protocol' / 'subject'
            'id': 5
        }
        'dataset': 3,


        # Model parameters
        'parameters': [
            {
                'name': 'myokit.parameter1'
                'form': 'N',
                'pooled': False,
                'parameters': ['2 * biomarker[subject_weight]', 'parameter[parameter1_variance]']
            },
            {
                'name': 'parameter1_variance'
                'form': 'N',
                'parameters': [0, 1]
            },
            {
                'name': 'myokit.parameter2'
                'form': 'U',
                'parameters': [-1, 1]
            },
            {
                'name': 'myokit.parameter3'
                'form': 'F',
                'parameters': [123.5]
            },
        ]

        # output
        'observations': [
            {
                'model': 'myokit.plasma_concentration',
                'biomarker': 'concentration,
                'noise_form': 'N',
                'noise_param_form': 'N',
                'parameters': [0, 1]
            },
            {
                'model': 'myokit.bacteria_count',
                'biomarker': 'bacteria,
                'noise_form': 'LN',
                'noise_param_form': 'F'
                'parameters': [123.3]
            },
        ]
    }

    Uses model as the base model. If it is a PK or PKPD model and grouping is
    'protocol' or missing, creates a model for each protocol used in the
    dataset, replacing the protocol of the model with each new one. If the
    grouping is 'subject', creates a model for each subject in the dataset.

    This set of models has a set of parameters. If pooled is True or not given,
    then parameters of the same qname are assumed to be identical, if pooled is
    False, then each model is given a separate parameter. All Variable fields
    from the original model are copied over to the new models. Priors and fixed
    values for each parameter in this set are provided in 'parameters'.
    Distribution parameters for each prior can be provided using a python
    expression, or a number. If a python expression is used, the keywords
    Parameter[<param_name>] are used to refer to other parameters in the list.
    Additional parameters can be added to the list (parameters not in the
    model) to contruct hierarchical inference. You can refer to biomarkers in
    the expression using the keyword Biomarker[<biomarker_name>].

    The 'observations' field maps model output variables with biomarkers in the
    dataset


    """

    @staticmethod
    def _create_dosed_model(model, protocol, rename_model=False):
        model_copy = type(model).objects.get(id=model.id)
        original_name = model_copy.name
        model_copy.id = None
        model_copy.pk = None
        if rename_model:
            model_copy.name = original_name + '_' + protocol.name
        model_copy.protocol = protocol
        model_copy.save()
        stored_model = model_copy.create_stored_model()
        model_copy.delete()
        return stored_model

    @staticmethod
    def _create_subject_model(model, subject):
        model_copy = type(model).objects.get(id=model.id)
        original_name = model_copy.name
        model_copy.id = None
        model_copy.pk = None
        model_copy.name = (
            '{}_Subject{}'.format(original_name, subject.id_in_dataset)
        )
        model_copy.protocol = subject.protocol
        model_copy.save()
        stored_model = model_copy.create_stored_model()
        model_copy.delete()
        return stored_model

    @staticmethod
    def _create_sgroup_protocol(dataset, protocol):
        name = 'subject group for protocol {}'.format(protocol.name)
        try:
            group = SubjectGroup.objects.get(
                name=name, dataset=dataset
            )
        except SubjectGroup.DoesNotExist:
            group = SubjectGroup.objects.create(
                name=name, dataset=dataset
            )
            for s in protocol.subjects.all():
                s.groups.add(group)
        return group

    @staticmethod
    def _set_observed_loglikelihoods(obs, models, groups, dataset, inference):
        # create noise param models
        sigma_models = []
        for ob in obs:
            # create model
            sigma_form = ob['noise_param_form']
            parameters = ob['parameters']
            if sigma_form == LogLikelihood.Form.FIXED:
                ll = LogLikelihood.objects.create(
                    inference=inference,
                    name='sigma for ' + ob['model'],
                    form=sigma_form,
                    value=parameters[0]
                )
            else:
                ll = LogLikelihood.objects.create(
                    inference=inference,
                    name='sigma for ' + ob['model'],
                    form=sigma_form,
                )
                for p, v in zip(
                        ll.get_noise_log_likelihoods(),
                        parameters
                ):
                    p.value = v
                    p.save()

            sigma_models.append(ll)

        output_names = [ob['model'] for ob in obs]
        output_forms = [ob['noise_form'] for ob in obs]
        biomarkers = []
        for ob in obs:
            try:
                biomarker = BiomarkerType.objects.get(
                    name=ob['biomarker'], dataset=dataset
                )
            except BiomarkerType.DoesNotExist:
                biomarker = None
            biomarkers.append(biomarker)
        for model, group in zip(models, groups):
            # remove all outputs (and their parameters)
            # except those in output_names
            # and set the right biomarkers and subject groups
            for output in model.outputs.all():
                try:
                    index = output_names.index(output.variable.qname)
                except ValueError:
                    index = None
                if index is not None:
                    parent = output.parent
                    if group is not None:
                        parent.name = '{} ({})'.format(parent.name, group.name)
                    parent.biomarker_type = biomarkers[index]
                    parent.subject_group = group
                    parent.form = output_forms[index]
                    parent.save()

                    # remove sigma param and replace it with generated one
                    parent.get_noise_log_likelihoods()[1].delete()
                    param = LogLikelihoodParameter.objects.create(
                        parent=parent, child=sigma_models[index],
                        index=1, name='sigma for ' + output.variable.qname
                    )
                else:
                    for param in output.parent.parameters.all():
                        if param != output:
                            param.child.delete()
                    output.parent.delete()

    @staticmethod
    def _set_parameters(params, models, inference, dataset):
        pooled_params = {}
        params_names = [p['name'] for p in params]
        parser = ExpressionParser()
        for model in models:
            for model_param in model.parameters.all():
                # if we've already done this param, use the child
                if model_param.name in pooled_params:
                    # in pooled_params
                    old_child = model_param.child
                    model_param.child = pooled_params[model_param.name]
                    model_param.save()
                    old_child.delete()
                    continue

                # else we'll deal with it now
                # if the user has set a form for this param use it,
                # otherwise use the default
                try:
                    param_index = params_names.index(model_param.name)
                except ValueError:
                    param_index = None
                child = model_param.child
                if param_index is None:
                    pooled_params[model_param.name] = child
                else:
                    param_info = params[param_index]

                    InferenceWizardView.param_info_to_log_likelihood(
                        child, param_info, params, parser, dataset, inference
                    )

                    if param_info.get('pooled', True):
                        pooled_params[model_param.name] = model_param.child

    @staticmethod
    def param_info_to_log_likelihood(
            log_likelihood, param_info, params_info, parser, dataset, inference
    ):
        # deal with possible equations in noise params
        # if form is fixed and there is an equation, the child form
        # will be an equation
        # if form is a distribution, then the child form will be
        # that distribution, but if a parameter is given by an
        # equation its child will be an equation
        noise_params = param_info['parameters']
        param_form = param_info['form']
        log_likelihood.form = param_form
        if param_form == 'F' and isinstance(noise_params[0], str):
            InferenceWizardView.to_equation_log_likelihood(
                log_likelihood, noise_params[0], params_info, parser, dataset, inference
            )
        elif param_form == 'F':
            log_likelihood.value = noise_params[0]
        else:
            log_likelihood.value = None
        log_likelihood.save()
        for i, p in enumerate(log_likelihood.parameters.all()):
            if isinstance(noise_params[p.index], str):
                InferenceWizardView.to_equation_log_likelihood(
                    p.child, noise_params[p.index], params_info, parser,
                    dataset, inference
                )
            else:
                p.child.value = noise_params[p.index]
            p.child.save()

    @staticmethod
    def to_equation_log_likelihood(
            log_likelihood, eqn_str, params_info, parser, dataset, inference
    ):
        # set form to equation and remove existing children
        log_likelihood.children.clear()
        log_likelihood.form = 'E'

        params_in_eqn_str = parser.get_params(eqn_str)

        # replace parameters and biomarkers in equation string
        # with arg1, arg2 etc
        escape_regex = re.compile(r'/[.*+?^${}()|[\]\\]/g')
        for i, param in enumerate(params_in_eqn_str):
            param1_escaped = escape_regex.sub(r'\\$&', param[1])
            eqn_str = re.sub(
                r'{}\s*\(\s*"{}"\s*\)'.format(param[0], param1_escaped),
                r'arg{}'.format(i),
                eqn_str
            )
        log_likelihood.description = eqn_str
        log_likelihood.save()

        # create children using parameters and biomarkers
        for i, param in enumerate(params_in_eqn_str):
            if param[0] == 'parameter':
                param_info = [
                    p for p in params_info
                    if p['name'] == param[1]
                ][0]
                new_child = LogLikelihood.objects.create(
                    name=param_info['name'],
                    form=LogLikelihood.Form.FIXED,
                    inference=inference,
                    value=0.0
                )
                InferenceWizardView.param_info_to_log_likelihood(
                    new_child, param_info, params_info, parser, dataset, inference
                )

            elif param[0] == 'biomarker':
                biomarker_type = BiomarkerType.objects.get(
                    name=param[1], dataset=dataset
                )
                new_child = LogLikelihood.objects.create(
                    name=param[1],
                    form=LogLikelihood.Form.FIXED,
                    biomarker_type=biomarker_type,
                    inference=inference,
                )
            LogLikelihoodParameter.objects.create(
                parent=log_likelihood,
                child=new_child,
                index=i,
                name=param[1]
            )

    def post(self, request, format=None):
        errors = {}
        data = json.loads(request.body)
        print('got data', data)

        if 'project' in data:
            try:
                project = Project.objects.get(id=data['project'])
            except Project.DoesNotExist:
                errors['project'] = 'id {} not found'.format(data['project'])
        else:
            errors['project'] = 'field required'

        if 'algorithm' in data:
            try:
                algorithm = Algorithm.objects.get(id=data['algorithm'])
            except Algorithm.DoesNotExist:
                errors['algorithm'] = 'id {} not found'.format(
                    data['algorithm'])
        else:
            algorithm = None

        if 'dataset' in data:
            try:
                dataset = Dataset.objects.get(id=data['dataset'])
            except Dataset.DoesNotExist:
                errors['dataset'] = 'id {} not found'.format(data['dataset'])
        else:
            errors['dataset'] = 'field required'

        model_table = None
        model_id = None
        if 'model' in data:
            if 'form' in data['model']:
                if data['model']['form'] == 'PK':
                    model_table = DosedPharmacokineticModel
                else:
                    model_table = PharmacodynamicModel
            else:
                errors.get('model', {})['form'] = 'field required'
            if 'id' in data['model']:
                model_id = data['model']['id']
            else:
                errors.get('model', {})['id'] = 'field required'
            if 'grouping' in data['model']:
                valid_types = [
                    'protocol', 'subject'
                ]
                if not isinstance(data['model']['grouping'], str):
                    errors.get('model', {})['grouping'] = \
                        'grouping must be a string'
                elif data['type'] not in valid_types:
                    errors.get('model', {})['grouping'] = \
                        'grouping should be one of ' + valid_types
        else:
            errors['model'] = 'field required'

        if (
            model_table is not None and
            model_id is not None
        ):
            try:
                model = model_table.objects.get(id=model_id)
            except model_table.DoesNotExist:
                errors['model'] = '{} id {} not found'.format(
                    model_table, model_id
                )

        parameter_errors = []
        if 'parameters' in data:
            parser = ExpressionParser()
            param_names = [p['name'] for p in data['parameters']]
            for i, param in enumerate(data['parameters']):
                if model is None:
                    continue
                for j, dist_param in enumerate(param['parameters']):
                    if not isinstance(dist_param, (numbers.Number, str)):
                        parameter_errors.append((
                            (i, 'parameters', j),
                            'should be str or number'
                        ))
                    elif isinstance(dist_param, str):
                        try:
                            parser.parse(dist_param)
                            params = parser.get_params(dist_param)
                            for param in params:
                                if (
                                    param[0] == 'parameter' and
                                    param[1] not in param_names
                                ):
                                    parameter_errors.append((
                                        (i, 'parameters', j),
                                        '{} not in list of parameters'
                                        .format(param[1])
                                    ))
                                elif (
                                    param[0] == 'biomarker' and
                                    dataset.biomarker_types.filter(
                                        name=param[1]
                                    ).count() == 0
                                ):
                                    parameter_errors.append((
                                        (i, 'parameters', j),
                                        '{} not in list of biomarkers'
                                        .format(param[1])
                                    ))
                        except ParseException as pe:
                            parameter_errors.append((
                                (i, 'parameters', j), str(pe)
                            ))
        else:
            errors['parameters'] = 'field required'

        # fill out the errors with the parameter errors
        for p in parameter_errors:
            this_error = errors.get('parameters')
            if this_error is None:
                errors['parameters'] = {}
                this_error = errors['parameters']
            for index in p[0][:-1]:
                new_error = this_error.get(index)
                if new_error is None:
                    this_error[index] = {}
                    this_error = this_error[index]
                else:
                    this_error = new_error
            this_error[p[0][-1]] = p[1]

        if 'observations' in data:
            for i, obs in enumerate(data['observations']):
                model_var = obs['model']
                biomarker = obs['biomarker']
                if dataset is not None and biomarker:
                    if dataset.biomarker_types.filter(
                        name=biomarker
                    ).count() == 0:
                        base_error = errors.get('observations', None)
                        if base_error is None:
                            errors['observations'] = {}
                            base_error = errors['observations']
                        error = base_error.get(i, None)
                        if error is None:
                            base_error[i] = {}
                            error = base_error[i]
                        error['biomarker'] = 'not found in dataset'
                if model is not None:
                    if model.variables.filter(qname=model_var).count() == 0:
                        base_error = errors.get('observations', None)
                        if base_error is None:
                            errors['observations'] = {}
                            base_error = errors['observations']
                        error = base_error.get(i, None)
                        if error is None:
                            base_error[i] = {}
                            error = base_error[i]
                        error['model'] = 'not found in model'
        else:
            errors['observations'] = 'field required'

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        grouping = data['model'].get('grouping', 'protocol')
        if grouping == 'protocol':
            # create necessary models, one for each protocol
            # create subject groups so we can refer to the subjects
            # belonging to each protocol
            protocols = [
                Protocol.objects.get(pk=p['protocol'])
                for p in dataset.subjects.values('protocol').distinct()
                if p['protocol'] is not None
            ]
            rename_models = len(protocols) > 1
            if len(protocols) == 0 or data['model']['form'] == 'PD':
                models = [model.create_stored_model()]
                subject_groups = [None]
            else:
                models = [
                    self._create_dosed_model(
                        model, p, rename_model=rename_models)
                    for p in protocols
                ]
                subject_groups = [
                    self._create_sgroup_protocol(dataset, p) for p in protocols
                ]
        else:
            # create necessary models, one for each subject
            subjects = dataset.subjects.all()
            models = [
                self._create_subject_model(model, s) for s in subjects
            ]

        # start creating inference object
        initialization_inference = data.get('initialization_inference')
        if initialization_inference is not None:
            initialization_inference = Inference.objects.get(
                id=initialization_inference
            )

        if 'id' in data:
            inference = Inference.objects.get(id=data['id'])
            inference.reset()
            inference.name = data.get('name')
            inference.project = project
            inference.algorithm = algorithm
            inference.initialization_strategy = \
                data.get('initialization_strategy')
            inference.initialization_inference = initialization_inference
            inference.number_of_chains = data.get('number_of_chains')
            inference.max_number_of_iterations = \
                data.get('max_number_of_iterations')
            inference.burn_in = data.get('burn_in')
            inference.read_only = True
        else:
            inference = Inference.objects.create(
                name=data.get('name'),
                project=project,
                algorithm=algorithm,
                initialization_strategy=data.get('initialization_strategy'),
                initialization_inference=initialization_inference,
                number_of_chains=data.get('number_of_chains'),
                max_number_of_iterations=data.get('max_number_of_iterations'),
                burn_in=data.get('burn_in'),
                read_only=True
            )
            data['id'] = inference.id

        inference.metadata = data
        inference.save()

        model_loglikelihoods = [
            LogLikelihood.objects.create(
                variable=m.variables.first(),
                inference=inference,
                form=LogLikelihood.Form.MODEL
            ) for m in models
        ]

        self._set_observed_loglikelihoods(
            data['observations'], model_loglikelihoods, subject_groups,
            dataset, inference
        )

        self._set_parameters(
            data['parameters'], model_loglikelihoods, inference, dataset
        )

        inference.run_inference()

        return Response(InferenceSerializer(inference).data)


class InferenceOperationView(views.APIView):
    def op(self, inference):
        raise NotImplementedError

    def post(self, request, pk, format=None):
        try:
            inference = Inference.objects.get(pk=pk)
        except Inference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        errors = {}
        if inference.log_likelihoods.count() == 0:
            errors['log_likelihoods'] = (
                'Inference must have at least one log_likelihood'
            )
        ll_names = [
            ll.name for ll in inference.log_likelihoods.all()
        ]
        if len(set(ll_names)) < len(ll_names):
            errors['log_likelihoods'] = (
                'inference has log-likelihoods '
                'with identical names! {}'
            ).format(ll_names)

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        self.op(inference)

        return Response(InferenceSerializer(inference).data)


class StopInferenceView(InferenceOperationView):
    def op(self, inference):
        return inference.stop_inference()


class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
