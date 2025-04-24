from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from pkpdapp.models import (
    ProjectAccess,
    CombinedModel,
    Compound,
    Simulation,
    SimulationPlot,
    SimulationCxLine,
    SimulationSlider,
    SimulationYAxis,
    Dataset,
    Protocol,
    Dose,
    Biomarker,
    BiomarkerType,
    CategoricalBiomarker,
    EfficacyExperiment,
    Subject,
    SubjectGroup,
    ResultsTable,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Unit,
)
import pandas as pd


def models_to_csv(models, filename):
    if not models:
        # write an empty file
        with open(filename, "w") as f:
            f.write("")
        return
    first_model = models.first()
    field_names = []
    fields = first_model._meta.get_fields()
    for field in fields:
        if field.is_relation:
            if field.related_model == Unit:
                field_names.append(f"{field.name}__id")
                field_names.append(f"{field.name}__symbol")
            elif field.related_model == User:
                field_names.append(f"{field.name}__id")
                field_names.append(f"{field.name}__username")
            elif field.related_model == PharmacodynamicModel:
                field_names.append(f"{field.name}__id")
                field_names.append(f"{field.name}__name")
            elif field.related_model == PharmacokineticModel:
                field_names.append(f"{field.name}__id")
                field_names.append(f"{field.name}__name")
            else:
                field_names.append(f"{field.name}__id")
        else:
            field_names.append(field.name)

    models = list(models.values(*field_names))
    df = pd.DataFrame(models)
    df.to_csv(filename, index=False)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("username", type=str)

    def handle(self, *args, **options):
        username = options["username"]
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            current_users = User.objects.all()
            current_usernames = [u.username for u in current_users]
            raise CommandError(
                f'User "{username}" does not exist. '
                f'Current users are: {", ".join(current_usernames)}'
            )

        # find all projects the user has access to and are not readonly
        projects = Project.objects.filter(
            projectaccess__user=user,
            projectaccess__read_only=False,
        )
        models_to_csv(projects, f"{username}_projects.csv")

        # find all the compounds for those projects
        compounds = Compound.objects.filter(
            project__in=projects,
        )
        models_to_csv(compounds, f"{username}_compounds.csv")
        efficacy_experiments = EfficacyExperiment.objects.filter(
            compound__in=compounds,
        )
        models_to_csv(efficacy_experiments, f"{username}_efficacy_experiments.csv")

        # find all the combined models for those projects
        # remember that on import you should run updates on the combined models
        combined_models = CombinedModel.objects.filter(
            project__in=projects,
        )
        models_to_csv(combined_models, f"{username}_combined_models.csv")

        # data sets and associated protocols and biomarkers
        datasets = Dataset.objects.filter(
            project__in=projects,
        )
        models_to_csv(datasets, f"{username}_datasets.csv")
        protocols = Protocol.objects.filter(
            dataset__in=datasets,
        )
        models_to_csv(protocols, f"{username}_protocols.csv")
        subjects = Subject.objects.filter(
            dataset__in=datasets,
        )
        models_to_csv(subjects, f"{username}_subjects.csv")
        subject_groups = SubjectGroup.objects.filter(
            dataset__in=datasets,
        )
        models_to_csv(subject_groups, f"{username}_subject_groups.csv")
        doses = Dose.objects.filter(
            protocol__in=protocols,
        )
        models_to_csv(doses, f"{username}_doses.csv")
        biomarker_types = BiomarkerType.objects.filter(
            dataset__in=datasets,
        )
        models_to_csv(biomarker_types, f"{username}_biomarker_types.csv")
        biomarkers = Biomarker.objects.filter(
            biomarker_type__in=biomarker_types,
        )
        models_to_csv(biomarkers, f"{username}_biomarkers.csv")
        categorical_biomarkers = CategoricalBiomarker.objects.filter(
            biomarker_type__in=biomarker_types,
        )
        models_to_csv(categorical_biomarkers, f"{username}_categorical_biomarkers.csv")

        # find all the simulations for those projects, and associated models
        simulations = Simulation.objects.filter(
            project__in=projects,
        )
        models_to_csv(simulations, f"{username}_simulations.csv")
        simulation_plots = SimulationPlot.objects.filter(
            simulation__in=simulations,
        )
        models_to_csv(simulation_plots, f"{username}_simulation_plots.csv")
        simulation_cx_lines = SimulationCxLine.objects.filter(
            plot__in=simulation_plots,
        )
        models_to_csv(simulation_cx_lines, f"{username}_simulation_cx_lines.csv")
        simulation_sliders = SimulationSlider.objects.filter(
            simulation__in=simulations,
        )
        models_to_csv(simulation_sliders, f"{username}_simulation_sliders.csv")
        simulation_y_axes = SimulationYAxis.objects.filter(
            plot__in=simulation_plots,
        )
        models_to_csv(simulation_y_axes, f"{username}_simulation_y_axes.csv")
        results_tables = ResultsTable.objects.filter(
            project__in=projects,
        )
        models_to_csv(results_tables, f"{username}_results_tables.csv")
