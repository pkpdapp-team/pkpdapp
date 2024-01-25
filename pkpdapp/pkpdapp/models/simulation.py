#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.validators import MinValueValidator


# class to store options for simulation and plotting of results
# a project can have multiple simulations
class Simulation(models.Model):
    """
    A simulation, containing multiple :model:`pkpdapp.Dataset`,
    :model:`pkpdapp.PkpdModel` and users.
    """

    name = models.CharField(max_length=100, help_text="name of the simulation")

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="simulations",
    )

    nrows = models.IntegerField(default=1, help_text="number of subplot rows")

    ncols = models.IntegerField(default=1, help_text="number of subplot columns")

    time_max = models.FloatField(
        default=30,
        validators=[MinValueValidator(0)],
        help_text="maximum time for the simulation",
    )

    time_max_unit = models.ForeignKey(
        "Unit",
        on_delete=models.PROTECT,
        related_name="simulation_time_max",
        help_text="unit for maximum time",
    )

    abs_tolerance = models.FloatField(
        default=1e-6,
        validators=[MinValueValidator(0)],
        help_text="absolute tolerance for the simulation",
    )

    rel_tolerance = models.FloatField(
        default=1e-6,
        validators=[MinValueValidator(0)],
        help_text="relative tolerance for the simulation",
    )

    def get_project(self):
        return self.project

    def copy(self, project, variable_map):
        kwargs = {
            "name": self.name,
            "project": project,
            "nrows": self.nrows,
            "ncols": self.ncols,
            "time_max": self.time_max,
            "time_max_unit": self.time_max_unit,
            "abs_tolerance": self.abs_tolerance,
            "rel_tolerance": self.rel_tolerance,
        }
        new_simulation = Simulation.objects.create(**kwargs)
        for plot in self.plots.all():
            plot.copy(new_simulation, variable_map)
        for slider in self.sliders.all():
            slider.copy(new_simulation, variable_map)
        return new_simulation


# model for a simulation plot


class SimulationPlot(models.Model):
    simulation = models.ForeignKey(
        "Simulation", on_delete=models.CASCADE, related_name="plots"
    )
    index = models.IntegerField(help_text="index of the plot in the simulation")

    class ScaleOptions(models.TextChoices):
        LINEAR = "lin", "Linear"
        LOG2 = "lg2", "Log2"
        LOG10 = "lg10", "Log10"
        LN = "ln", "Ln"

    x_scale = models.CharField(
        max_length=4,
        choices=ScaleOptions.choices,
        default=ScaleOptions.LINEAR,
        help_text="scale for x axis",
    )

    y_scale = models.CharField(
        max_length=4,
        choices=ScaleOptions.choices,
        default=ScaleOptions.LINEAR,
        help_text="scale for y axis",
    )

    y2_scale = models.CharField(
        max_length=4,
        choices=ScaleOptions.choices,
        default=ScaleOptions.LINEAR,
        help_text="scale for rhs y axis",
    )

    x_unit = models.ForeignKey(
        "Unit",
        on_delete=models.PROTECT,
        related_name="simulation_plots",
        help_text="unit for x axis",
    )

    y_unit = models.ForeignKey(
        "Unit",
        on_delete=models.PROTECT,
        related_name="simulation_plots_y",
        null=True,
        blank=True,
        help_text="unit for y axis",
    )

    y_unit2 = models.ForeignKey(
        "Unit",
        on_delete=models.PROTECT,
        related_name="simulation_plots_y2",
        null=True,
        blank=True,
        help_text="unit for rhs y axis",
    )

    min = models.FloatField(
        null=True, blank=True, help_text="lower bound for the y axis"
    )

    max = models.FloatField(
        null=True, blank=True, help_text="upper bound for the y axis"
    )

    min2 = models.FloatField(
        null=True, blank=True, help_text="lower bound for the rhs y axis"
    )

    max2 = models.FloatField(
        null=True, blank=True, help_text="upper bound for the rhs y axis"
    )

    def get_project(self):
        return self.simulation.project

    def copy(self, new_simulation, variable_map):
        kwargs = {
            "simulation": new_simulation,
            "index": self.index,
            "x_scale": self.x_scale,
            "y_scale": self.y_scale,
            "y2_scale": self.y2_scale,
            "x_unit": self.x_unit,
            "y_unit": self.y_unit,
            "y_unit2": self.y_unit2,
            "min": self.min,
            "max": self.max,
            "min2": self.min2,
            "max2": self.max2,
        }
        new_plot = SimulationPlot.objects.create(**kwargs)
        for y_axis in self.y_axes.all():
            y_axis.copy(new_plot, variable_map)
        for cx_line in self.cx_lines.all():
            cx_line.copy(new_plot)
        return new_plot


# model for mapping a variable to a y axis
class SimulationYAxis(models.Model):
    plot = models.ForeignKey(
        "SimulationPlot", on_delete=models.CASCADE, related_name="y_axes"
    )

    variable = models.ForeignKey(
        "Variable", on_delete=models.CASCADE, related_name="y_axes"
    )

    # if true, the variable is plotted on the right y axis
    right = models.BooleanField(
        default=False, help_text="True if the variable is plotted on the right y axis"
    )

    def copy(self, new_plot, variable_map):
        kwargs = {
            "plot": new_plot,
            "variable": variable_map[self.variable],
            "right": self.right,
        }
        return SimulationYAxis.objects.create(**kwargs)


# model for a slider on the plot. the sliders alter the value of a variable
# in the model
class SimulationSlider(models.Model):
    simulation = models.ForeignKey(
        "Simulation", on_delete=models.CASCADE, related_name="sliders"
    )

    variable = models.ForeignKey(
        "Variable", on_delete=models.CASCADE, related_name="sliders"
    )

    def copy(self, new_simulation, variable_map):
        kwargs = {
            "simulation": new_simulation,
            "variable": variable_map[self.variable],
        }
        return SimulationSlider.objects.create(**kwargs)


class SimulationCxLine(models.Model):
    plot = models.ForeignKey(
        "SimulationPlot", on_delete=models.CASCADE, related_name="cx_lines"
    )

    value = models.FloatField(help_text="value of the line")

    def copy(self, new_plot):
        kwargs = {
            "plot": new_plot,
            "value": self.value,
        }
        return SimulationCxLine.objects.create(**kwargs)
