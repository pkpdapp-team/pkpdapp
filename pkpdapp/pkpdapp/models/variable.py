#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
import myokit
from pkpdapp.models import (
    Unit, DosedPharmacokineticModel,
    PharmacokineticModel, PharmacodynamicModel,
    StoredPharmacodynamicModel,
    StoredDosedPharmacokineticModel,
)


class BaseVariable(models.Model):
    """
    An abstract base class for variable.
    """
    is_public = models.BooleanField(default=False)
    lower_bound = models.FloatField(
        default=1e-6,
        help_text='lowest possible value for this variable'
    )
    upper_bound = models.FloatField(
        default=2,
        help_text='largest possible value for this variable'
    )
    default_value = models.FloatField(
        default=1,
        help_text='default value for this variable'
    )

    name = models.CharField(max_length=20, help_text='name of the variable')
    qname = models.CharField(
        max_length=100, help_text='fully qualitifed name of the variable')

    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        help_text=(
            'variable values are in this unit '
            '(note this might be different from the unit '
            'in the stored sbml)'
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
        help_text='True for a state variable of the model (default is False)'
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

    class Scale(models.TextChoices):
        LINEAR = 'LN', 'Linear'
        LOG = 'LG', 'Log'

    scale = models.CharField(
        max_length=2,
        choices=Scale.choices,
        default=Scale.LINEAR,
    )

    class Meta:
        abstract = True
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(scale='LG') & Q(lower_bound__gt=0)) |
                    Q(scale='LN')
                ),
                name=(
                    '%(class)s: log scale must have a lower '
                    'bound greater than zero'
                )
            )
        ]

    def get_project(self):
        if self.pd_model:
            return self.pd_model.get_project()
        elif self.dosed_pk_model:
            return self.dosed_pk_model.get_project()
        elif self.pkpd_model:
            return self.pkpd_model.get_project()
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
            myokit_variable, variables
        )
        if found_variable is not None:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                constant=myokit_variable.is_constant(),
                state=myokit_variable.is_state(),
                unit=Unit.get_unit_from_variable(myokit_variable),
                pk_model=model,
                color=num_variables,
                display=myokit_variable.name() != 'time',
            )

    @staticmethod
    def _find_close_variable(myokit_variable, variables):
        found = None
        for i, v in enumerate(variables):
            if myokit.Unit.close(
                    v.unit.get_myokit_unit(),
                    myokit_variable.unit()
            ):
                found = i
        if found is not None:
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
        found_variable = Variable._find_close_variable(
            myokit_variable, variables
        )
        if found_variable is not None:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                constant=myokit_variable.is_constant(),
                state=myokit_variable.is_state(),
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
        found_variable = Variable._find_close_variable(
            myokit_variable, variables
        )
        if found_variable is not None:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                constant=myokit_variable.is_constant(),
                state=myokit_variable.is_state(),
                unit=Unit.get_unit_from_variable(myokit_variable),
                dosed_pk_model=model,
                color=num_variables,
                display=myokit_variable.name() != 'time',
            )

    @staticmethod
    def get_variable(model, myokit_variable):
        if isinstance(model, PharmacokineticModel):
            return Variable.get_variable_pk(model, myokit_variable)
        elif isinstance(model, DosedPharmacokineticModel):
            return Variable.get_variable_dosed_pk(model, myokit_variable)
        elif isinstance(model, PharmacodynamicModel):
            return Variable.get_variable_pd(model, myokit_variable)
        else:
            raise RuntimeError(
                'create_variable got unexpected model type {}'
                .format(type(model)),
            )


class Variable(BaseVariable):
    """
    A single variable for a mechanistic model.
    """

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
        DosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='variables',
        help_text='dosed pharmacokinetic model'
    )

    class Meta:
        constraints = [
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
            ),
        ]


class StoredVariable(BaseVariable):
    pd_model = models.ForeignKey(
        StoredPharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='stored_variables',
        help_text='pharmacodynamic model'
    )
    dosed_pk_model = models.ForeignKey(
        StoredDosedPharmacokineticModel,
        blank=True, null=True,
        related_name='stored_variables',
        on_delete=models.CASCADE,
        help_text='dosed pharmacokinetic model'
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(dosed_pk_model__isnull=True) &
                     Q(pd_model__isnull=False)) |
                    (Q(dosed_pk_model__isnull=False) &
                     Q(pd_model__isnull=True))
                ),
                name='%(class)s: stored variable must belong to a model'
            ),
        ]
