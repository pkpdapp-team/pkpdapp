#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from dataclasses import dataclass, field
import hashlib
import logging
import os
import tempfile
from typing import Any

from django.core.cache import cache
from myokit.formats.diffsl import DiffSLExporter
import numpy as np
import myokit
import pydiffsol

from pkpdapp.models.myokit_protocol import (
    get_dosing_events,
    get_protocol,
    set_administration,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VariableContext:
    id: int
    qname: str
    name: str
    binding: str | None
    value: float
    conversion_factor: float
    constant: bool
    state: bool


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


@dataclass(frozen=True, kw_only=True)
class SimulationGroupContext:
    group_id: int | None
    group_name: str | None
    dosing_protocols: tuple[DosingProtocolContext, ...]
    nonlinear_inputs: dict[str, float] = field(default_factory=dict)
    diffsol_ode: Any | None = None


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
        dynamic_inputs: list[int] | None = None,
        use_diffsol: bool = False,
        time_max: float | None = None,
        build_simulation_groups: bool = True,
        discard_database_state: bool = True,
    ):
        self.model_id = model.id
        self.model_table = model._meta.db_table
        self.model_class = model.__class__.__name__
        self.use_diffsol = use_diffsol
        self._project = self._load_project(model)
        self.project_id = self._project.id if self._project is not None else None
        self.is_library_model = bool(getattr(model, "is_library_model", False))

        self._diffsol_cached_count = 0
        self._diffsol_created_count = 0

        self._myokit_model = model.create_myokit_model()
        self.mmt = self._myokit_model.code()
        self.time_qname = self._myokit_model.binding("time").qname()

        self._variables_by_qname = self._load_variables_by_qname(model)
        self._variables_by_id = {
            variable.id: variable for variable in self._variables_by_qname.values()
        }
        self._variable_contexts_by_qname = self._build_variable_contexts()
        self.variable_values = self._build_variable_values(variables)
        self.inputs = self._build_inputs()
        self._input_index_by_variable_id = self._build_input_index_by_variable_id()
        self.dynamic_input_ids = self._validate_dynamic_inputs(dynamic_inputs)
        if not use_diffsol:
            self._set_base_input_rhs()
        self.time_max = self._build_time_max(model, time_max)

        self.outputs = self._build_outputs(outputs or [])
        self._protocols = self._load_protocols()
        self.simulation_groups: tuple[SimulationGroupContext, ...] = (
            self._build_simulation_groups() if build_simulation_groups else ()
        )
        if discard_database_state:
            self._discard_database_state()

        logger.info(
            "SimulateContext model=%s/%s diffsol_odes cached=%d created=%d",
            self.model_table,
            self.model_id,
            self._diffsol_cached_count,
            self._diffsol_created_count,
        )

    def _discard_database_state(self):
        del self._project
        del self._variables_by_qname
        del self._variables_by_id
        del self._protocols

    def simulate_model(
        self,
        simulation_group: SimulationGroupContext,
        values_by_id: dict[int, float] | None = None,
        t_eval: np.ndarray | None = None,
    ) -> dict[int, list[float]]:
        model = self._myokit_model
        inputs = self._simulation_inputs(simulation_group, values_by_id)
        outputs = [output.qname for output in self.outputs]

        if simulation_group.diffsol_ode is not None:
            input_values = np.asarray(
                [input_context.value for input_context in inputs],
                dtype=float,
            )
            try:
                if t_eval is not None:
                    solution = simulation_group.diffsol_ode.solve_dense(
                        input_values, t_eval,
                    )
                else:
                    solution = simulation_group.diffsol_ode.solve(
                        input_values, self.time_max,
                    )
            except Exception as e:
                logger.error(
                    "Diffsol solver error for model=%s/%s: %s",
                    self.model_table,
                    self.model_id,
                    str(e),
                )
            else:
                return self.serialize_diffsol_solution(solution, model, outputs)

        self._set_input_rhs(inputs)
        sim = myokit.Simulation(
            model,
            protocol=self._myokit_protocols(model, simulation_group),
        )
        sim.set_tolerance(abs_tol=1e-08, rel_tol=1e-08)
        datalog = sim.run(self.time_max, log=outputs)
        return self.serialize_datalog(datalog, model)

    def serialize_datalog(self, datalog, myokit_model) -> dict[int, list[float]]:
        result = {}
        for qname, values in datalog.items():
            variable = self._get_variable_context(qname)
            result[variable.id] = (
                np.frombuffer(values) / variable.conversion_factor
            ).tolist()
        return result

    def serialize_diffsol_solution(
        self,
        solution,
        myokit_model,
        outputs: list[str],
    ) -> dict[int, list[float]]:
        result = {}
        for index, output_qname in enumerate(outputs):
            values = solution.ys[index, :]
            variable = self._get_variable_context(output_qname)
            result[variable.id] = (values / variable.conversion_factor).tolist()
        return result

    def _simulation_variable_values(self) -> dict[str, float]:
        return {qname: context.value for qname, context in self.variable_values.items()}

    def _get_cached_diffsol_ode(self, content: str):
        cache_key = self._diffsol_ode_cache_key(content)
        ode = cache.get(cache_key)
        if ode is None:
            ode = pydiffsol.Ode(content)
            ode.ode_solver = pydiffsol.bdf
            ode.atol = 1e-6
            ode.rtol = 1e-4
            cache.set(cache_key, ode, timeout=None)
            self._diffsol_created_count += 1
        else:
            self._diffsol_cached_count += 1
        return ode

    def _diffsol_ode_cache_key(self, content: str) -> str:
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        return (
            f"simulate_context_diffsol_ode_"
            f"{self.model_table}_{self.model_id}_{content_hash}"
        )

    def _build_inputs(self) -> tuple[InputContext, ...]:
        return tuple(
            InputContext(name=qname, value=context.value)
            for qname, context in self.variable_values.items()
        )

    def _build_input_index_by_variable_id(self) -> dict[int, int]:
        return {
            self._variables_by_qname[input_context.name].id: index
            for index, input_context in enumerate(self.inputs)
        }

    def _validate_dynamic_inputs(
        self, dynamic_inputs: list[int] | None
    ) -> tuple[int, ...]:
        if dynamic_inputs is None:
            return ()

        if len(set(dynamic_inputs)) != len(dynamic_inputs):
            raise ValueError("Dynamic inputs must be unique.")

        validated_inputs = []
        for input_id in dynamic_inputs:
            variable = self._variables_by_id.get(input_id)
            if variable is None:
                from pkpdapp.models import Variable

                raise Variable.DoesNotExist(
                    f"Dynamic input variables do not exist: {[input_id]}"
                )
            if not variable.constant:
                raise ValueError(
                    f"Dynamic input {variable.qname} must be a constant variable."
                )
            if variable.qname.endswith("_tlag_ud"):
                raise ValueError(
                    "Dynamic tlag variables are not supported by this method."
                )
            if variable.id not in self._input_index_by_variable_id:
                raise ValueError(
                    "Dynamic inputs are missing from context inputs: "
                    f"[{variable.id}]"
                )
            validated_inputs.append(variable.id)

        return tuple(validated_inputs)

    def _set_base_input_rhs(self):
        self._set_input_rhs(self.inputs)

    def _set_input_rhs(self, inputs: tuple[InputContext, ...]):
        for input_context in inputs:
            self._myokit_model.get(input_context.name).set_rhs(
                float(input_context.value)
            )

    def _simulation_inputs(
        self,
        simulation_group: SimulationGroupContext,
        values_by_id: dict[int, float] | None = None,
    ) -> tuple[InputContext, ...]:
        inputs = list(self.inputs)
        if values_by_id is not None:
            for variable_id in self.dynamic_input_ids:
                input_index = self._input_index_by_variable_id[variable_id]
                input_context = inputs[input_index]
                inputs[input_index] = InputContext(
                    name=input_context.name,
                    value=float(values_by_id[variable_id]),
                )
        inputs.extend(
            InputContext(name=qname, value=float(value))
            for qname, value in simulation_group.nonlinear_inputs.items()
        )
        return tuple(inputs)

    @property
    def input_index_by_variable_id(self) -> dict[int, int]:
        return self._input_index_by_variable_id

    def get_variable_context(self, qname: str) -> VariableContext:
        return self._get_variable_context(qname)

    def get_input_name(self, variable_id: int) -> str:
        return self.inputs[self._input_index_by_variable_id[variable_id]].name

    def _myokit_protocols(
        self,
        model,
        simulation_group: SimulationGroupContext,
    ) -> dict[str, myokit.Protocol]:
        active_protocols = [
            protocol_context
            for protocol_context in simulation_group.dosing_protocols
            if len(protocol_context.events) > 0
        ]

        for protocol_context in active_protocols:
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
            for protocol_context in active_protocols
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

    def _build_variable_contexts(self) -> dict[str, VariableContext]:
        contexts = {}
        for variable in self._variables_by_qname.values():
            value = 0.0
            if variable.constant:
                value = self._convert_variable_value(
                    variable,
                    variable.get_default_value(),
                )
            contexts[variable.qname] = self._variable_context(variable, value)
        return contexts

    def _build_variable_values(
        self, variables: dict[str, float] | None
    ) -> dict[str, VariableContext]:
        values = {}
        for variable in self._variables_by_qname.values():
            if not variable.constant:
                continue
            values[variable.qname] = self._variable_contexts_by_qname[variable.qname]
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
        from pkpdapp.models.variable import Variable

        try:
            time_variable = self._get_variable_by_qname(self.time_qname)
        except Variable.DoesNotExist:
            return float(time_max)
        return self._convert_variable_value(time_variable, time_max)

    def _build_outputs(self, output_qnames: list[str]) -> tuple[OutputContext, ...]:
        return tuple(
            self._output_context(self._get_variable_by_qname(qname))
            for qname in output_qnames
        )

    def _load_protocols(self):
        from pkpdapp.models import Protocol

        protocols = []
        if self.model_class == "CombinedModel":
            for protocol in (
                Protocol.objects.filter(variable__dosed_pk_model=self.model_id)
                .select_related("variable", "group", "amount_unit", "time_unit")
                .prefetch_related("doses")
            ):
                protocols.append(protocol)

        return protocols

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
        simulation_group = SimulationGroupContext(
            group_id=group_id,
            group_name=group_name,
            dosing_protocols=dosing_protocols,
            nonlinear_inputs=nonlinear_inputs,
        )

        if self.use_diffsol:
            return SimulationGroupContext(
                group_id=group_id,
                group_name=group_name,
                dosing_protocols=dosing_protocols,
                nonlinear_inputs=nonlinear_inputs,
                diffsol_ode=self._build_diffsol_ode(simulation_group),
            )

        return simulation_group

    def _build_diffsol_ode(
        self,
        simulation_group: SimulationGroupContext,
        outputs: list[str] | None = None,
    ):
        model = self._myokit_model
        inputs = self._simulation_inputs(simulation_group)
        protocols = self._myokit_protocols(model, simulation_group)
        input_variables = [model.get(input_context.name) for input_context in inputs]
        output_variables = [
            model.get(output_qname)
            for output_qname in (outputs or [output.qname for output in self.outputs])
        ]

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

        return self._get_cached_diffsol_ode(content)

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

    def _variable_context(self, variable, value: float) -> VariableContext:
        return VariableContext(
            id=variable.id,
            qname=variable.qname,
            name=variable.name,
            binding=variable.binding,
            value=float(value),
            conversion_factor=self._conversion_factor(variable),
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

    def _get_variable_context(self, qname: str) -> VariableContext:
        try:
            return self._variable_contexts_by_qname[qname]
        except KeyError:
            from pkpdapp.models import Variable

            raise Variable.DoesNotExist(
                f"Variable with qname {qname} does not exist in model."
            )

    def _conversion_factor(self, variable) -> float:
        myokit_variable = self._myokit_model.get(variable.qname)
        if variable.unit is None:
            return 1.0

        conversion_factor = variable.unit.convert_to(
            myokit_variable.unit(),
            compound=self._compound,
            target=self._unit_conversion_target(variable.qname),
        )
        if (
            self._project is not None
            and self._project.version > 2
            and variable.unit_per_body_weight
        ):
            conversion_factor *= self._project.species_weight
        return conversion_factor

    def _convert_variable_value(self, variable, value: float) -> float:
        return float(value) * self._conversion_factor(variable)

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
        return [
            DoseEventContext(level=level, start=start, duration=duration)
            for level, start, duration in get_dosing_events(
                protocol.doses,
                amount_conversion_factor,
                time_conversion_factor,
                tlag_time,
                time_max,
            )
        ]

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
