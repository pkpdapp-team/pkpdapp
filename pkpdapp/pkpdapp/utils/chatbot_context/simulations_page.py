#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import CombinedModel, Simulation, SimulationPlot
from pkpdapp.utils.chatbot_context.model_parameters import (
    parameter_display_name,
    parameter_priority,
)
from pkpdapp.utils.chatbot_context.model_secondary_parameters import (
    variable_display_name,
)


# ----------------
# simulations page
# ----------------
class SimulationPlotContext(BaseModel):
    left_axis: list[str]
    left_unit: str | None
    right_axis: list[str]
    right_unit: str | None

    @classmethod
    def from_plot(cls, plot: SimulationPlot, model: CombinedModel):
        return cls(
            left_axis=[
                variable_display_name(y_axis.variable, model)
                for y_axis in plot.y_axes.all()
                if not y_axis.right
            ],
            left_unit=plot.y_unit.symbol if plot.y_unit else None,
            right_axis=[
                variable_display_name(y_axis.variable, model)
                for y_axis in plot.y_axes.all()
                if y_axis.right
            ],
            right_unit=plot.y_unit2.symbol if plot.y_unit2 else None,
        )


class SimulationsContext(BaseModel):
    duration: float
    duration_unit: str
    plots: list[SimulationPlotContext]
    slider_parameters: list[str]

    @classmethod
    def from_simulation(cls, simulation: Simulation, model: CombinedModel):
        # same order as the ui sliders
        slider_variables = sorted(
            [slider.variable for slider in simulation.sliders.all()],
            key=parameter_priority,
        )
        return cls(
            duration=simulation.time_max,
            duration_unit=simulation.time_max_unit.symbol,
            plots=[
                SimulationPlotContext.from_plot(plot, model)
                for plot in simulation.plots.all()
            ],
            slider_parameters=[
                parameter_display_name(variable, model)
                for variable in slider_variables
            ],
        )
