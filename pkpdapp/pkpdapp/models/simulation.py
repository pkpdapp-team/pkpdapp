#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse




## class to store options for simulation and plotting of results
## a project can have multiple simulations
class Simulation(models.Model):
    """
    A simulation, containing multiple :model:`pkpdapp.Dataset`,
    :model:`pkpdapp.PkpdModel` and users.
    """
    name = models.CharField(max_length=100, help_text='name of the simulation')

    project = models.ForeignKey(
        'Project', on_delete=models.CASCADE,
        related_name='simulations',
    )

    nrows = models.IntegerField(
        default=1,
        help_text='number of subplot rows'
    )

    ncols = models.IntegerField(
        default=1,
        help_text='number of subplot columns'
    )

    def get_project(self):
        return self.project

# model for a simulation plot
class SimulationPlot(models.Model):
    simulation = models.ForeignKey(
        'Simulation', on_delete=models.CASCADE,
        related_name='plots'
    )
    index = models.IntegerField(
        help_text='index of the plot in the simulation'
    )

    x_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulation_plots',
        help_text='unit for x axis'
    )

    y_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulation_plots_y',
        null=True, blank=True,
        help_text='unit for y axis'
    )

    y_unit2 = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulation_plots_y2',
        null=True, blank=True,
        help_text='unit for rhs y axis'
    )

    def get_project(self):
        return self.simulation.project


# model for mapping a variable to a y axis
class SimulationYAxis(models.Model):
    plot = models.ForeignKey(
        'SimulationPlot', on_delete=models.CASCADE,
        related_name='y_axes'
    )

    variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='y_axes'
    )

    # if true, the variable is plotted on the right y axis
    right = models.BooleanField(
        default=False,
        help_text='True if the variable is plotted on the right y axis'
    )


# model for a slider on the plot. the sliders alter the value of a variable
# in the model
class SimulationSlider(models.Model):
    simulation = models.ForeignKey(
        'Simulation', on_delete=models.CASCADE,
        related_name='sliders'
    )

    variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='sliders'
    )


class SimulationCxLine(models.Model):
    plot = models.ForeignKey(
        'SimulationPlot', on_delete=models.CASCADE,
        related_name='cx_lines'
    )

    value = models.FloatField(
        help_text='value of the line'
    )

    

