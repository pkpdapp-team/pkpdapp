#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import CombinedModel, TimeInterval, Variable


# -------------------------------------
# model page > secondary parameters tab
# -------------------------------------
class TimeIntervalContext(BaseModel):
    start_time: float
    end_time: float
    unit_symbol: str

    @classmethod
    def from_time_interval(cls, time_interval: TimeInterval):
        return cls(
            start_time=time_interval.start_time,
            end_time=time_interval.end_time,
            unit_symbol=time_interval.unit.symbol,
        )


# mirrors getVariableName in frontend-v2/src/features/simulation/utils.ts
# to match the ui
def variable_display_name(variable: Variable, model: CombinedModel):
    if model.number_of_effect_compartments > 1 and variable.qname.startswith(
        "EffectCompartment"
    ):
        compartment_name = variable.qname.split(".")[0]
        return variable.name + compartment_name.replace("EffectCompartment", "")
    return variable.name


class VariableThresholdContext(BaseModel):
    name: str
    qname: str
    description: str | None
    lower_threshold: float
    upper_threshold: float | None
    unit_symbol: str | None

    @classmethod
    def from_variable(cls, variable: Variable, model: CombinedModel):
        secondary_unit = variable.secondary_unit
        return cls(
            name=variable_display_name(variable, model),
            qname=variable.qname,
            description=variable.description,
            # the ui shows an empty lower threshold as 0
            lower_threshold=(
                0 if variable.lower_threshold is None else variable.lower_threshold
            ),
            upper_threshold=variable.upper_threshold,
            unit_symbol=secondary_unit.symbol if secondary_unit else None,
        )


class SecondaryParametersContext(BaseModel):
    time_intervals: list[TimeIntervalContext]
    variable_thresholds: list[VariableThresholdContext]

    @classmethod
    def from_combined_model(cls, model: CombinedModel):
        # mirrors ThresholdsTable.tsx: variables with an AUC derived variable
        auc_variables = [
            variable
            for variable in model.variables.all()
            if any(dv.type == "AUC" for dv in variable.derived_variables.all())
        ]
        thresholds = [
            VariableThresholdContext.from_variable(variable, model)
            for variable in auc_variables
        ]
        return cls(
            time_intervals=[
                TimeIntervalContext.from_time_interval(time_interval)
                for time_interval in model.time_intervals.all()
            ],
            # same order as the ui: by name, a plain string compare
            variable_thresholds=sorted(thresholds, key=lambda t: t.name),
        )
