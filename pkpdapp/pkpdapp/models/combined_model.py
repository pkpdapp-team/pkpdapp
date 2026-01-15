#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.models import (
    MyokitModelMixin,
    Project,
    StoredModel,
    PharmacodynamicModel,
    PharmacokineticModel,
    Unit,
    DerivedVariable,
)
import myokit
from django.db import models
from django.urls import reverse
import logging
from pkpdapp.utils.default_params import defaults
from pkpdapp.utils.derived_variables import (
    add_pk_variable,
    add_pd_variable,
)

logger = logging.getLogger(__name__)


def get_default_effect_model():
    try:
        return PharmacokineticModel.objects.get(name="Effect compartment model")
    except PharmacokineticModel.DoesNotExist:
        return None


class CombinedModel(MyokitModelMixin, StoredModel):
    """
    PK model plus dosing and protocol information
    """

    name = models.CharField(max_length=100, help_text="name of the model")
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="pk_models",
        blank=True,
        null=True,
        help_text='Project that "owns" this model',
    )

    class SpeciesType(models.TextChoices):
        HUMAN = "H", "human"
        RAT = "R", "rat"
        NHP = "N", "non-human primate"
        MOUSE = "M", "mouse"

    species = models.CharField(
        max_length=1,
        choices=SpeciesType.choices,
        default=SpeciesType.HUMAN,
        help_text="species",
    )

    pk_model = models.ForeignKey(
        PharmacokineticModel,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        help_text="model",
    )

    pk_model2 = models.ForeignKey(
        PharmacokineticModel,
        related_name="pkpd_models2",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        help_text="extravascular model",
    )

    pk_effect_model = models.ForeignKey(
        PharmacokineticModel,
        related_name="pkpd_effect_models",
        on_delete=models.PROTECT,
        help_text="effect compartment model",
        default=get_default_effect_model,
    )

    has_saturation = models.BooleanField(
        default=False, help_text="whether the pk model has saturation"
    )
    has_extravascular = models.BooleanField(
        default=False, help_text="whether the pk model has extravascular model"
    )
    has_effect = models.BooleanField(
        default=False, help_text="whether the pk model has effect compartment"
    )
    number_of_effect_compartments = models.IntegerField(
        default=0, help_text="number of effect compartments"
    )
    has_lag = models.BooleanField(
        default=False, help_text="whether the pk model has lag"
    )

    has_anti_drug_antibodies = models.BooleanField(
        default=False, help_text="whether the pk model has anti-drug antibodies"
    )

    has_bioavailability = models.BooleanField(
        default=False, help_text="whether the pk model has bioavailability"
    )

    pd_model = models.ForeignKey(
        PharmacodynamicModel,
        on_delete=models.PROTECT,
        related_name="pkpd_models",
        blank=True,
        null=True,
        help_text="PD part of model",
    )

    has_hill_coefficient = models.BooleanField(
        default=False, help_text="whether the pd model has hill coefficient"
    )

    pd_model2 = models.ForeignKey(
        PharmacodynamicModel,
        on_delete=models.PROTECT,
        related_name="pkpd_models2",
        blank=True,
        null=True,
        help_text="second PD part of model",
    )

    time_max = models.FloatField(
        default=30,
        help_text=(
            "suggested time to simulate after the last dose (in the time "
            "units specified by the mmt model)"
        ),
    )
    __original_pk_model = None
    __original_pk_model2 = None
    __original_pk_effect_model = None
    __original_pd_model = None
    __original_pd_model2 = None
    __original_has_saturation = None
    __original_has_effect = None
    __original_has_lag = None
    __original_has_hill_coefficient = None
    __original_has_bioavailability = None
    __original_number_of_effect_compartments = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        # fix for infinite recursion when deleting project
        if "pk_model_id" in field_names:
            instance.__original_pk_model = instance.pk_model
        if "pk_model2_id" in field_names:
            instance.__original_pk_model2 = instance.pk_model2
        if "pk_effect_model_id" in field_names:
            instance.__original_pk_effect_model = instance.pk_effect_model
        if "pd_model_id" in field_names:
            instance.__original_pd_model = instance.pd_model
        if "pd_model2_id" in field_names:
            instance.__original_pd_model2 = instance.pd_model2
        if "has_saturation" in field_names:
            instance.__original_has_saturation = instance.has_saturation
        if "has_effect" in field_names:
            instance.__original_has_effect = instance.has_effect
        if "has_lag" in field_names:
            instance.__original_has_lag = instance.has_lag
        if "has_bioavailability" in field_names:
            instance.__original_has_bioavailability = instance.has_bioavailability
        if "has_hill_coefficient" in field_names:
            instance.__original_has_hill_coefficient = instance.has_hill_coefficient
        if "number_of_effect_compartments" in field_names:
            instance.__original_number_of_effect_compartments = (
                instance.number_of_effect_compartments
            )
        return instance

    def get_project(self):
        return self.project

    @property
    def is_library_model(self):
        is_library_model = False
        if self.pk_model:
            is_library_model = self.pk_model.is_library_model
        return is_library_model

    def get_time_max(self):
        time_max = self.time_max
        if self.pd_model:
            time_max = max(time_max, self.pd_model.time_max)
        return time_max

    def get_time_unit(self):
        from pkpdapp.models import Variable

        try:
            time_var = self.variables.get(binding="time")
            return time_var.unit
        except Variable.DoesNotExist:
            return None

    def get_mmt(self):
        myokit_model = self.get_myokit_model()
        return myokit_model.code()

    def get_sbml(self):
        sbml_model = myokit.formats.sbml.Model.from_myokit_model(
            self.get_myokit_model()
        )
        sbml_writer = myokit.formats.sbml.SBMLWriter()
        return sbml_writer.write_string(sbml_model)

    def copy(self, project):
        stored_model_kwargs = {
            "name": self.name,
            "project": project,
            "pk_model": self.pk_model,
            "pd_model": self.pd_model,
            "time_max": self.time_max,
            "read_only": self.read_only,
            "has_saturation": self.has_saturation,
            "has_effect": self.has_effect,
            "has_lag": self.has_lag,
            "has_bioavailability": self.has_bioavailability,
            "has_hill_coefficient": self.has_hill_coefficient,
            "species": self.species,
            "pd_model2": self.pd_model2,
            "number_of_effect_compartments": self.number_of_effect_compartments,
            "has_anti_drug_antibodies": self.has_anti_drug_antibodies,
        }
        stored_model = CombinedModel.objects.create(**stored_model_kwargs)

        # get the new varaibles of the model
        new_variables = {}
        for variable in stored_model.variables.all():
            new_variables[variable.qname] = variable

        for dv in self.derived_variables.all():
            dv.copy(stored_model, new_variables)

        # variables might have changed so get the new ones
        new_variables = {}
        for variable in stored_model.variables.all():
            new_variables[variable.qname] = variable

        for mapping in self.mappings.all():
            mapping.copy(stored_model, new_variables)

        # update the variable values of the new model
        for variable in stored_model.variables.all():
            old_var = self.variables.get(qname=variable.qname)
            variable.copy(old_var, project)

        for time_interval in self.time_intervals.all():
            time_interval.copy(stored_model)

        return stored_model

    def create_myokit_model(self):
        if self.pk_model is None:
            pk_model = myokit.Model()
        else:
            pk_model = self.pk_model.create_myokit_model()
        if self.pk_model2 is None or self.pk_model is None:
            pk_model2 = myokit.Model()
        else:
            pk_model2 = self.pk_model2.create_myokit_model()
        if self.pd_model is None:
            pd_model = myokit.Model()
        else:
            pd_model = self.pd_model.create_myokit_model()
        if self.pd_model2 is None:
            pd_model2 = myokit.Model()
        else:
            pd_model2 = self.pd_model2.create_myokit_model()

        # combined both pk models
        if self.pk_model2 is not None and self.pk_model is not None:
            pk_model.import_component(
                pk_model2.get("PKCompartment"), new_name="Extravascular"
            )
            # link RateAbs from Extravascular to PKCompartment
            pk_rate_abs = pk_model.get("PKCompartment.RateAbs")
            e_rate_abs = pk_model.get("Extravascular.RateAbs")
            pk_rate_abs.set_rhs(myokit.Name(e_rate_abs))

        # add effect compartments
        if self.number_of_effect_compartments > 0:
            ec_myokit = self.pk_effect_model.create_myokit_model()
            for i in range(self.number_of_effect_compartments):
                pk_model.import_component(
                    ec_myokit.get("PKCompartment"), new_name=f"EffectCompartment{i+1}"
                )

        # do derived variables for pk model first
        calc_C1_f_exists = False
        for derived_variable in self.derived_variables.all():
            var_name = derived_variable.pk_variable.name

            if (
                derived_variable.type == DerivedVariable.Type.FRACTION_UNBOUND_PLASMA
            ):  # noqa: E501
                if var_name == "C1":
                    calc_C1_f_exists = True

            add_pk_variable(
                derived_variable=derived_variable,
                pk_model=pk_model,
                project=self.project,
            )

        # add effect compartment equations
        if self.number_of_effect_compartments > 0:
            tags = list(self.pk_model.tags.all().values_list("name", flat=True))
            if "TMDD" in tags:
                c1_variable_name = "PKCompartment.C1_f"
            else:
                c1_variable_name = (
                    "PKCompartment.calc_C1_f"
                    if calc_C1_f_exists
                    else "PKCompartment.C1"
                )
            c1_variable = pk_model.get(c1_variable_name)
            for i in range(self.number_of_effect_compartments):
                c_drug = pk_model.get(f"EffectCompartment{i+1}.C_Drug")
                c_drug.set_rhs(myokit.Name(c1_variable))

        have_both_models = self.pk_model is not None and self.pd_model is not None
        have_no_models = self.pk_model is None and self.pd_model is None

        # combine the two pd models. If any constants overlap prefer the
        # pd_model (remove the constant from pd_model2) If any state variables
        # overlap then add the rhs terms

        if self.pd_model2 is not None:
            pd2_time_var = pd_model2.binding("time")
            pd2_time_var.set_binding(None)
            pd2_time_component = pd2_time_var.parent()
            pd2_time_component.remove_variable(pd2_time_var)
            if pd2_time_component.count_variables() == 0:
                pd_model2.remove_component(pd2_time_component)

            pd2_components = list(pd_model2.components())
            pd2_names = [
                c.name().replace("PDCompartment", "PDCompartment2")
                for c in pd2_components
            ]
            pd_model.import_component(
                pd2_components,
                new_name=pd2_names,
            )

            # deal with any state variables that overlap
            for old_pd2_var in pd_model2.variables(state=True):
                if pd_model.has_variable(old_pd2_var.qname()):
                    pd_var = pd_model.get(old_pd2_var.qname())
                    pd2_var = pd_model.get(
                        pd_var.qname().replace("PDCompartment", "PDCompartment2")
                    )
                    pd_var.set_rhs(
                        myokit.Plus(
                            pd_var.rhs(),
                            pd2_var.rhs().clone(
                                {myokit.Name(pd2_var): myokit.Name(pd_var)}
                            ),
                        )
                    )
                    for eqn in pd_model.get("PDCompartment2").equations():
                        if eqn.rhs.depends_on(myokit.Name(pd2_var)):
                            lhs_var = eqn.lhs.var()
                            lhs_var.set_rhs(
                                eqn.rhs.clone(
                                    {myokit.Name(pd2_var): myokit.Name(pd_var)}
                                )
                            )
                    pd2_var.parent().remove_variable(pd2_var)

            # deal with any constants that overlap
            for old_pd2_var in pd_model2.variables(const=True):
                if pd_model.has_variable(old_pd2_var.qname()):
                    pd2_var = pd_model.get(
                        old_pd2_var.qname().replace("PDCompartment", "PDCompartment2")
                    )
                    pd2_var.parent().remove_variable(pd2_var)

        # use pk model as the base and import the pd model
        pkpd_model = pk_model

        # default model is one with just time
        if have_no_models:
            pkpd_model = myokit.parse_model(
                """
            [[model]]
            [myokit]
            time = 0 [s] bind time
                in [s]
        """
            )

        # remove time binding and variable from pd model
        if have_both_models:
            time_var = pd_model.binding("time")
            time_var.set_binding(None)
            time_component = time_var.parent()
            time_component.remove_variable(time_var)
            if time_component.count_variables() == 0:
                pd_model.remove_component(time_component)

        pd_components = list(pd_model.components())
        pd_names = [c.name().replace("myokit", "PD") for c in pd_components]

        if pd_components:
            pkpd_model.import_component(
                pd_components,
                new_name=pd_names,
            )

        # now do any derived variables that are based on pd (or both)
        for derived_variable in self.derived_variables.all():
            add_pd_variable(
                derived_variable=derived_variable,
                pk_model=pk_model,
                pkpd_model=pkpd_model,
                project=self.project,
            )

        # do mappings
        for mapping in self.mappings.all():
            try:
                pd_var = pkpd_model.get(
                    mapping.pd_variable.qname.replace("myokit", "PD")
                )
                pk_var = pkpd_model.get(mapping.pk_variable.qname)
            except KeyError:
                continue

            pk_to_pd_conversion_multiplier = Unit.convert_between_myokit_units(
                pk_var.unit(), pd_var.unit(), compound=self.project.compound
            )
            pd_to_pk_conversion_multiplier = Unit.convert_between_myokit_units(
                pk_var.unit(), pd_var.unit(), compound=self.project.compound
            )

            # pd var will be an intermediary variable driven by pk_var
            if pd_var.is_state():
                # add pd_var rate equation to pk_var
                pk_var.set_rhs(
                    myokit.Plus(
                        pk_var.rhs(),
                        myokit.Multiply(
                            myokit.Number(pd_to_pk_conversion_multiplier), pd_var.rhs()
                        ),
                    )
                )

                # demote pd_var to an intermediary variable
                pd_var.demote()

            pd_var.set_rhs(
                myokit.Multiply(
                    myokit.Number(pk_to_pd_conversion_multiplier), myokit.Name(pk_var)
                )
            )

        pkpd_model.validate()
        return pkpd_model

    def get_absolute_url(self):
        return reverse("dosed_pk_model-detail", kwargs={"pk": self.pk})

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        # if the pk or pd models have changed then remove the mappings and
        # derived variables
        # if (
        #    self.pk_model != self.__original_pk_model
        #    or self.pk_model2 != self.__original_pk_model2
        #    or self.pd_model != self.__original_pd_model
        #    or self.pd_model2 != self.__original_pd_model2
        # ):
        #    self.mappings.all().delete()
        #    self.derived_variables.all().delete()

        if (
            created
            or self.pk_model != self.__original_pk_model
            or self.pk_model2 != self.__original_pk_model2
            or self.pk_effect_model != self.__original_pk_effect_model
            or self.pd_model != self.__original_pd_model
            or self.pd_model2 != self.__original_pd_model2
            or self.has_saturation != self.__original_has_saturation
            or self.has_effect != self.__original_has_effect
            or self.has_lag != self.__original_has_lag
            or self.has_bioavailability != self.__original_has_bioavailability
            or self.has_hill_coefficient != self.__original_has_hill_coefficient
            or self.number_of_effect_compartments
            != self.__original_number_of_effect_compartments
        ):
            self.update_model()

        self.__original_pd_model = self.pd_model
        self.__original_pd_model2 = self.pd_model2
        self.__original_pk_model = self.pk_model
        self.__original_pk_model2 = self.pk_model2
        self.__original_pk_effect_model = self.pk_effect_model
        self.__original_has_saturation = self.has_saturation
        self.__original_has_effect = self.has_effect
        self.__original_has_lag = self.has_lag
        self.__original_has_hill_coefficient = self.has_hill_coefficient
        self.__original_has_bioavailability = self.has_bioavailability
        self.__original_number_of_effect_compartments = (
            self.number_of_effect_compartments
        )

    def reset_params_to_defaults(self, species, compoundType, variables=None):
        if self.is_library_model:
            project = self.project
            if project is None:
                is_preclinical = False
            else:
                is_preclinical = project.species != Project.Species.HUMAN

            # old models did not have tags so get the model name from the
            # existing name
            model_name = (
                self.pk_model.name.replace("_clinical", "")
                .replace("_preclinical", "")
                .replace("tmdd_full_constant_target", "tmdd")
                .replace("tmdd_qss_constant_target", "tmdd")
                .replace("tmdd_full", "tmdd")
                .replace("tmdd_QSS", "tmdd")
                .replace("production", "")
                .replace("elimination", "")
            )
            # new models use tags to define the model type
            tags = list(self.pk_model.tags.all().values_list("name", flat=True))
            if "TMDD" in tags:
                if "1-compartment" in tags:
                    model_name = "one_compartment_tmdd"
                elif "2-compartment" in tags:
                    model_name = "two_compartment_tmdd"
            else:
                if "1-compartment" in tags:
                    model_name = "one_compartment"
                elif "2-compartment" in tags:
                    model_name = "two_compartment"
                elif "3-compartment" in tags:
                    model_name = "three_compartment"

            # the ophtha extravascular model also has some defaults
            model2_name = None
            if self.pk_model2 is not None:
                if "Ocular" in self.pk_model2.name:
                    model2_name = "ophtha"
            print(
                "resetting params to defaults",
                model_name,
                species,
                compoundType,
                self.pk_model.name,
                is_preclinical,
                model2_name,
            )
            if variables is None:
                variables = self.variables.all()
            for v in variables:
                for mn in [model_name, model2_name]:
                    if mn is None:
                        continue
                    varName = v.name
                    defaultVal = (
                        defaults.get(mn, {})
                        .get(varName, {})
                        .get(species, {})
                        .get(compoundType, None)
                    )
                    if defaultVal is None:
                        continue
                    if defaultVal.get("unit", "") == "dimensionless":
                        defaultVal["unit"] = ""
                    unit = Unit.objects.filter(
                        symbol=defaultVal.get("unit", "")
                    ).first()
                    is_vol_per_kg = False
                    if unit is not None:
                        is_vol_per_kg = unit.m == 3 and unit.g == -1
                        if is_vol_per_kg:
                            unit = Unit.objects.filter(
                                symbol=defaultVal.get("unit", "")[:-3]
                            ).first()
                    value = defaultVal.get("value", None)
                    if value is None or unit is None:
                        continue
                    v.default_value = value
                    v.unit_per_body_weight = is_preclinical and is_vol_per_kg
                    v.unit = unit
                    if not v._state.adding:
                        v.save()


class PkpdMapping(StoredModel):
    pkpd_model = models.ForeignKey(
        CombinedModel,
        on_delete=models.CASCADE,
        related_name="mappings",
        help_text="PKPD model that this mapping is for",
    )
    pk_variable = models.ForeignKey(
        "Variable",
        on_delete=models.CASCADE,
        related_name="pk_mappings",
        help_text="variable in PK part of model",
    )
    pd_variable = models.ForeignKey(
        "Variable",
        on_delete=models.CASCADE,
        related_name="pd_mappings",
        help_text="variable in PD part of model",
    )

    __original_pk_variable = None
    __original_pd_variable = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_variable = self.pk_variable
        self.__original_pd_variable = self.pd_variable

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if (
            created
            or self.pk_variable != self.__original_pk_variable
            or self.pd_variable != self.__original_pd_variable
        ):
            self.pkpd_model.update_model()

        self.__original_pk_variable = self.pk_variable
        self.__original_pd_variable = self.pd_variable

    def delete(self):
        pkpd_model = self.pkpd_model
        super().delete()
        pkpd_model.update_model()

    def copy(self, new_pkpd_model, new_variables):
        new_pk_variable = new_variables[self.pk_variable.qname]
        new_pd_variable = new_variables[self.pd_variable.qname]
        stored_kwargs = {
            "pkpd_model": new_pkpd_model,
            "pk_variable": new_pk_variable,
            "pd_variable": new_pd_variable,
            "read_only": self.read_only,
        }
        stored_mapping = PkpdMapping.objects.create(**stored_kwargs)
        return stored_mapping


class TimeInterval(StoredModel):
    pkpd_model = models.ForeignKey(
        CombinedModel,
        on_delete=models.CASCADE,
        related_name="time_intervals",
        help_text="PKPD model that this time interval is for",
    )
    start_time = models.FloatField(help_text="start time of interval")
    end_time = models.FloatField(help_text="end time of interval")
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        help_text="unit of interval",
    )

    def __str__(self):
        return f"{self.start_time} - {self.end_time} [{self.unit}]"

    def copy(self, new_pkpd_model):
        stored_kwargs = {
            "pkpd_model": new_pkpd_model,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "unit": self.unit,
            "read_only": self.read_only,
        }
        stored_mapping = TimeInterval.objects.create(**stored_kwargs)
        return stored_mapping
