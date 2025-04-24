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


def import_model(model_cls, filename, user):
    


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

        # ----------------------------
        # COMPOUNDS
        # ----------------------------
        df = pd.read_csv(f"{username}_compounds.csv")
        for _, row in df.iterrows():
            row_d = row.to_dict()
            for key in ["efficacy_experiments__id", "project__id", "protocol__id", "use_efficacy__id"]:
                row_d.pop(key)

            name = row_d["name"]
            new_name = f"{name} (imported)"
            if Compound.objects.filter(name=new_name).exists():
                Compound.objects.filter(name=new_name).delete()
            row_d["name"] = new_name

            model_instance = Compound(**row_d)

            # save the instance to the database
            model_instance.save()

            project_access = ProjectAccess(project=model_instance, user=user)
            project_access.save()
            print("Compound imported:", model_instance.name, model_instance.id)


        # ----------------------------
        # PROJECTS
        # ----------------------------
        df = pd.read_csv(f"{username}_projects.csv")
        for _, row in df.iterrows():
            row_d = row.to_dict()
            for key in [
                "projectaccess__id",
                "results__id",
                "groups__id",
                "protocols__id",
                "pd_models__id",
                "pd_models__name",
                "pk_models__id",
                "datasets__id",
                "simulations__id",
                "inference__id",
                "users__id",
                "users__username",
            ]:
                row_d.pop(key)

            name = row_d["name"]
            new_name = f"{name} (imported)"
            if Project.objects.filter(name=new_name).exists():
                Project.objects.filter(name=new_name).delete()
            row_d["name"] = new_name

            model_instance = Project(**row_d)

            # save the instance to the database
            model_instance.save()

            project_access = ProjectAccess(project=model_instance, user=user)
            project_access.save()
            print("Project imported:", model_instance.name, model_instance.id)
