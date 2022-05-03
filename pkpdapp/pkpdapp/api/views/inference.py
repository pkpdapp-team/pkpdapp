#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, views, status
from rest_framework.response import Response
import json
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
    Variable, SubjectGroup, BiomarkerType, LogLikelihoodParameter,
    LogLikelihood, Protocol, Project
)


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]


class NaivePooledInferenceView(views.APIView):
    """
    expecting data in the form:
    {
        # Inference parameters
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
            'id': 5
        }
        'dataset': 3,

        # Model parameters
        'parameters': [
            {
                'name': 'myokit.parameter1'
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
            }
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

    Uses model as the base model. If it is a PK or PKPD model, creates a model
    for each protocol used in the dataset, replacing the protocol of the model
    with each new one.

    This set of models has a set of parameters, and parameters of the same
    qname are assumed to be identical. All Variable fields from the original
    model are copied over to the new models. Priors and fixed values for each
    parameter in this set are provided in 'parameters'.

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
    def _create_sgroup_protocol(dataset, protocol):
        name = 'auto-group for protocol {}'.format(protocol.id)
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
                        parent.name = parent.name + '_' + group.name
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
    def _set_parameters(params, models, inference):
        pooled_params = {}
        params_names = [p['name'] for p in params]
        for model in models:
            for model_param in model.parameters.all():
                # if we've already done this param, use the child
                # in pooled_params
                if model_param.name in pooled_params:
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
                if param_index is None:
                    child = model_param.child
                else:
                    param = params[param_index]
                    param_form = param['form']
                    noise_params = param['parameters']

                    child = model_param.child
                    child.form = param_form
                    if param_form == 'F':
                        child.value = noise_params[0]
                    else:
                        child.value = None
                    child.save()
                    for i, p in enumerate(child.parameters.all()):
                        p.child.value = noise_params[p.index]
                        p.child.save()

                pooled_params[model_param.name] = child


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

        if 'parameters' in data:
            for i, param in enumerate(data['parameters']):
                if model is None:
                    continue
                if model.variables.filter(qname=param['name']).count() == 0:
                    base_error = errors.get('parameters', None)
                    if base_error is None:
                        errors['parameters'] = {}
                        base_error = errors['parameters']
                    error = base_error.get(i)
                    if error is None:
                        base_error[i] = {}
                        error = base_error[i]
                    error['name'] = 'not found in model'
        else:
            errors['parameters'] = 'field required'

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
                self._create_dosed_model(model, p, rename_model=rename_models)
                for p in protocols
            ]
            subject_groups = [
                self._create_sgroup_protocol(dataset, p) for p in protocols
            ]

        # start creating inference object
        inference = Inference.objects.create(
            name=data.get('name'),
            project=project,
            algorithm=algorithm,
            initialization_strategy=data.get('initialization_strategy'),
            initialization_inference=data.get('initialization_inference'),
            number_of_chains=data.get('number_of_chains'),
            max_number_of_iterations=data.get('max_number_of_iterations'),
            burn_in=data.get('burn_in'),
            read_only=True
        )

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
            data['parameters'], model_loglikelihoods, inference
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
        for log_likelihood in inference.log_likelihoods.all():
            model = log_likelihood.get_model()
            if model is None:
                errors['log_likelihoods'] = 'LogLikelihood must have a model'

            if len(log_likelihood.get_priors()) == 0:
                errors['log_likelihoods'] = (
                    'LogLikelihood must have at least one prior'
                )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        self.op(inference)

        return Response(InferenceSerializer(inference).data)


class RunInferenceView(InferenceOperationView):
    def op(self, inference):
        return inference.run_inference()


class StopInferenceView(InferenceOperationView):
    def op(self, inference):
        return inference.stop_inference()


class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
