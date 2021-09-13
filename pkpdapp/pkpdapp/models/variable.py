#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Unit, DosedPharmacokineticModel,
    PharmacokineticModel, PharmacodynamicModel,
)
from django.db.models import Q


class Variable(models.Model):
    """
    A single variable for a mechanistic model.
    """

    name = models.CharField(max_length=20, help_text='name of the variable')
    qname = models.CharField(max_length=20, help_text='fully qualitifed name of the variable')
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
    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        help_text=(
            'variable values are in this unit'
        )
    )
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

    class Scale(models.TextChoices):
        LINEAR = 'LN', 'Linear'
        LOG = 'LG', 'Log'

    scale = models.CharField(
        max_length=2,
        choices=Scale.choices,
        default=Scale.LINEAR,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(pk_model__isnull=True) &
                     Q(dosed_pk_model__isnull=True) &
                     Q(pd_model__isnull=False)) |
                    (Q(pk_model__isnull=True) &
                     Q(dosed_pk_model__isnull=True) &
                     Q(pd_model__isnull=False)) |
                    (Q(pk_model__isnull=True) &
                     Q(dosed_pk_model__isnull=False) &
                     Q(pd_model__isnull=True))
                ),
                name='variable must belong to a model'
            ),
            models.CheckConstraint(
                check=(
                    (Q(scale='LG') & Q(lower_bound__gt=0)) |
                    Q(scale='LN')
                ),
                name='log scale must have a lower bound greater than zero'
            )
        ]


    @staticmethod
    def get_variable_pk(model, myokit_variable):
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            pk_model=model,
        )
        if variables.count() > 0:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                unit=Unit.get_unit_from_variable(myokit_variable),
                pk_model=model,
            )


    @staticmethod
    def get_variable_pd(model, myokit_variable):
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            pd_model=model,
        )
        if variables.count() > 0:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                unit=Unit.get_unit_from_variable(myokit_variable),
                pd_model=model,
            )

    @staticmethod
    def get_variable_dosed_pk(model, myokit_variable):
        variables = Variable.objects.filter(
            qname=myokit_variable.qname(),
            dosed_pk_model=model,
        )
        if variables.count() > 0:
            return variables[0]
        else:
            return Variable.objects.create(
                name=myokit_variable.name(),
                qname=myokit_variable.qname(),
                unit=Unit.get_unit_from_variable(myokit_variable),
                dosed_pk_model=model,
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



