#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import StoredModel


class DerivedVariable(StoredModel):
    pkpd_model = models.ForeignKey(
        "CombinedModel",
        on_delete=models.CASCADE,
        related_name="derived_variables",
        help_text="PKPD model that this derived variable is for",
    )
    pk_variable = models.ForeignKey(
        "Variable",
        on_delete=models.CASCADE,
        related_name="derived_variables",
        help_text="base variable",
    )

    secondary_variable = models.ForeignKey(
        "Variable",
        on_delete=models.CASCADE,
        related_name="secondary_derived_variables",
        help_text="secondary variable",
        blank=True,
        null=True,
    )

    covariate = models.ForeignKey(
        "Covariate",
        on_delete=models.CASCADE,
        related_name="derived_variables",
        help_text="custom covariate (CUSTOM_CONT/CUSTOM_CAT covariate types only)",
        blank=True,
        null=True,
    )

    class Type(models.TextChoices):
        AREA_UNDER_CURVE = "AUC", "area under curve"
        RECEPTOR_OCCUPANCY = "RO", "receptor occupancy"
        FRACTION_UNBOUND_PLASMA = "FUP", "fraction unbound plasma"
        BLOOD_PLASMA_RATIO = "BPR", "blood plasma ratio"
        TLAG = "TLG", "dosing lag time"
        MICHAELIS_MENTEN = "MM", "Michaelis-Menten"
        EXTENDED_MICHAELIS_MENTEN = "EMM", "Extended Michaelis-Menten"
        EMAX = "EMX", "Emax"
        IMAX = "IMX", "Imax"
        TIME_EMAX = "TEM", "Time Emax"
        TIME_IMAX = "TIM", "Time Imax"
        POWER = "POW", "Power"
        NEGATIVE_POWER = "NPW", "Negative Power"
        EXP_DECAY = "TDI", "Exponential Decay"
        EXP_INCREASE = "IND", "Exponential Increase"
        WEIGHT_COVARIATE = "WTC", "Weight covariate"
        AGE_COVARIATE = "AGC", "Age covariate"
        SEX_COVARIATE = "SXC", "Sex covariate"
        CUSTOM_CONT_COVARIATE = "CCC", "Custom continuous covariate"
        CUSTOM_CAT_COVARIATE = "CCT", "Custom categorical covariate"

    #: covariate types, whose builders live in utils/covariate_effects.py
    COVARIATE_TYPES = frozenset(
        {
            Type.WEIGHT_COVARIATE,
            Type.AGE_COVARIATE,
            Type.SEX_COVARIATE,
            Type.CUSTOM_CONT_COVARIATE,
            Type.CUSTOM_CAT_COVARIATE,
        }
    )

    type = models.CharField(
        max_length=3,
        choices=Type.choices,
        help_text="type of derived variable"
    )

    __original_pk_variable = None
    __original_type = None
    __original_covariate_id = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_variable = self.pk_variable
        self.__original_type = self.type
        self.__original_covariate_id = self.covariate_id

    def is_covariate(self):
        return self.type in self.COVARIATE_TYPES

    def get_covariate(self):
        """Return the :class:`Covariate` this derived variable samples.

        Custom covariate types return their stored ``covariate`` row; the
        built-in types return an ephemeral (unsaved) ``Covariate`` carrying the
        matching ``builtin`` kind so the sampling logic has a single home.
        """
        from pkpdapp.models import Covariate

        if self.covariate_id:
            return self.covariate
        builtins = {
            self.Type.WEIGHT_COVARIATE: (
                "weight",
                Covariate.Type.CONTINUOUS,
                Covariate.Builtin.WEIGHT,
                None,
            ),
            self.Type.AGE_COVARIATE: (
                "age",
                Covariate.Type.CONTINUOUS,
                Covariate.Builtin.AGE,
                None,
            ),
            self.Type.SEX_COVARIATE: (
                "sex",
                Covariate.Type.CATEGORICAL,
                Covariate.Builtin.SEX,
                2,
            ),
        }
        spec = builtins.get(self.type)
        if spec is None:
            return None
        name, cov_type, builtin, n_categories = spec
        return Covariate(
            name=name, type=cov_type, builtin=builtin, n_categories=n_categories
        )

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(
            *args,
            force_insert=force_insert,
            force_update=force_update,
            **kwargs
        )

        # don't update a stored model
        if self.read_only:
            return

        changed = (
            created
            or self.pk_variable != self.__original_pk_variable
            or self.type != self.__original_type
            or self.covariate_id != self.__original_covariate_id
        )
        if changed:
            self.pkpd_model.update_model()

        self.__original_pk_variable = self.pk_variable
        self.__original_type = self.type
        self.__original_covariate_id = self.covariate_id

    def delete(self):
        pkpd_model = self.pkpd_model
        super().delete()
        pkpd_model.update_model()

    def copy(self, new_pkpd_model, new_variables, covariate_map=None):
        new_pk_variable = new_variables[self.pk_variable.qname]
        new_secondary_variable = (
            new_variables[self.secondary_variable.qname]
            if self.secondary_variable
            else None
        )
        stored_kwargs = {
            "pkpd_model": new_pkpd_model,
            "pk_variable": new_pk_variable,
            "secondary_variable": new_secondary_variable,
            "covariate": (
                covariate_map[self.covariate_id]
                if self.covariate_id and covariate_map is not None
                else self.covariate
            ),
            "read_only": self.read_only,
            "type": self.type,
        }
        stored_mapping = DerivedVariable.objects.create(**stored_kwargs)
        return stored_mapping
