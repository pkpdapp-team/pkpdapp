#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.validators import MinValueValidator

from pkpdapp.models import (
    Inference,
    InferenceMixin,
    LogLikelihood,
    Algorithm,
)


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

    def quickfit(self, params: dict):
        """
        Perform an automatic quickfit of the current slider variable of the simulation.
        All the observed data in the project will be used for the quickfit.
        A sum of squares objective function will be used to fit the data.
        The current value of the sliders will be used as the initial guess for the fit.
        The bounds of the sliders will be used as the bounds for the fit.
        The

        Parameters
        ----------
        sliders : dict
            A dictionary mapping variable qnames to an object with the following attributes:
            - value: the current value of the slider
            - min: the minimum value of the slider
            - max: the maximum value of the slider

        Returns
        -------
        dict
            A dictionary mapping the qname of the variable to the fitted value.
            The qname is the name of the variable in the model.
        """
        model = self.project.pk_models.first()
        my_sliders = self.sliders.all()
        for slider in my_sliders:
            if slider.variable.qname not in params:
                raise ValueError(
                    f"Slider {slider.variable.name} not found in the provided sliders."
                )
            param = params[slider.variable.qname]
            if "value" not in param or "min" not in param or "max" not in param:
                raise ValueError(
                    f"Slider {slider.variable.name} does not have the required attributes."
                )

        algorithm = Algorithm.objects.get(name="XNES")
        inference = Inference.objects.create(
            name="quickfit",
            project=self.project,
            max_number_of_iterations=100,
            algorithm=algorithm,
            number_of_chains=4,
        )

        dataset = self.project.datasets.first()
        output_names = {}
        for bt in dataset.biomarker_types.all():
            if bt.mapped_qname != "":
                output_names[bt.mapped_qname] = bt

        if len(output_names) == 0:
            raise ValueError("No output names found in the dataset.")

        first_name = list(output_names.keys())[0]
        variable_of_model = model.variables.get(qname=first_name)

        log_likelihood = LogLikelihood.objects.create(
            variable=variable_of_model,
            inference=inference,
            form=LogLikelihood.Form.MODEL,
        )
        # remove all outputs except output_names
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                print("keeping output", output.variable.qname)
                output.parent.biomarker_type = output_names[output.variable.qname]
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

        # set uniform prior on all params, fixed for others
        for param in log_likelihood.parameters.all():
            if param.variable.qname not in params:
                print("fixing", param.variable.qname)
                param.set_fixed(param.variable.default_value)
            else:
                param_prior = params[param.variable.qname]
                print("setting prior", param.variable.qname)
                param.set_uniform_prior(param_prior["min"], param_prior["max"])

        inference_mixin = InferenceMixin(inference)
        inference_mixin.run_inference()

        ret = {}
        for result in inference.get_maximum_likelihood():
            inference_var = result.log_likelihood.outputs.first().variable
            # noise variables won't have a model variable
            if inference_var is not None:
                model_var = model.variables.filter(qname=inference_var.qname).first()
            else:
                model_var = None
            if model_var is not None:
                ret[model_var.qname] = result.value
        return ret


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

    x_label = models.CharField(max_length=100, blank=True, help_text="label for x axis")

    y_label = models.CharField(max_length=100, blank=True, help_text="label for y axis")

    y2_label = models.CharField(
        max_length=100, blank=True, help_text="label for rhs y axis"
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
