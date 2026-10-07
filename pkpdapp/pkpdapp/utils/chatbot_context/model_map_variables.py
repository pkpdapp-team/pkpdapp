#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import re
from typing import Literal

import myokit
from pydantic import BaseModel

from pkpdapp.models import (
    CombinedModel,
    Compound,
    Project,
    Variable,
)
from pkpdapp.utils.chatbot_context.shared import SelectionContext


# ------------------------------
# model page > map variables tab
# ------------------------------
AMOUNT_UNIT = myokit.parse_unit("pmol")
AMOUNT_PER_KG_UNIT = myokit.parse_unit("pmol/kg")
CONCENTRATION_UNIT = myokit.parse_unit("pmol/L")


# mirrors noDosing in frontend-v2/.../variables/VariableRow.tsx to match the ui
def is_dosing_variable(variable: Variable, compound: Compound):
    if variable.constant or variable.name in ("t", "C_Drug"):
        return False
    unit = variable.unit
    if unit is None or unit.symbol == "":
        return False
    if not unit.is_convertible_to(AMOUNT_UNIT, compound=compound):
        return False
    is_complex_amount = sum(part in variable.name for part in ("T1", "T2", "D")) >= 2
    is_transit = variable.qname.startswith("Extravascular.Atr")
    return not is_complex_amount and not is_transit


# mirrors filterOutputs in frontend-v2/src/features/simulation/utils.ts to match the ui
def is_output_variable(variable: Variable, model: CombinedModel):
    if variable.constant:
        return False
    if not model.is_library_model:
        return True
    qname, name = variable.qname, variable.name
    is_concentration = (
        qname.startswith(("PKCompartment.C", "Extravascular.Cah", "Extravascular.Cvh"))
        or (qname.startswith("EffectCompartment") and name.startswith("Ce"))
    ) and not name.startswith("CLimm")
    is_receptor_occupancy = qname.startswith("PKCompartment") and "RO" in name
    is_pd_effect = qname.startswith("PDCompartment.E")
    is_protein_or_precursor = qname.startswith("PDCompartment.P")
    is_tumour_size = qname.startswith("PDCompartment.TS")
    is_inhibition = name.startswith(("PerInh", "PercInh", "PDO", "STM", "INH"))
    return (
        is_concentration
        or is_receptor_occupancy
        or is_pd_effect
        or is_protein_or_precursor
        or is_tumour_size
        or is_inhibition
    )


class DosingVariableContext(BaseModel):
    name: str
    unit_symbol: str | None
    model_type: Literal["PK", "PD"]
    is_dosing_compartment: SelectionContext
    has_lag_time: SelectionContext | None
    description: str | None
    qname: str

    @classmethod
    def from_variable(cls, variable: Variable, *, has_lag: bool, can_edit: bool):
        return cls(
            name=variable.name,
            unit_symbol=variable.unit.symbol,
            model_type="PD" if variable.qname.startswith("PD") else "PK",
            is_dosing_compartment=SelectionContext(
                # prefetched in loaders.py with a filter: non-dataset protocols only
                selected=bool(variable.chat_non_dataset_protocols),
                enabled=can_edit,
            ),
            has_lag_time=(
                SelectionContext(
                    selected=any(
                        dv.type == "TLG" for dv in variable.derived_variables.all()
                    ),
                    enabled=can_edit,
                )
                # the lag time column only shows when the model has lag
                if has_lag
                else None
            ),
            description=variable.description,
            qname=variable.qname,
        )


class VariableMappingContext(BaseModel):
    name: str
    qname: str
    description: str | None

    link_to_pd: SelectionContext | None
    secondary_parameters: SelectionContext | None
    static_receptor_occupancy: SelectionContext | None
    unbound_concentration: SelectionContext | None
    blood_concentration: SelectionContext | None

    # mirrors AdditionalParametersRow in frontend-v2/.../variables/ to match the ui,
    # returns None where the ui hides the row
    @classmethod
    def from_variable(
        cls,
        variable: Variable,
        model: CombinedModel,
        project: Project,
        *,
        has_effect_variable: bool,
        can_edit: bool,
    ):
        if variable.constant or variable.name in ("t", "C_Drug"):
            return None

        compound = project.compound
        amount_unit = AMOUNT_UNIT if project.species == "H" else AMOUNT_PER_KG_UNIT
        unit = variable.unit
        is_concentration = unit is not None and unit.is_convertible_to(
            CONCENTRATION_UNIT, compound=compound
        )
        is_amount = (
            unit is not None
            and unit.symbol != ""
            and unit.is_convertible_to(amount_unit, compound=compound)
        )

        is_pd = variable.qname.startswith("PD")
        link_to_pd = False if is_pd else bool(variable.pk_mappings.all())
        no_map_to_pd = is_pd or not has_effect_variable or not is_concentration
        no_derived_variables = not is_concentration or is_pd
        is_c1 = model.is_library_model and variable.qname.endswith(".C1")
        disable_auc = False
        disable_ro = (
            not compound.dissociation_constant or not compound.target_concentration
        )
        disable_fup = (
            not compound.fraction_unbound_plasma or compound.compound_type == "LM"
        )
        disable_bpr = (
            not compound.blood_to_plasma_ratio or compound.compound_type == "LM"
        )
        no_dosing = not is_amount
        is_derived_variable = (
            re.search(r"calc_.*_(f|bl|RO|AUC)", variable.name) is not None
        )
        no_secondary_parameters = is_derived_variable or not is_output_variable(
            variable, model
        )

        if (
            no_map_to_pd
            and no_derived_variables
            and no_secondary_parameters
            and no_dosing
        ):
            return None

        name = variable.name
        if model.number_of_effect_compartments > 1 and variable.qname.startswith(
            "Effect"
        ):
            # "EffectCompartment2" -> "2"
            name += variable.qname.split(".")[0][17:]

        derived_types = {dv.type for dv in variable.derived_variables.all()}
        show_fup_bpr = (
            compound.compound_type == "SM"
            and is_c1
            and not no_derived_variables
            and not is_derived_variable
        )
        return cls(
            name=name,
            qname=variable.qname,
            description=variable.description,
            link_to_pd=(
                SelectionContext(selected=link_to_pd, enabled=can_edit)
                if model.pd_model_id and not no_map_to_pd
                else None
            ),
            secondary_parameters=(
                SelectionContext(
                    selected="AUC" in derived_types,
                    enabled=can_edit and not disable_auc,
                )
                if not no_secondary_parameters
                else None
            ),
            static_receptor_occupancy=(
                SelectionContext(
                    selected="RO" in derived_types,
                    enabled=can_edit and not disable_ro,
                )
                if not no_derived_variables
                else None
            ),
            unbound_concentration=(
                SelectionContext(
                    selected="FUP" in derived_types,
                    enabled=can_edit and not disable_fup,
                )
                if show_fup_bpr
                else None
            ),
            blood_concentration=(
                SelectionContext(
                    selected="BPR" in derived_types,
                    enabled=can_edit and not disable_bpr,
                )
                if show_fup_bpr
                else None
            ),
        )


# mirrors the row order of MapVariablesTab.tsx (its pre-sort, then sortVariables)
def variable_sort_key(variable: Variable):
    name = variable.name
    rank = 0 if name.startswith("C") else 1 if name.startswith("A") else 2
    return (rank, name, not variable.qname.startswith("PK"), variable.qname)


class MapVariablesContext(BaseModel):
    dosing_variables: list[DosingVariableContext]
    variable_mappings: list[VariableMappingContext]

    @classmethod
    def from_combined_model(cls, model: CombinedModel, *, can_edit: bool):
        project = model.project
        variables = sorted(model.variables.all(), key=variable_sort_key)
        has_effect_variable = any(
            variable.qname in ("PDCompartment.C_Drug", "PDCompartment2.C_Drug")
            for variable in variables
        )
        mappings = [
            VariableMappingContext.from_variable(
                variable,
                model,
                project,
                has_effect_variable=has_effect_variable,
                can_edit=can_edit,
            )
            for variable in variables
        ]
        return cls(
            dosing_variables=[
                DosingVariableContext.from_variable(
                    variable, has_lag=model.has_lag, can_edit=can_edit
                )
                for variable in variables
                if is_dosing_variable(variable, project.compound)
            ],
            variable_mappings=[mapping for mapping in mappings if mapping is not None],
        )
