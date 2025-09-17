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
)
import myokit
from django.db import models
from django.urls import reverse
import logging
from pkpdapp.utils.default_params import defaults

logger = logging.getLogger(__name__)


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
    __original_pd_model = None
    __original_pd_model2 = None
    __original_has_saturation = None
    __original_has_effect = None
    __original_has_lag = None
    __original_has_hill_coefficient = None
    __original_has_bioavailability = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        # fix for infinite recursion when deleting project
        if "pk_model_id" in field_names:
            instance.__original_pk_model = instance.pk_model
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

        # do derived variables for pk model first
        calc_C1_f_exists = False
        for derived_variable in self.derived_variables.all():
            if derived_variable.type in [
                DerivedVariable.Type.MICHAELIS_MENTEN,
                DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN,
                DerivedVariable.Type.EMAX,
                DerivedVariable.Type.IMAX,
                DerivedVariable.Type.POWER,
                DerivedVariable.Type.EXP_DECAY,
                DerivedVariable.Type.EXP_INCREASE,
            ]:
                continue
            try:
                myokit_var = pk_model.get(derived_variable.pk_variable.qname)
            except KeyError:
                logger.warning(
                    f"Derived variable handler: Variable {derived_variable.pk_variable.qname} not found in model"  # noqa: E501
                )

                continue
            myokit_compartment = myokit_var.parent()
            var_name = derived_variable.pk_variable.name
            if (
                derived_variable.type == DerivedVariable.Type.AREA_UNDER_CURVE
            ):  # noqa: E501
                new_names = [f"calc_{var_name}_AUC"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )
                if has_name:
                    continue
                time_var = pk_model.binding("time")
                var = myokit_compartment.add_variable(
                    new_names[0],
                    rhs=myokit.Name(myokit_var),
                    initial_value=0,
                    unit=myokit_var.unit() * time_var.unit(),
                )
                var.meta["desc"] = (
                    f'Area under curve for {myokit_var.meta["desc"]}'  # noqa: E501
                )
            elif (
                derived_variable.type == DerivedVariable.Type.RECEPTOR_OCCUPANCY
            ):  # noqa: E501
                new_names = [f"calc_{var_name}_RO"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = (
                    f'Receptor occupancy for {myokit_var.meta["desc"]}'  # noqa: E501
                )
                kd_name = "KD_ud"
                if myokit_compartment.has_variable(kd_name):
                    kd = myokit_compartment.get(kd_name)
                else:
                    kd = myokit_compartment.add_variable(kd_name)
                    kd.meta["desc"] = (
                        "User-defined Dissociation Constant used to calculate Receptor occupancy"  # noqa: E501
                    )
                target_conc_name = "CT1_0_ud"
                if myokit_compartment.has_variable(target_conc_name):
                    target_conc = myokit_compartment.get(target_conc_name)
                else:
                    target_conc = myokit_compartment.add_variable(target_conc_name)
                    target_conc.meta["desc"] = (
                        "User-defined Target Concentration used to calculate Receptor occupancy"  # noqa: E501
                    )
                var.set_unit(myokit.Unit())
                kd_unit = myokit_var.unit()
                compound = self.project.compound
                kd_unit_conversion_factor = compound.dissociation_unit.convert_to(
                    kd_unit, compound=compound
                )
                kd.set_rhs(compound.dissociation_constant * kd_unit_conversion_factor)
                kd.set_unit(kd_unit)
                target_conc_unit = myokit_var.unit()
                target_conc_unit_conversion_factor = (
                    compound.target_concentration_unit.convert_to(
                        target_conc_unit, compound=compound, is_target=True
                    )
                )
                target_conc.set_rhs(
                    compound.target_concentration * target_conc_unit_conversion_factor
                )
                target_conc.set_unit(target_conc_unit)

                b = var.add_variable("b")
                b.set_rhs(
                    myokit.Plus(
                        myokit.Plus(myokit.Name(kd), myokit.Name(target_conc)),
                        myokit.Name(myokit_var),
                    )
                )
                c = var.add_variable("c")
                c.set_rhs(
                    myokit.Multiply(
                        myokit.Multiply(myokit.Number(4), myokit.Name(target_conc)),
                        myokit.Name(myokit_var),
                    )
                )

                var.set_rhs(
                    myokit.Multiply(
                        myokit.Number(100),
                        myokit.Divide(
                            myokit.Minus(
                                myokit.Name(b),
                                myokit.Sqrt(
                                    myokit.Minus(
                                        myokit.Power(myokit.Name(b), myokit.Number(2)),
                                        myokit.Name(c),
                                    )
                                ),
                            ),
                            myokit.Multiply(myokit.Number(2), myokit.Name(target_conc)),
                        ),
                    )
                )
            elif (
                derived_variable.type == DerivedVariable.Type.FRACTION_UNBOUND_PLASMA
            ):  # noqa: E501
                if var_name == "C1":
                    calc_C1_f_exists = True
                new_names = [f"calc_{var_name}_f", "FUP_ud"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = (
                    f'Unbound Concentration for {myokit_var.meta["desc"]}'  # noqa: E501
                )
                fup = myokit_compartment.add_variable(new_names[1])
                fup.meta["desc"] = "User-defined Fraction Unbound Plasma"  # noqa: E501
                var.set_unit(myokit_var.unit())
                fup.set_rhs(self.project.compound.fraction_unbound_plasma)
                fup.set_unit(myokit.units.dimensionless)
                var.set_rhs(myokit.Multiply(myokit.Name(fup), myokit.Name(myokit_var)))
            elif (
                derived_variable.type == DerivedVariable.Type.BLOOD_PLASMA_RATIO
            ):  # noqa: E501
                new_names = [f"calc_{var_name}_bl", "BP_ud"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                var = myokit_compartment.add_variable(new_names[0])
                bpr = myokit_compartment.add_variable(new_names[1])
                bpr.meta["desc"] = "User-defined Blood to Plasma Ratio"  # noqa: E501
                var.meta["desc"] = f'Blood Concentration for {myokit_var.meta["desc"]}'
                var.set_unit(myokit_var.unit())
                bpr.set_rhs(self.project.compound.blood_to_plasma_ratio)
                bpr.set_unit(myokit.units.dimensionless)
                var.set_rhs(myokit.Multiply(myokit.Name(bpr), myokit.Name(myokit_var)))
            elif derived_variable.type == DerivedVariable.Type.TLAG:  # noqa: E501
                new_names = [f"{var_name}_tlag_ud"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = (
                    "User-defined absorption lag time from specified compartment"
                )
                time_var = pk_model.binding("time")
                var.set_unit(time_var.unit())
                var.set_rhs(myokit.Number(0))
            else:
                raise ValueError(
                    f"Unknown derived variable type {derived_variable.type}"
                )

        # add effect compartments
        if self.number_of_effect_compartments > 0:
            effect_compartment = PharmacokineticModel.objects.get(
                name="Effect compartment model"
            )
            ec_myokit = effect_compartment.create_myokit_model()

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
                pk_model.import_component(
                    ec_myokit.get("PKCompartment"), new_name=f"EffectCompartment{i+1}"
                )
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
            try:
                myokit_var = pkpd_model.get(derived_variable.pk_variable.qname)
            except KeyError:
                logger.warning(
                    f"Derived variable handler (PKPD): Variable {derived_variable.pk_variable.qname} not found in model"  # noqa: E501
                )
                continue

            time_var = pkpd_model.binding("time")
            if pkpd_model.has_component("PKNonlinearities"):
                myokit_compartment = pkpd_model.get("PKNonlinearities")
            else:
                myokit_compartment = pkpd_model.add_component("PKNonlinearities")
            var_name = derived_variable.pk_variable.name
            var = None
            if (
                derived_variable.type == DerivedVariable.Type.AREA_UNDER_CURVE
            ):  # noqa: E501
                pass
            elif (
                derived_variable.type == DerivedVariable.Type.RECEPTOR_OCCUPANCY
            ):  # noqa: E501
                pass
            elif (
                derived_variable.type == DerivedVariable.Type.FRACTION_UNBOUND_PLASMA
            ):  # noqa: E501
                pass
            elif derived_variable.type == DerivedVariable.Type.TLAG:  # noqa: E501
                pass
            elif derived_variable.type == DerivedVariable.Type.MICHAELIS_MENTEN:
                #  base_variable_secondary_variable_MM = [base_variable * 1/(1+[secondary_variable/Km_X])]  # noqa: E501
                second_var = derived_variable.secondary_variable
                if second_var is None:
                    continue
                second_var_name = second_var.name
                myokit_second_var = pk_model.get(second_var.qname)
                new_names = [f"{var_name}_{second_var_name}_MM", f"Km_{var_name}"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                km_var = myokit_compartment.add_variable(new_names[1])
                km_var.meta["desc"] = (
                    f"Michaelis Menten constant for {var_name} and {second_var_name}"
                )
                km_var.set_unit(myokit_second_var.unit())
                km_var.set_rhs(myokit.Number(1))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = (
                    f"Michaelis Menten for {var_name} and {second_var_name}"
                )
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Multiply(
                        myokit.Name(myokit_var),
                        myokit.Divide(
                            myokit.Number(1),
                            myokit.Plus(
                                myokit.Number(1),
                                myokit.Divide(
                                    myokit.Name(myokit_second_var),
                                    myokit.Name(km_var),
                                ),
                            ),
                        ),
                    )
                )

            elif (
                derived_variable.type == DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN
            ):
                # base_variable_secondary_variable_eMM = [base_variable * 1/(1+[secondary_variable/Km_X]**h_X) + Xlin]  # noqa: E501
                second_var = derived_variable.secondary_variable
                if second_var is None:
                    continue
                second_var_name = second_var.name
                myokit_second_var = pk_model.get(second_var.qname)
                new_names = [
                    f"{var_name}_{second_var_name}_eMM",
                    f"Km_{var_name}",
                    f"h_{var_name}",
                    f"{var_name}_lin",
                ]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                km_var = myokit_compartment.add_variable(new_names[1])
                km_var.meta["desc"] = (
                    f"Michaelis Menten constant for {var_name} and {second_var_name}"
                )
                km_var.set_unit(myokit_second_var.unit())
                km_var.set_rhs(myokit.Number(1))

                h_var = myokit_compartment.add_variable(new_names[2])
                h_var.meta["desc"] = (
                    f"Hill coefficient for {var_name} and {second_var_name}"
                )
                h_var.set_unit(myokit.units.dimensionless)
                h_var.set_rhs(myokit.Number(1))

                lin_var = myokit_compartment.add_variable(new_names[3])
                lin_var.meta["desc"] = (
                    f"Linear term for {var_name} and {second_var_name}"
                )
                lin_var.set_unit(myokit_var.unit())
                lin_var.set_rhs(myokit.Number(0))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = (
                    f"Michaelis Menten for {var_name} and {second_var_name}"
                )
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Plus(
                        myokit.Multiply(
                            myokit.Minus(
                                myokit.Name(myokit_var),
                                myokit.Name(lin_var),
                            ),
                            myokit.Divide(
                                myokit.Number(1),
                                myokit.Plus(
                                    myokit.Number(1),
                                    myokit.Power(
                                        myokit.Divide(
                                            myokit.Name(myokit_second_var),
                                            myokit.Name(km_var),
                                        ),
                                        myokit.Name(h_var),
                                    ),
                                ),
                            ),
                        ),
                        myokit.Name(lin_var),
                    )
                )
            elif derived_variable.type == DerivedVariable.Type.EMAX:
                # base_variable_Emax = base_variable * C_Drug**h_CL/(C_Drug**h_CL+D50**h_CL) + Xmin  # noqa: E501
                first_dose_value = None
                first_dose_unit = None
                protocol = self.project.protocols.first()
                if protocol:
                    dose = protocol.doses.first()
                    if dose:
                        first_dose_value = dose.amount
                        first_dose_unit = protocol.amount_unit.get_myokit_unit()
                if first_dose_value is None:
                    continue
                new_names = [
                    f"{var_name}_Emax",
                    f"D50_{var_name}",
                    f"h_{var_name}",
                    f"{var_name}_min",
                ]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                d50_var = myokit_compartment.add_variable(new_names[1])
                d50_var.meta["desc"] = f"Emax D50 for {var_name}"
                d50_var.set_unit(first_dose_unit)
                d50_var.set_rhs(myokit.Number(1))

                h_var = myokit_compartment.add_variable(new_names[2])
                h_var.meta["desc"] = f"Emax Hill coefficient for {var_name}"
                h_var.set_unit(myokit.units.dimensionless)
                h_var.set_rhs(myokit.Number(1))

                min_var = myokit_compartment.add_variable(new_names[3])
                min_var.meta["desc"] = f"Emax min for {var_name}"
                min_var.set_unit(myokit_var.unit())
                min_var.set_rhs(myokit.Number(0))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = f"Emax for {var_name}"
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Plus(
                        myokit.Multiply(
                            myokit.Minus(
                                myokit.Name(myokit_var),
                                myokit.Name(min_var),
                            ),
                            myokit.Divide(
                                myokit.Power(
                                    myokit.Number(first_dose_value),
                                    myokit.Name(h_var),
                                ),
                                myokit.Plus(
                                    myokit.Power(
                                        myokit.Number(first_dose_value),
                                        myokit.Name(h_var),
                                    ),
                                    myokit.Power(
                                        myokit.Name(d50_var),
                                        myokit.Name(h_var),
                                    ),
                                ),
                            ),
                        ),
                        myokit.Name(min_var),
                    )
                )
            elif derived_variable.type == DerivedVariable.Type.IMAX:
                # base_variable_Imax = base_variable * [1-C_Drug**h_CL/(C_Drug**h_CL+D50**h_CL)] + Xmin  # noqa: E501
                myokit_c_drug = pk_model.get("PDCompartment.C_Drug")
                if myokit_c_drug is None:
                    continue
                new_names = [
                    f"{var_name}_Imax",
                    f"D50_{var_name}",
                    f"h_{var_name}",
                    f"{var_name}_min",
                ]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                d50_var = myokit_compartment.add_variable(new_names[1])
                d50_var.meta["desc"] = f"Imax D50 for {var_name}"
                d50_var.set_unit(myokit_c_drug.unit())
                d50_var.set_rhs(myokit.Number(1))

                h_var = myokit_compartment.add_variable(new_names[2])
                h_var.meta["desc"] = f"Imax Hill coefficient for {var_name}"
                h_var.set_unit(myokit.units.dimensionless)
                h_var.set_rhs(myokit.Number(1))

                min_var = myokit_compartment.add_variable(new_names[3])
                min_var.meta["desc"] = f"Imax min for {var_name}"
                min_var.set_unit(myokit_var.unit())
                min_var.set_rhs(myokit.Number(0))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = f"Imax for {var_name}"
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Plus(
                        myokit.Multiply(
                            myokit.Minus(
                                myokit.Name(myokit_var),
                                myokit.Name(min_var),
                            ),
                            myokit.Minus(
                                myokit.Number(1),
                                myokit.Divide(
                                    myokit.Power(
                                        myokit.Name(myokit_c_drug),
                                        myokit.Name(h_var),
                                    ),
                                    myokit.Plus(
                                        myokit.Power(
                                            myokit.Name(myokit_c_drug),
                                            myokit.Name(h_var),
                                        ),
                                        myokit.Power(
                                            myokit.Name(d50_var),
                                            myokit.Name(h_var),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                        myokit.Name(min_var),
                    )
                )
            elif derived_variable.type == DerivedVariable.Type.POWER:
                # base_variable_Power = base_variable * (C_Drug/Ref_D)**a_D
                myokit_c_drug = pk_model.get("PDCompartment.C_Drug")
                if myokit_c_drug is None:
                    continue
                new_names = [
                    f"{var_name}_Power",
                    f"Ref_D_{var_name}",
                    f"a_D_{var_name}",
                ]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                ref_d_var = myokit_compartment.add_variable(new_names[1])
                ref_d_var.meta["desc"] = f"Power Reference for {var_name}"
                ref_d_var.set_unit(myokit_c_drug.unit())
                ref_d_var.set_rhs(myokit.Number(1))

                a_d_var = myokit_compartment.add_variable(new_names[2])
                a_d_var.meta["desc"] = f"Power Exponent for {var_name}"
                a_d_var.set_unit(myokit.units.dimensionless)
                a_d_var.set_rhs(myokit.Number(1))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = f"Power for {var_name}"
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Multiply(
                        myokit.Name(myokit_var),
                        myokit.Power(
                            myokit.Divide(
                                myokit.Name(myokit_c_drug),
                                myokit.Name(ref_d_var),
                            ),
                            myokit.Name(a_d_var),
                        ),
                    )
                )
            elif derived_variable.type == DerivedVariable.Type.EXP_DECAY:
                # base_variable_TDI = base_variable * exp(-k_X*time) +Xmin
                new_names = [f"{var_name}_TDI", f"k_{var_name}", f"{var_name}_min"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )  # noqa: E501
                if has_name:
                    continue
                k_var = myokit_compartment.add_variable(new_names[1])
                k_var.meta["desc"] = f"Exponential Decay Rate for {var_name}"
                k_var.set_unit(myokit.units.dimensionless / myokit.units.second)
                k_var.set_rhs(myokit.Number(1))

                min_var = myokit_compartment.add_variable(new_names[2])
                min_var.meta["desc"] = f"Exponential Decay min for {var_name}"
                min_var.set_unit(myokit_var.unit())
                min_var.set_rhs(myokit.Number(0))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = f"Exponential Decay for {var_name}"
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Plus(
                        myokit.Multiply(
                            myokit.Minus(
                                myokit.Name(myokit_var),
                                myokit.Name(min_var),
                            ),
                            myokit.Exp(
                                myokit.PrefixMinus(
                                    myokit.Multiply(
                                        myokit.Name(k_var), myokit.Name(time_var)
                                    )
                                )
                            ),
                        ),
                        myokit.Name(min_var),
                    )
                )

            elif derived_variable.type == DerivedVariable.Type.EXP_INCREASE:
                # base_variable_IND = base_variable * [1-exp(-k_X*time)] +Xmin
                new_names = [f"{var_name}_IND", f"k_{var_name}", f"{var_name}_min"]
                has_name = any(
                    [
                        myokit_compartment.has_variable(new_name)
                        for new_name in new_names
                    ]
                )
                if has_name:
                    continue

                k_var = myokit_compartment.add_variable(new_names[1])
                k_var.meta["desc"] = f"Exponential Increase Rate for {var_name}"
                k_var.set_unit(1 / myokit.units.second)
                k_var.set_rhs(myokit.Number(1))

                min_var = myokit_compartment.add_variable(new_names[2])
                min_var.meta["desc"] = f"Exponential Increase min for {var_name}"
                min_var.set_unit(myokit_var.unit())
                min_var.set_rhs(myokit.Number(0))

                var = myokit_compartment.add_variable(new_names[0])
                var.meta["desc"] = f"Exponential Increase for {var_name}"
                var.set_unit(myokit_var.unit())
                var.set_rhs(
                    myokit.Plus(
                        myokit.Multiply(
                            myokit.Minus(
                                myokit.Name(myokit_var),
                                myokit.Name(min_var),
                            ),
                            myokit.Minus(
                                myokit.Number(1),
                                myokit.Exp(
                                    myokit.PrefixMinus(
                                        myokit.Multiply(
                                            myokit.Name(k_var), myokit.Name(time_var)
                                        )
                                    ),
                                ),
                            ),
                        ),
                        myokit.Name(min_var),
                    )
                )
            else:
                raise ValueError(
                    f"Unknown derived variable type {derived_variable.type}"
                )
            # replace the original variable with the new one in the model
            for comp_var in myokit_compartment.variables():
                if var is None or comp_var == var:
                    continue
                new_expr = comp_var.rhs().clone(
                    {myokit.Name(myokit_var): myokit.Name(var)}
                )
                comp_var.set_rhs(new_expr)

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
        if (
            self.pk_model != self.__original_pk_model
            or self.pd_model != self.__original_pd_model
            or self.pd_model2 != self.__original_pd_model2
        ):
            self.mappings.all().delete()
            self.derived_variables.all().delete()

        if (
            created
            or self.pk_model != self.__original_pk_model
            or self.pd_model != self.__original_pd_model
            or self.pd_model2 != self.__original_pd_model2
            or self.has_saturation != self.__original_has_saturation
            or self.has_effect != self.__original_has_effect
            or self.has_lag != self.__original_has_lag
            or self.has_bioavailability != self.__original_has_bioavailability
            or self.has_hill_coefficient != self.__original_has_hill_coefficient
        ):
            self.update_model()

        self.__original_pd_model = self.pd_model
        self.__original_pd_model2 = self.pd_model2
        self.__original_pk_model = self.pk_model
        self.__original_has_saturation = self.has_saturation
        self.__original_has_effect = self.has_effect
        self.__original_has_lag = self.has_lag
        self.__original_has_hill_coefficient = self.has_hill_coefficient
        self.__original_has_bioavailability = self.has_bioavailability

    def reset_params_to_defaults(self, species, compoundType, variables=None):
        if self.is_library_model:
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
            print(
                "resetting params to defaults",
                model_name,
                species,
                compoundType,
                self.pk_model.name,
            )
            if variables is None:
                variables = self.variables.all()
            for v in variables:
                varName = v.name
                defaultVal = (
                    defaults.get(model_name, {})
                    .get(varName, {})
                    .get(species, {})
                    .get(compoundType, None)
                )
                if defaultVal is None:
                    continue
                if defaultVal.get("unit", "") == "dimensionless":
                    defaultVal["unit"] = ""
                unit = Unit.objects.filter(symbol=defaultVal.get("unit", "")).first()
                value = defaultVal.get("value", None)
                if value is None or unit is None:
                    continue
                v.default_value = value
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


class DerivedVariable(StoredModel):
    pkpd_model = models.ForeignKey(
        CombinedModel,
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

    class Type(models.TextChoices):
        AREA_UNDER_CURVE = "AUC", "area under curve"
        RECEPTOR_OCCUPANCY = "RO", "receptor occupancy"
        FRACTION_UNBOUND_PLASMA = "FUP", "faction unbound plasma"
        BLOOD_PLASMA_RATIO = "BPR", "blood plasma ratio"
        TLAG = "TLG", "dosing lag time"
        MICHAELIS_MENTEN = "MM", "Michaelis-Menten"
        EXTENDED_MICHAELIS_MENTEN = "EMM", "Extended Michaelis-Menten"
        EMAX = "EMX", "Emax"
        IMAX = "IMX", "Imax"
        POWER = "POW", "Power"
        EXP_DECAY = "TDI", "Exponential Decay"
        EXP_INCREASE = "IND", "Exponential Increase"

    type = models.CharField(
        max_length=3, choices=Type.choices, help_text="type of derived variable"
    )

    __original_pk_variable = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_variable = self.pk_variable

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if created or self.pk_variable != self.__original_pk_variable:
            self.pkpd_model.update_model()

        self.__original_pk_variable = self.pk_variable

    def delete(self):
        pkpd_model = self.pkpd_model
        super().delete()
        pkpd_model.update_model()

    def copy(self, new_pkpd_model, new_variables):
        new_pk_variable = new_variables[self.pk_variable.qname]
        stored_kwargs = {
            "pkpd_model": new_pkpd_model,
            "pk_variable": new_pk_variable,
            "read_only": self.read_only,
            "type": self.type,
        }
        stored_mapping = DerivedVariable.objects.create(**stored_kwargs)
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
