#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import (
    Unit, CombinedModel,
    PharmacokineticModel, PharmacodynamicModel,
    StoredModel, Protocol,
)
import numpy as np
from django.db.models import Q
from django.db import models
import logging
logger = logging.getLogger(__name__)


class Variable(StoredModel):
    """
    A single variable for a mechanistic model.
    """
    is_public = models.BooleanField(default=False)
    lower_bound = models.FloatField(
        blank=True, null=True,
        help_text='lowest possible value for this variable'
    )
    upper_bound = models.FloatField(
        blank=True, null=True,
        help_text='largest possible value for this variable'
    )
    default_value = models.FloatField(
        default=1,
        help_text='default value for this variable'
    )

    is_log = models.BooleanField(
        default=False,
        help_text=(
            'True if default_value is stored as '
            'the log of this value'
        )
    )

    name = models.CharField(max_length=100, help_text='name of the variable')
    description = models.TextField(
        blank=True, null=True,
        help_text='description of the variable'
    )
    binding = models.CharField(
        max_length=100,
        help_text='myokit binding of the variable (e.g. time)',
        blank=True, null=True,
    )

    qname = models.CharField(
        max_length=200, help_text='fully qualitifed name of the variable')

    unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        blank=True, null=True,
        help_text=(
            'variable values are in this unit '
            '(note this might be different from the unit '
            'in the stored sbml)'
        )
    )

    unit_symbol = models.CharField(
        max_length=20, blank=True, null=True,
        help_text=(
            'if unit is None then this is the unit of this '
            'variable as a string'
        )
    )

    constant = models.BooleanField(
        default=True,
        help_text=(
            'True for a constant variable of the model, '
            'i.e. a parameter. False if non-constant, '
            'i.e. an output of the model (default is True)'
        )
    )
    state = models.BooleanField(
        default=False,
        help_text=(
            'True if it is a state variable of the model '
            'and has an initial condition parameter '
            '(default is False)'
        )
    )

    color = models.IntegerField(
        default=0,
        help_text=(
            'Color index associated with this variable. '
            'For display purposes in the frontend'
        )
    )
    display = models.BooleanField(
        default=True,
        help_text=(
            'True if this variable will be displayed in the '
            'frontend, False otherwise'
        )
    )
    axis = models.BooleanField(
        default=False,
        help_text=(
            'False/True if biomarker type displayed on LHS/RHS axis'
        )
    )

    pd_model = models.ForeignKey(
        PharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='variables',
        help_text='pharmacodynamic model'
    )
    pk_model = models.ForeignKey(
        PharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='variables',
        help_text='pharmacokinetic model'
    )
    dosed_pk_model = models.ForeignKey(
        CombinedModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='variables',
        help_text='dosed pharmacokinetic model'
    )

    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.SET_NULL,
        related_name='variables',
        blank=True, null=True,
        help_text='dosing protocol'
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(is_log=True) & Q(lower_bound__gt=0)) |
                    Q(is_log=False)
                ),
                name=(
                    '%(class)s: log scale must have a lower '
                    'bound greater than zero'
                )
            ),
            models.CheckConstraint(
                check=(
                    (Q(pk_model__isnull=True) &
                     Q(dosed_pk_model__isnull=True) &
                     Q(pd_model__isnull=False)) |
                    (Q(pk_model__isnull=False) &
                     Q(dosed_pk_model__isnull=True) &
                     Q(pd_model__isnull=True)) |
                    (Q(pk_model__isnull=True) &
                     Q(dosed_pk_model__isnull=False) &
                     Q(pd_model__isnull=True))
                ),
                name='%(class)s: variable must belong to a model'
            )
        ]

    def get_model(self):
        model = None
        if self.pd_model:
            model = self.pd_model
        if self.dosed_pk_model:
            model = self.dosed_pk_model
        if self.pk_model:
            model = self.pk_model
        return model

    def get_default_value(self):
        if self.is_log:
            return np.exp(self.default_value)
        else:
            return self.default_value

    def get_project(self):
        model = self.get_model()
        if model is not None:
            return model.get_project()
        else:
            return None

    @staticmethod
    def get_variable_pk(model, myokit_variable):
        num_variables = Variable.objects.filter(
            pk_model=model,
        ).count()
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            pk_model=model,
        )
        found_variable = Variable._find_close_variable(
            myokit_variable, variables,
            compound=model.get_project().compound
        )
        if found_variable is not None:
            return variables[0]
        else:
            state = myokit_variable.is_state()
            if state:
                value = myokit_variable.state_value()
            else:
                value = myokit_variable.value()
            qname = myokit_variable.qname()
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=qname,
                default_value=value,
                description=myokit_variable.meta.get('desc', ''),
                binding=myokit_variable.binding(),
                lower_bound=None,
                upper_bound=None,
                constant=myokit_variable.is_constant(),
                state=state,
                unit=Unit.get_unit_from_variable(myokit_variable),
                pk_model=model,
                color=num_variables,
                display=myokit_variable.name() != 'time',
            )

    @staticmethod
    def _find_close_variable(myokit_variable, variables, compound=None):
        logger.debug('Looking for variable: {} [{}]'.format(
            myokit_variable, myokit_variable.unit()
        ))
        found = None
        for i, v in enumerate(variables):
            # todo check if units are compatible...
            if v.unit is None:
                logger.debug('\tchecking variable: {}'.format(v.qname))
            else:
                logger.debug('\tchecking variable: {} [{}]'.format(
                    v.qname, v.unit.symbol
                ))
            if v.unit is None:
                if myokit_variable.unit() is None:
                    found = i
            elif (
                myokit_variable.unit() is not None and
                v.unit.is_convertible_to(
                    myokit_variable.unit(), compound=compound
                )
            ):
                found = i
        if found is not None:
            logger.debug('Found variable: {}'.format(variables[found]))
            return variables[found]
        return None

    @staticmethod
    def get_variable_pd(model, myokit_variable):
        num_variables = Variable.objects.filter(
            pd_model=model,
        ).count()
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            pd_model=model,
        )
        project = model.get_project()
        compound = None
        if project is not None:
            compound = project.compound
        found_variable = Variable._find_close_variable(
            myokit_variable, variables,
            compound=compound
        )
        if found_variable is not None:
            return variables[0]
        else:
            state = myokit_variable.is_state()
            if state:
                value = myokit_variable.state_value()
            else:
                value = myokit_variable.value()
            qname = myokit_variable.qname()
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=qname,
                description=myokit_variable.meta.get('desc', ''),
                constant=myokit_variable.is_constant(),
                binding=myokit_variable.binding(),
                default_value=value,
                lower_bound=None,
                upper_bound=None,
                state=state,
                unit=Unit.get_unit_from_variable(myokit_variable),
                pd_model=model,
                color=num_variables,
                display=myokit_variable.name() != 'time',
            )

    @staticmethod
    def get_variable_dosed_pk(model, myokit_variable):
        num_variables = Variable.objects.filter(
            dosed_pk_model=model,
        ).count()
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            dosed_pk_model=model,
        )
        compound = None
        project = model.get_project()
        if project is not None:
            compound = project.compound
        found_variable = Variable._find_close_variable(
            myokit_variable, variables,
            compound=compound
        )
        if found_variable is not None:
            return variables[0]
        else:
            # lower and upper bounds for library models
            lower = None
            upper = None
            if myokit_variable.qname() == 'PDCompartment.Imax':
                upper = 1.0
            elif myokit_variable.qname() == 'PKCompartment.F':
                upper = 1.0
            state = myokit_variable.is_state()
            if state:
                value = myokit_variable.state_value()
            else:
                value = myokit_variable.value()
            qname = myokit_variable.qname()
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=qname,
                description=myokit_variable.meta.get('desc', ''),
                constant=myokit_variable.is_constant(),
                default_value=value,
                binding=myokit_variable.binding(),
                lower_bound=lower,
                upper_bound=upper,
                state=state,
                unit=Unit.get_unit_from_variable(myokit_variable),
                dosed_pk_model=model,
                color=num_variables,
                display=myokit_variable.name() != 'time',
            )

    @staticmethod
    def get_variable(model, myokit_variable):
        if isinstance(model, PharmacokineticModel):
            return Variable.get_variable_pk(model, myokit_variable)
        elif isinstance(model, CombinedModel):
            return Variable.get_variable_dosed_pk(model, myokit_variable)
        elif isinstance(model, PharmacodynamicModel):
            return Variable.get_variable_pd(model, myokit_variable)
        else:
            raise RuntimeError(
                'create_variable got unexpected model type {}'
                .format(type(model)),
            )

    def create_stored_variable(self, stored_model):
        stored_variable_kwargs = {
            'name': self.name,
            'qname': self.qname,
            'description': self.description,
            'unit': self.unit,
            'is_public': self.is_public,
            'binding': self.binding,
            'lower_bound': self.lower_bound,
            'upper_bound': self.upper_bound,
            'default_value': self.default_value,
            'is_log': self.is_log,
            'axis': self.axis,
            'display': self.display,
            'color': self.color,
            'state': self.state,
            'unit_symbol': self.unit_symbol,
            'constant': self.constant,
            'read_only': True,
            'protocol': (
                self.protocol.create_stored_protocol()
                if self.protocol is not None else None
            ),
        }
        if isinstance(stored_model, PharmacodynamicModel):
            stored_variable_kwargs['pd_model'] = stored_model
        elif isinstance(stored_model, CombinedModel):
            stored_variable_kwargs['dosed_pk_model'] = stored_model
        return Variable.objects.create(**stored_variable_kwargs)
