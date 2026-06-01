#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from dataclasses import dataclass, field
import os
import tempfile
from typing import Any

from myokit.formats.diffsl import DiffSLExporter
import numpy as np
import myokit
import pydiffsol

from pkpdapp.models.myokit_model_mixin import get_protocol, set_administration


@dataclass(frozen=True)
class VariableContext:
    id: int
    qname: str
    name: str
    binding: str | None
    value: float
    constant: bool
    state: bool


@dataclass(frozen=True)
class OptimisationInputContext:
    id: int
    qname: str
    name: str
    starting: float
    lower_bound: float
    upper_bound: float


@dataclass(frozen=True)
class OutputContext:
    id: int
    qname: str
    name: str
    binding: str | None


@dataclass(frozen=True)
class InputContext:
    name: str
    value: float


@dataclass(frozen=True)
class DoseEventContext:
    level: float
    start: float
    duration: float


@dataclass(frozen=True)
class DosingProtocolContext:
    id: int
    variable_id: int
    variable_qname: str
    group_id: int | None
    tlag: float
    events: tuple[DoseEventContext, ...]

    @property
    def pacing_label(self) -> str:
        return f"pace_{self.variable_qname.replace('.', '_')}"


@dataclass(frozen=True)
class SimulationGroupContext:
    group_id: int | None
    group_name: str | None
    dosing_protocols: tuple[DosingProtocolContext, ...]
    nonlinear_inputs: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class OptimisationRecordContext:
    output_index: int
    time_index: int
    time: float
    value: float


@dataclass(frozen=True)
class OptimisationGroupContext:
    group_id: int | None
    group_name: str | None
    dosing_protocols: tuple[DosingProtocolContext, ...]
    outputs: tuple[OutputContext, ...]
    t_eval: tuple[float, ...]
    records: tuple[OptimisationRecordContext, ...]
    input_values: dict[str, float]
    nonlinear_inputs: dict[str, float] = field(default_factory=dict)


class SimulateContext:
    """
    Database-backed simulation/optimisation input, normalised into model units.

    This class is deliberately not wired into MyokitModelMixin yet. Its job is to
    centralise the ORM reads and unit conversions currently spread across
    ``simulate()`` and ``optimise()`` so later solver code can operate from this
    object without touching the database.

    Unit objects and conversion factors are intentionally not retained. Values
    stored here are already converted into the corresponding Myokit model units.
    """

    def __init__(
        self,
        model: Any,
        outputs: list[str] | None = None,
        variables: dict[str, float] | None = None,
        time_max: float | None = None,
        optimise_inputs: list[int] | None = None,
        starting: list[float] | None = None,
        bounds: tuple[list[float], list[float]] | list[list[float]] | None = None,
        biomarker_types: list[int] | None = None,
        subject_groups: list[int] | None = None,
    ):
        self._model = model
        self.model_id = model.id
        self.model_table = model._meta.db_table
        self.model_class = model.__class__.__name__
        self._project = self._load_project(model)
        self.project_id = self._project.id if self._project is not None else None
        self.is_library_model = bool(getattr(model, "is_library_model", False))

        self._myokit_model = model.create_myokit_model()
        self.mmt = self._myokit_model.code()
        self.time_qname = self._myokit_model.binding("time").qname()

        self._variables_by_qname = self._load_variables_by_qname(model)
        self._variables_by_id = {
            variable.id: variable for variable in self._variables_by_qname.values()
        }
        self.variable_values = self._build_variable_values(variables)
        self.inputs = self._build_inputs()
        self.time_max = self._build_time_max(model, time_max)

        self.outputs = self._build_outputs(outputs or [])
        self._protocols = self._load_protocols()
        self.simulation_groups = self._build_simulation_groups()

        self.optimise_inputs = ()
        self.optimisation_groups = ()
        if optimise_inputs is not None:
            self.optimise_inputs = self._build_optimise_inputs(
                optimise_inputs,
                starting,
                bounds,
            )
            self.optimisation_groups = self._build_optimisation_groups(
                biomarker_types,
                subject_groups,
            )
        self._discard_database_state()

    def _discard_database_state(self):
        del self._project
        del self._variables_by_qname
        del self._variables_by_id

    def simulate_model(
        self,
        simulation_group: SimulationGroupContext,
    ) -> dict[int, list[float]]:
        model = self._myokit_model
        inputs = self._simulation_inputs(simulation_group)
        outputs = [output.qname for output in self.outputs]

        for input_context in inputs:
            model.get(input_context.name).set_rhs(float(input_context.value))

        sim = myokit.Simulation(
            model,
            protocol=self._myokit_protocols(model, simulation_group),
        )
        sim.set_tolerance(abs_tol=1e-08, rel_tol=1e-08)
        datalog = sim.run(self.time_max, log=outputs)
        return self._model.serialize_datalog(datalog, model)

    def simulate_model_diffsol(
        self,
        simulation_group: SimulationGroupContext,
    ) -> dict[int, list[float]]:
        model = self._myokit_model
        inputs = self._simulation_inputs(simulation_group)
        input_values = np.asarray(
            [input_context.value for input_context in inputs],
            dtype=float,
        )
        outputs = [output.qname for output in self.outputs]
        protocols = self._myokit_protocols(model, simulation_group)
        input_variables = [model.get(input_context.name) for input_context in inputs]
        output_variables = [model.get(output.qname) for output in self.outputs]

        path = ""
        temp = tempfile.NamedTemporaryFile(delete=False)
        try:
            path = temp.name
            temp.close()
            DiffSLExporter().model(
                path,
                model,
                convert_units=False,
                protocol=protocols,
                inputs=input_variables,
                outputs=output_variables,
                final_time=self.time_max,
            )
            with open(path, "r") as exported_file:
                content = exported_file.read()
        finally:
            os.remove(path)

        ode = pydiffsol.Ode(content)
        ode.ode_solver = pydiffsol.esdirk34
        ode.atol = 1e-6
        ode.rtol = 1e-4
        solution = ode.solve(input_values, self.time_max)
        return self._model.serialize_diffsol_solution(solution, model, outputs)

    def _simulation_variable_values(self) -> dict[str, float]:
        return {
            qname: context.value for qname, context in self.variable_values.items()
        }

    def _build_inputs(self) -> tuple[InputContext, ...]:
        return tuple(
            InputContext(name=qname, value=context.value)
            for qname, context in self.variable_values.items()
        )

    def _simulation_inputs(
        self,
        simulation_group: SimulationGroupContext,
    ) -> tuple[InputContext, ...]:
        return self.inputs + tuple(
            InputContext(name=qname, value=value)
            for qname, value in simulation_group.nonlinear_inputs.items()
        )

    def _myokit_protocols(
        self,
        model,
        simulation_group: SimulationGroupContext,
    ) -> dict[str, myokit.Protocol]:
        for protocol_context in simulation_group.dosing_protocols:
            pacing_label = protocol_context.pacing_label
            if not any(
                variable.binding() == pacing_label
                for variable in model.variables(bound=True)
            ):
                set_administration(
                    model,
                    model.get(protocol_context.variable_qname),
                )

        return {
            protocol_context.pacing_label: get_protocol(
                [
                    (event.level, event.start, event.duration)
                    for event in protocol_context.events
                ]
            )
            for protocol_context in simulation_group.dosing_protocols
        }

    def _load_project(self, model):
        project = model.get_project()
        if project is None:
            return None

        from pkpdapp.models import Project

        return (
            Project.objects.select_related(
                "compound",
                "compound__molecular_mass_unit",
                "compound__target_molecular_mass_unit",
                "compound__target2_molecular_mass_unit",
            )
            .filter(pk=project.pk)
            .first()
        )

    def _load_variables_by_qname(self, model):
        variables = model.variables.select_related("unit").all()
        return {variable.qname: variable for variable in variables}

    def _build_variable_values(
        self, variables: dict[str, float] | None
    ) -> dict[str, VariableContext]:
        values = {}
        for variable in self._variables_by_qname.values():
            if not variable.constant:
                continue
            value = self._convert_variable_value(
                variable,
                variable.get_default_value(),
            )
            values[variable.qname] = self._variable_context(variable, value)
        if variables is None:
            return values

        for qname, value in variables.items():
            variable = self._get_variable_by_qname(qname)
            converted_value = self._convert_variable_value(variable, value)
            values[qname] = self._variable_context(variable, converted_value)
        return values

    def _build_time_max(self, model, time_max: float | None) -> float:
        if time_max is None:
            time_max = model.get_time_max()
        time_variable = self._get_variable_by_qname(self.time_qname)
        return self._convert_variable_value(time_variable, time_max)

    def _build_outputs(self, output_qnames: list[str]) -> tuple[OutputContext, ...]:
        return tuple(
            self._output_context(self._get_variable_by_qname(qname))
            for qname in output_qnames
        )

    def _load_protocols(self):
        if self._project is None:
            return []
        return list(
            self._project.protocols.select_related(
                "variable",
                "group",
                "amount_unit",
                "time_unit",
            )
            .prefetch_related("doses")
            .all()
        )

    def _build_simulation_groups(self) -> tuple[SimulationGroupContext, ...]:
        groups = [
            self._simulation_group_context(
                group_id=None,
                group_name=None,
                protocols=self._protocols_for_group(None),
            )
        ]

        subject_groups = sorted(
            self._load_subject_groups(),
            key=lambda group: (not group.name.startswith("Sim"), group.name),
        )
        for group in subject_groups:
            groups.append(
                self._simulation_group_context(
                    group_id=group.id,
                    group_name=group.name,
                    protocols=self._protocols_for_group(group.id),
                )
            )
        return tuple(groups)

    def _load_subject_groups(self):
        if self._project is None:
            return []

        dataset = self._project.datasets.first()
        if dataset is None:
            return list(self._project.groups.all())
        return list(
            dataset.groups.all().union(self._project.groups.all()).order_by("id")
        )

    def _protocols_for_group(self, group_id: int | None):
        return [
            protocol
            for protocol in self._protocols
            if protocol.group_id == group_id and protocol.variable is not None
        ]

    def _simulation_group_context(
        self,
        group_id: int | None,
        group_name: str | None,
        protocols: list[Any],
    ) -> SimulationGroupContext:
        dosing_protocols = tuple(
            self._dosing_protocol_context(protocol) for protocol in protocols
        )
        nonlinear_inputs = self._build_nonlinear_inputs(protocols)
        return SimulationGroupContext(
            group_id=group_id,
            group_name=group_name,
            dosing_protocols=dosing_protocols,
            nonlinear_inputs=nonlinear_inputs,
        )

    def _dosing_protocol_context(self, protocol) -> DosingProtocolContext:
        qname = protocol.variable.qname
        amount_var = self._myokit_model.get(qname)
        tlag = self._get_tlag(qname)
        target = self._unit_conversion_target(qname)
        amount_conversion_factor = self._get_protocol_amount_conversion_factor(
            protocol,
            amount_var,
            target,
        )
        time_conversion_factor = protocol.time_unit.convert_to(
            self._myokit_model.binding("time").unit(),
            compound=self._compound,
        )
        events = self._get_dose_events(
            protocol,
            amount_conversion_factor,
            time_conversion_factor,
            tlag,
            self.time_max,
        )
        return DosingProtocolContext(
            id=protocol.id,
            variable_id=protocol.variable.id,
            variable_qname=qname,
            group_id=protocol.group_id,
            tlag=tlag,
            events=tuple(events),
        )

    def _build_nonlinear_inputs(self, protocols: list[Any]) -> dict[str, float]:
        qname = "PKNonlinearities.C_Drug"
        if (
            not self.is_library_model
            or not self._myokit_model.has_variable(qname)
            or len(protocols) == 0
        ):
            return {}

        myokit_var = self._myokit_model.get(qname)
        dose_sum = 0.0
        for protocol in protocols:
            doses = list(protocol.doses.all())
            if not doses:
                continue
            amount_conversion_factor = self._get_protocol_amount_conversion_factor(
                protocol,
                myokit_var,
                target=None,
            )
            dose_sum += doses[0].amount * amount_conversion_factor

        return {qname: max(dose_sum, 1e-6)}

    def _build_optimise_inputs(
        self,
        input_ids: list[int],
        starting: list[float] | None,
        bounds: tuple[list[float], list[float]] | list[list[float]] | None,
    ) -> tuple[OptimisationInputContext, ...]:
        if len(input_ids) < 1:
            raise ValueError("Optimisation requires at least one input.")
        if len(set(input_ids)) != len(input_ids):
            raise ValueError("Optimisation inputs must be unique.")
        if starting is None or len(starting) != len(input_ids):
            raise ValueError("Starting values must have the same length as inputs.")
        if bounds is None or len(bounds) != 2:
            raise ValueError("Bounds must be a pair of lower and upper bound lists.")

        lower_bounds, upper_bounds = bounds
        if len(lower_bounds) != len(input_ids) or len(upper_bounds) != len(input_ids):
            raise ValueError("Bounds must have the same length as inputs.")

        contexts = []
        for input_id, start, lower, upper in zip(
            input_ids,
            starting,
            lower_bounds,
            upper_bounds,
        ):
            variable = self._variables_by_id.get(input_id)
            if variable is None:
                from pkpdapp.models import Variable

                raise Variable.DoesNotExist(
                    f"Optimisation input variables do not exist: {[input_id]}"
                )
            if not variable.constant:
                raise ValueError(
                    f"Optimisation input {variable.qname} must be a constant variable."
                )
            if variable.qname.endswith("_tlag_ud"):
                raise ValueError(
                    "Optimising tlag variables is not supported by this method."
                )

            converted_start = self._convert_variable_value(variable, start)
            converted_lower = self._convert_variable_value(variable, lower)
            converted_upper = self._convert_variable_value(variable, upper)
            if converted_lower >= converted_upper:
                raise ValueError(
                    f"Lower bound for {variable.qname} must be less than upper bound."
                )
            if converted_start < converted_lower or converted_start > converted_upper:
                raise ValueError(
                    f"Starting value for {variable.qname} must lie within bounds."
                )

            contexts.append(
                OptimisationInputContext(
                    id=variable.id,
                    qname=variable.qname,
                    name=variable.name,
                    starting=converted_start,
                    lower_bound=converted_lower,
                    upper_bound=converted_upper,
                )
            )
        return tuple(contexts)

    def _build_optimisation_groups(
        self,
        biomarker_types: list[int] | None,
        subject_groups: list[int] | None,
    ) -> tuple[OptimisationGroupContext, ...]:
        if self._project is None:
            raise ValueError("Optimisation requires the model to belong to a project.")

        biomarker_type_list = self._load_biomarker_types(biomarker_types)
        biomarkers = self._load_biomarkers(biomarker_type_list, subject_groups)
        group_ids = list(
            biomarkers.order_by("subject__group_id")
            .values_list("subject__group_id", flat=True)
            .distinct()
        )
        if len(group_ids) == 0:
            raise ValueError("No biomarker data were found for optimisation.")

        groups = []
        for group_id in group_ids:
            if group_id is None:
                group_biomarkers = biomarkers.filter(subject__group__isnull=True)
                group_name = None
            else:
                group_biomarkers = biomarkers.filter(subject__group_id=group_id)
                group_name = group_biomarkers[0].subject.group.name
            groups.append(
                self._optimisation_group_context(
                    group_id,
                    group_name,
                    group_biomarkers,
                )
            )
        return tuple(groups)

    def _load_biomarker_types(self, biomarker_type_ids: list[int] | None):
        from pkpdapp.models import BiomarkerType

        model_variable_qnames = set(self._variables_by_qname)
        biomarker_type_qs = BiomarkerType.objects.filter(
            dataset__project=self._project
        )

        if biomarker_type_ids is None:
            biomarker_type_qs = biomarker_type_qs.filter(variable__isnull=False)
        else:
            biomarker_type_qs = biomarker_type_qs.filter(id__in=biomarker_type_ids)
            found_ids = set(biomarker_type_qs.values_list("id", flat=True))
            missing_ids = set(biomarker_type_ids) - found_ids
            if missing_ids:
                raise BiomarkerType.DoesNotExist(
                    f"Biomarker types do not exist in this project: {missing_ids}"
                )

        biomarker_type_list = list(
            biomarker_type_qs.select_related(
                "variable",
                "stored_unit",
                "stored_time_unit",
            ).order_by("id")
        )
        unmapped = [bt.id for bt in biomarker_type_list if bt.variable is None]
        if unmapped:
            raise ValueError(f"Biomarker types are not mapped to variables: {unmapped}")

        invalid = [
            bt.variable.qname
            for bt in biomarker_type_list
            if bt.variable.qname not in model_variable_qnames
        ]
        if invalid:
            raise ValueError(
                f"Biomarker types map to variables outside this model: {invalid}"
            )
        if not biomarker_type_list:
            raise ValueError("No mapped biomarker types were found for optimisation.")

        return biomarker_type_list

    def _load_biomarkers(self, biomarker_type_list, subject_group_ids):
        from pkpdapp.models import Biomarker, SubjectGroup

        biomarkers = Biomarker.objects.filter(
            biomarker_type__in=biomarker_type_list,
            subject__dataset__project=self._project,
        ).select_related(
            "biomarker_type",
            "biomarker_type__variable",
            "biomarker_type__stored_unit",
            "biomarker_type__stored_time_unit",
            "subject",
            "subject__group",
        )

        if subject_group_ids is not None:
            found_group_ids = set(
                SubjectGroup.objects.filter(id__in=subject_group_ids).values_list(
                    "id",
                    flat=True,
                )
            )
            missing_group_ids = set(subject_group_ids) - found_group_ids
            if missing_group_ids:
                raise SubjectGroup.DoesNotExist(
                    f"Subject groups do not exist: {missing_group_ids}"
                )
            biomarkers = biomarkers.filter(subject__group_id__in=subject_group_ids)

        return biomarkers

    def _optimisation_group_context(
        self,
        group_id: int | None,
        group_name: str | None,
        biomarkers,
    ) -> OptimisationGroupContext:
        output_qnames = []
        output_indices = {}
        records = []
        times = []

        for biomarker in biomarkers.order_by("time", "id"):
            biomarker_type = biomarker.biomarker_type
            qname = biomarker_type.variable.qname
            if qname not in output_indices:
                output_indices[qname] = len(output_qnames)
                output_qnames.append(qname)

            myokit_variable = self._myokit_model.get(qname)
            target = self._unit_conversion_target(qname)
            value_conversion_factor = biomarker_type.stored_unit.convert_to(
                myokit_variable.unit(),
                compound=self._compound,
                target=target,
            )
            time_conversion_factor = biomarker_type.stored_time_unit.convert_to(
                self._myokit_model.binding("time").unit(),
                compound=self._compound,
            )

            time_value = float(biomarker.time) * time_conversion_factor
            data_value = float(biomarker.value) * value_conversion_factor
            times.append(time_value)
            records.append(
                {
                    "output_index": output_indices[qname],
                    "time": time_value,
                    "value": data_value,
                }
            )

        t_eval = tuple(sorted(set(times)))
        time_lookup = {time: i for i, time in enumerate(t_eval)}
        record_contexts = tuple(
            OptimisationRecordContext(
                output_index=record["output_index"],
                time_index=time_lookup[record["time"]],
                time=record["time"],
                value=record["value"],
            )
            for record in records
        )

        protocols = self._protocols_for_group(group_id)
        dosing_protocols = tuple(
            self._dosing_protocol_context(protocol) for protocol in protocols
        )
        nonlinear_inputs = self._build_nonlinear_inputs(protocols)
        input_values = {
            qname: variable.value
            for qname, variable in self.variable_values.items()
            if variable.constant
        }
        input_values.update(nonlinear_inputs)
        missing_inputs = [
            input_context.qname
            for input_context in self.optimise_inputs
            if input_context.qname not in input_values
        ]
        if missing_inputs:
            raise ValueError(
                f"Optimisation inputs are missing from DiffSL inputs: {missing_inputs}"
            )

        return OptimisationGroupContext(
            group_id=group_id,
            group_name=group_name,
            dosing_protocols=dosing_protocols,
            outputs=tuple(
                self._output_context(self._get_variable_by_qname(qname))
                for qname in output_qnames
            ),
            t_eval=t_eval,
            records=record_contexts,
            input_values=input_values,
            nonlinear_inputs=nonlinear_inputs,
        )

    def _variable_context(self, variable, value: float) -> VariableContext:
        return VariableContext(
            id=variable.id,
            qname=variable.qname,
            name=variable.name,
            binding=variable.binding,
            value=float(value),
            constant=variable.constant,
            state=variable.state,
        )

    def _output_context(self, variable) -> OutputContext:
        return OutputContext(
            id=variable.id,
            qname=variable.qname,
            name=variable.name,
            binding=variable.binding,
        )

    def _get_variable_by_qname(self, qname: str):
        try:
            return self._variables_by_qname[qname]
        except KeyError:
            from pkpdapp.models import Variable

            raise Variable.DoesNotExist(
                f"Variable with qname {qname} does not exist in model."
            )

    def _convert_variable_value(self, variable, value: float) -> float:
        myokit_variable = self._myokit_model.get(variable.qname)
        if variable.unit is None:
            converted = float(value)
        else:
            converted = float(value) * variable.unit.convert_to(
                myokit_variable.unit(),
                compound=self._compound,
                target=self._unit_conversion_target(variable.qname),
            )
            if (
                self._project is not None
                and self._project.version > 2
                and variable.unit_per_body_weight
            ):
                converted *= self._project.species_weight
        return converted

    def _get_tlag(self, qname: str) -> float:
        context = self.variable_values.get(f"{qname}_tlag_ud")
        if context is None:
            return 0.0
        return context.value

    def _get_protocol_amount_conversion_factor(
        self,
        protocol,
        amount_var,
        target: int | None,
    ) -> float:
        additional_conversion_factor = 1.0
        if (
            self._project is not None
            and self._project.version > 2
            and protocol.amount_per_body_weight
        ):
            additional_conversion_factor = self._project.species_weight

        return (
            protocol.amount_unit.convert_to(
                amount_var.unit(),
                compound=self._compound,
                target=target,
            )
            * additional_conversion_factor
        )

    def _get_dose_events(
        self,
        protocol,
        amount_conversion_factor: float,
        time_conversion_factor: float,
        tlag_time: float,
        time_max: float | None,
    ) -> list[DoseEventContext]:
        events = []
        for dose in protocol.doses.all():
            if dose.repeat_interval <= 0:
                continue
            for repeat_index in range(dose.repeats):
                start = dose.start_time + repeat_index * dose.repeat_interval
                converted_start = time_conversion_factor * start + tlag_time
                converted_duration = time_conversion_factor * dose.duration
                level = (
                    amount_conversion_factor
                    / time_conversion_factor
                    * dose.amount
                    / dose.duration
                )
                if time_max is not None:
                    if abs(converted_start - time_max) < 1e-6:
                        converted_start = time_max
                    elif abs(converted_start + converted_duration - time_max) < 1e-6:
                        converted_duration = time_max - converted_start
                events.append(
                    DoseEventContext(
                        level=level,
                        start=converted_start,
                        duration=converted_duration,
                    )
                )
        return events

    def _unit_conversion_target(self, qname: str) -> int | None:
        if self.is_library_model:
            if "CT1" in qname or "AT1" in qname:
                return 1
            if "CT2" in qname or "AT2" in qname:
                return 2
        return None

    @property
    def _compound(self):
        if self._project is None:
            return None
        return self._project.compound
