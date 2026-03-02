#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction
from django.test import override_settings
from rest_framework.test import APIClient
from pkpdapp.models import (
    Project,
    Compound,
    CombinedModel,
    Protocol,
    Dose,
    Unit,
    PharmacokineticModel,
    PharmacodynamicModel,
    Dataset,
)


class Command(BaseCommand):
    help = "Generate TypeScript mock files for Storybook tests from Django API"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Clean the database before generating (deletes all test data)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview what would be generated without writing files",
        )

    def handle(self, **options):
        clean = options["clean"]
        dry_run = options["dry_run"]

        self.stdout.write(self.style.SUCCESS("Starting Storybook mock generation..."))
        self.stdout.write("Generating TWO sets of mocks:")
        self.stdout.write("  1. Mocks WITHOUT dataset data -> generated-mocks/")
        self.stdout.write("  2. Mocks WITH dataset data -> generated-mocks-with-data/")

        # Use transaction to ensure database integrity
        with transaction.atomic():
            # Step 1: Clean database if requested
            if clean:
                self.stdout.write("Cleaning test data...")
                self._clean_test_data()

            # Step 2: Create test data
            self.stdout.write("\nCreating test data (without dataset)...")
            test_data = self._create_test_data()

            # Step 3: Collect API responses (without dataset)
            self.stdout.write("Collecting API responses...")
            api_responses = self._collect_api_responses(test_data)

            # Step 4: Generate TypeScript mock files WITHOUT dataset
            output_dir_no_data = "../frontend-v2/src/stories/generated-mocks"
            if not dry_run:
                self.stdout.write(f"\nGenerating mocks WITHOUT dataset in {output_dir_no_data}...")
                self._generate_mock_files(api_responses, output_dir_no_data)
            else:
                self.stdout.write(self.style.WARNING("Dry run mode - no files written"))
                self.stdout.write(f"Would generate files in: {output_dir_no_data}")

            # Step 5: Create dataset with CSV data
            self.stdout.write("\n" + "="*60)
            self.stdout.write("Creating dataset with CSV data...")
            dataset_data = self._create_dataset_with_csv(test_data)

            # Step 6: Collect API responses WITH dataset
            self.stdout.write("Collecting API responses with dataset...")
            dataset_api_responses = self._collect_dataset_api_responses(dataset_data)

            # Step 7: Generate TypeScript mock files WITH dataset
            output_dir_with_data = "../frontend-v2/src/stories/generated-mocks-with-data"
            if not dry_run:
                self.stdout.write(f"\nGenerating mocks WITH dataset in {output_dir_with_data}...")
                self._generate_mock_files(dataset_api_responses, output_dir_with_data)

            # Step 8: Report summaries
            self._print_summary(api_responses, test_data, "WITHOUT dataset")
            self._print_dataset_summary(dataset_api_responses, dataset_data)

        self.stdout.write(self.style.SUCCESS("\nMock generation complete!"))

    def _clean_test_data(self):
        """Clean test data from database"""
        # Delete in order to respect foreign key constraints
        Dose.objects.all().delete()
        Protocol.objects.all().delete()
        CombinedModel.objects.all().delete()
        Project.objects.all().delete()
        Compound.objects.all().delete()
        User.objects.filter(username="storybook_test_user").delete()

    def _create_test_data(self):
        """Create test data in database"""
        # Step 1: Create user
        user, created = User.objects.get_or_create(
            username="storybook_test_user",
            defaults={
                "email": "test@pkpdapp.com",
                "first_name": "Storybook",
                "last_name": "Test",
            },
        )
        if created:
            user.set_password("testpass123")
            user.save()

        # Step 2: Create compound
        compound = Compound.objects.create(
            name="Test Compound",
            description="Automatically generated test compound for Storybook",
            compound_type="S",  # SMALL_MOLECULE
            molecular_mass=500.0,
            molecular_mass_unit=Unit.objects.get(symbol="g/mol"),
        )

        # Step 3: Create project
        project = Project.objects.create(
            name="Storybook Test Project",
            description="Automatically generated for Storybook mocks",
            compound=compound,
            species="R",  # Rat
            species_weight=0.25,
            species_weight_unit=Unit.objects.get(symbol="kg"),
            version=3,
        )
        project.users.add(user)

        # Step 4: Create combined model
        pk_model = PharmacokineticModel.objects.get(name="1-compartmental model")
        pd_model = PharmacodynamicModel.objects.get(
            name="Direct effect model (inhibitory)"
        )

        combined_model = CombinedModel.objects.create(
            name="1-compartmental + Direct effect",
            project=project,
            pk_model=pk_model,
            pd_model=pd_model,
            species="R",
            has_effect=False,
            has_saturation=False,
            has_extravascular=True,
            time_max=30.0,
        )

        # Step 5: Create PK-PD mapping
        c1 = combined_model.variables.get(name="C1")
        c_drug = combined_model.variables.get(name="C_Drug")
        combined_model.mappings.create(pk_variable=c1, pd_variable=c_drug)

        # Step 6: Create protocol with dose
        a1_variable = combined_model.variables.get(name="A1")

        protocol = Protocol.objects.create(
            name="Single IV dose",
            project=project,
            compound=compound,
            variable=a1_variable,
            dose_type="D",  # Direct/IV
            time_unit=Unit.objects.get(symbol="h"),
            amount_unit=Unit.objects.get(symbol="mg"),
        )

        dose = Dose.objects.create(
            protocol=protocol,
            start_time=0,
            amount=100,
            duration=0.001,
            repeats=1,
            repeat_interval=24,
        )

        return {
            "user": user,
            "compound": compound,
            "project": project,
            "combined_model": combined_model,
            "protocol": protocol,
            "dose": dose,
            "pk_model": pk_model,
            "pd_model": pd_model,
        }

    @override_settings(ALLOWED_HOSTS=['*'])
    def _collect_api_responses(self, test_data):
        """Collect API responses from all relevant endpoints"""
        client = APIClient()
        client.force_authenticate(user=test_data["user"])

        responses = {}
        project_id = test_data["project"].id
        compound_id = test_data["compound"].id
        pd_model_id = test_data["pd_model"].id
        dose_id = test_data["dose"].id

        # Core project endpoints
        responses["project_list"] = client.get("/api/project/").json()
        responses["project_detail"] = client.get(f"/api/project/{project_id}/").json()
        responses["user_list"] = client.get("/api/user/").json()
        responses["compound_detail"] = client.get(f"/api/compound/{compound_id}/").json()

        # Model endpoints
        responses["combined_model_list"] = client.get(
            f"/api/combined_model/?project_id={project_id}"
        ).json()
        responses["pk_model_list"] = client.get("/api/pharmacokinetic/").json()
        responses["pd_model_list"] = client.get("/api/pharmacodynamic/").json()
        responses["pd_model_detail"] = client.get(
            f"/api/pharmacodynamic/{pd_model_id}/"
        ).json()
        responses["tag_list"] = client.get("/api/tag/").json()

        # Protocol/dosing endpoints
        responses["protocol_list"] = client.get(
            f"/api/protocol/?project_id={project_id}"
        ).json()
        responses["dose_detail"] = client.get(f"/api/dose/{dose_id}/").json()
        responses["variable_list"] = client.get("/api/variable/").json()
        responses["unit_list"] = client.get(
            f"/api/unit/?compound_id={compound_id}"
        ).json()

        # Other endpoints (may be empty for now)
        responses["subject_list"] = client.get("/api/subject/").json()
        responses["subject_group_list"] = client.get("/api/subject_group/").json()
        responses["biomarker_type_list"] = client.get("/api/biomarker_type/").json()
        responses["simulation_list"] = client.get(
            f"/api/simulation/?project_id={project_id}"
        ).json()
        responses["results_table_list"] = client.get(
            f"/api/results_table/?project_id={project_id}"
        ).json()

        return responses

    def _generate_mock_files(self, api_responses, output_dir):
        """Generate TypeScript mock files from API responses"""
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Generate project mock file
        self._generate_project_mock(api_responses, output_path)

        # Generate model mock file
        self._generate_model_mock(api_responses, output_path)

        # Generate protocol mock file
        self._generate_protocol_mock(api_responses, output_path)

        # Generate units mock file
        self._generate_units_mock(api_responses, output_path)

        # Generate variables mock file
        self._generate_variables_mock(api_responses, output_path)

        # Generate simulation mock file
        self._generate_simulation_mock(api_responses, output_path)

        # Generate dataset-related mock files
        self._generate_dataset_mock(api_responses, output_path)
        self._generate_subjects_mock(api_responses, output_path)
        self._generate_subject_groups_mock(api_responses, output_path)
        self._generate_biomarker_types_mock(api_responses, output_path)

        # Generate index file
        self._generate_index_file(output_path)

    def _generate_project_mock(self, responses, output_path):
        """Generate project.mock.ts file"""
        project = responses["project_detail"]
        compound = responses["compound_detail"]
        user_list = responses["user_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ ProjectRead, CompoundRead, UserRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const project = {self._to_typescript(project)} as unknown as ProjectRead;

export const compound = {self._to_typescript(compound)} as unknown as CompoundRead;

export const users = {self._to_typescript(user_list)} as unknown as UserRead[];

export const projectHandlers = [
  http.get("/api/project", async () => {{
    await delay();
    return HttpResponse.json([project], {{ status: 200 }});
  }}),
  http.get("/api/project/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const projectId = parseInt(params.id, 10);
    if (projectId === project.id) {{
      return HttpResponse.json(project, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "Project not found" }}, {{ status: 404 }});
  }}),
  http.get("/api/user", async () => {{
    await delay();
    return HttpResponse.json(users, {{ status: 200 }});
  }}),
  http.get("/api/compound/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const compoundId = parseInt(params.id, 10);
    if (compoundId === compound.id) {{
      return HttpResponse.json(compound, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "Compound not found" }}, {{ status: 404 }});
  }}),
];
"""
        (output_path / "project.mock.ts").write_text(content)

    def _generate_model_mock(self, responses, output_path):
        """Generate model.mock.ts file"""
        combined_models = responses["combined_model_list"]
        pk_models = responses["pk_model_list"]
        pd_models = responses["pd_model_list"]
        tags = responses["tag_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ CombinedModelRead, PharmacokineticRead, PharmacodynamicRead, TagRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const combinedModels = {self._to_typescript(combined_models)} as unknown as CombinedModelRead[];

export const pkModels = {self._to_typescript(pk_models)} as unknown as PharmacokineticRead[];

export const pdModels = {self._to_typescript(pd_models)} as unknown as PharmacodynamicRead[];

export const tags = {self._to_typescript(tags)} as unknown as TagRead[];

export const modelHandlers = [
  http.get("/api/combined_model", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {{
      const filtered = combinedModels.filter(m => m.project === parseInt(projectId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(combinedModels, {{ status: 200 }});
  }}),
  http.get("/api/pharmacokinetic", async () => {{
    await delay();
    return HttpResponse.json(pkModels, {{ status: 200 }});
  }}),
  http.get("/api/pharmacodynamic", async () => {{
    await delay();
    return HttpResponse.json(pdModels, {{ status: 200 }});
  }}),
  http.get("/api/pharmacodynamic/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const modelId = parseInt(params.id, 10);
    const pdModel = pdModels.find(m => m.id === modelId);
    if (pdModel) {{
      return HttpResponse.json(pdModel, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "PD Model not found" }}, {{ status: 404 }});
  }}),
  http.get("/api/tag", async () => {{
    await delay();
    return HttpResponse.json(tags, {{ status: 200 }});
  }}),
];
"""
        (output_path / "model.mock.ts").write_text(content)

    def _generate_protocol_mock(self, responses, output_path):
        """Generate protocol.mock.ts file"""
        protocols = responses["protocol_list"]
        dose = responses["dose_detail"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ ProtocolRead, DoseRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const protocols = {self._to_typescript(protocols)} as unknown as ProtocolRead[];

export const dose = {self._to_typescript(dose)} as unknown as DoseRead;

export const protocolHandlers = [
  http.get("/api/protocol", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {{
      const filtered = protocols.filter(p => p.project === parseInt(projectId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(protocols, {{ status: 200 }});
  }}),
  http.get("/api/dose/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const doseId = parseInt(params.id, 10);
    if (doseId === dose.id) {{
      return HttpResponse.json(dose, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "Dose not found" }}, {{ status: 404 }});
  }}),
];
"""
        (output_path / "protocol.mock.ts").write_text(content)

    def _generate_units_mock(self, responses, output_path):
        """Generate units.mock.ts file"""
        units = responses["unit_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ UnitRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const units = {self._to_typescript(units)} as unknown as UnitRead[];

export const unitHandlers = [
  http.get("/api/unit", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const compoundId = url.searchParams.get("compound_id");
    if (compoundId) {{
      // Filter logic can be added here if needed
      return HttpResponse.json(units, {{ status: 200 }});
    }}
    return HttpResponse.json(units, {{ status: 200 }});
  }}),
];
"""
        (output_path / "units.mock.ts").write_text(content)

    def _generate_variables_mock(self, responses, output_path):
        """Generate variables.mock.ts file"""
        variables = responses["variable_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ VariableRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const variables = {self._to_typescript(variables)} as unknown as VariableRead[];

export const variableHandlers = [
  http.get("/api/variable/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const variableId = parseInt(params.id, 10);
    const variable = variables.find(v => v.id === variableId);
    if (variable) {{
      return HttpResponse.json(variable, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "Variable not found" }}, {{ status: 404 }});
  }}),
  http.get("/api/variable", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const dosedPkModelId = url.searchParams.get("dosed_pk_model_id");
    if (dosedPkModelId) {{
      const filtered = variables.filter(v => v.dosed_pk_model === parseInt(dosedPkModelId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(variables, {{ status: 200 }});
  }}),
];
"""
        (output_path / "variables.mock.ts").write_text(content)

    def _generate_simulation_mock(self, responses, output_path):
        """Generate simulation.mock.ts file"""
        simulations = responses["simulation_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ SimulationRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const simulations = {self._to_typescript(simulations)} as unknown as SimulationRead[];

export const simulationHandlers = [
  http.get("/api/simulation/", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {{
      const filtered = simulations.filter(s => s.project === parseInt(projectId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(simulations, {{ status: 200 }});
  }}),
];
"""
        (output_path / "simulation.mock.ts").write_text(content)

    def _generate_dataset_mock(self, responses, output_path):
        """Generate dataset.mock.ts file"""
        datasets = responses.get("dataset_list", [])
        dataset = responses.get("dataset_detail")

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ DatasetRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const datasets = {self._to_typescript(datasets)} as unknown as DatasetRead[];

export const dataset = {self._to_typescript(dataset)} as unknown as DatasetRead;

export const datasetHandlers = [
  http.get("/api/dataset/", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {{
      const filtered = datasets.filter(d => d.project === parseInt(projectId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(datasets, {{ status: 200 }});
  }}),
  http.get("/api/dataset/:id", async ({{ params }}) => {{
    await delay();
    //@ts-expect-error params.id is a string
    const datasetId = parseInt(params.id, 10);
    if (dataset && datasetId === dataset.id) {{
      return HttpResponse.json(dataset, {{ status: 200 }});
    }}
    const found = datasets.find(d => d.id === datasetId);
    if (found) {{
      return HttpResponse.json(found, {{ status: 200 }});
    }}
    return HttpResponse.json({{ error: "Dataset not found" }}, {{ status: 404 }});
  }}),
];
"""
        (output_path / "dataset.mock.ts").write_text(content)

    def _generate_subjects_mock(self, responses, output_path):
        """Generate subjects.mock.ts file"""
        subjects = responses["subject_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ SubjectRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const subjects = {self._to_typescript(subjects)} as unknown as SubjectRead[];

export const subjectHandlers = [
  http.get("/api/subject/", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("dataset_id");
    if (datasetId) {{
      const filtered = subjects.filter(s => s.dataset === parseInt(datasetId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(subjects, {{ status: 200 }});
  }}),
];
"""
        (output_path / "subjects.mock.ts").write_text(content)

    def _generate_subject_groups_mock(self, responses, output_path):
        """Generate subjectGroups.mock.ts file"""
        subject_groups = responses["subject_group_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ SubjectGroupRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const subjectGroups = {self._to_typescript(subject_groups)} as unknown as SubjectGroupRead[];

export const subjectGroupHandlers = [
  http.get("/api/subject_group/", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {{
      const filtered = subjectGroups.filter(sg => sg.project === parseInt(projectId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(subjectGroups, {{ status: 200 }});
  }}),
];
"""
        (output_path / "subjectGroups.mock.ts").write_text(content)

    def _generate_biomarker_types_mock(self, responses, output_path):
        """Generate biomarkerTypes.mock.ts file"""
        biomarker_types = responses["biomarker_type_list"]

        content = f"""// Auto-generated Storybook mock - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks
import {{ BiomarkerTypeRead }} from "../../app/backendApi";
import {{ http, HttpResponse, delay }} from "msw";

export const biomarkerTypes = {self._to_typescript(biomarker_types)} as unknown as BiomarkerTypeRead[];

export const biomarkerTypeHandlers = [
  http.get("/api/biomarker_type/", async ({{ request }}) => {{
    await delay();
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("dataset_id");
    if (datasetId) {{
      const filtered = biomarkerTypes.filter(bt => bt.dataset === parseInt(datasetId, 10));
      return HttpResponse.json(filtered, {{ status: 200 }});
    }}
    return HttpResponse.json(biomarkerTypes, {{ status: 200 }});
  }}),
];
"""
        (output_path / "biomarkerTypes.mock.ts").write_text(content)

    def _generate_index_file(self, output_path):
        """Generate index.ts file that exports all mocks"""
        content = """// Auto-generated Storybook mock index - DO NOT EDIT MANUALLY
// Generated by: python manage.py generate_storybook_mocks

export * from "./project.mock";
export * from "./model.mock";
export * from "./protocol.mock";
export * from "./units.mock";
export * from "./variables.mock";
export * from "./simulation.mock";
export * from "./dataset.mock";
export * from "./subjects.mock";
export * from "./subjectGroups.mock";
export * from "./biomarkerTypes.mock";
"""
        (output_path / "index.ts").write_text(content)

    def _to_typescript(self, data, indent=0):
        """Convert Python data to TypeScript object literal"""
        indent_str = "  " * indent

        if data is None:
            return "null"
        elif isinstance(data, bool):
            return "true" if data else "false"
        elif isinstance(data, (int, float)):
            return str(data)
        elif isinstance(data, str):
            # Escape special characters
            escaped = data.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
            return f'"{escaped}"'
        elif isinstance(data, list):
            if not data:
                return "[]"
            items = []
            for item in data:
                items.append(self._to_typescript(item, indent + 1))
            items_str = (",\n" + indent_str + "  ").join(items)
            return f"[\n{indent_str}  {items_str}\n{indent_str}]"
        elif isinstance(data, dict):
            if not data:
                return "{}"
            items = []
            for key, value in data.items():
                ts_value = self._to_typescript(value, indent + 1)
                items.append(f"{key}: {ts_value}")
            items_str = (",\n" + indent_str + "  ").join(items)
            return f"{{\n{indent_str}  {items_str}\n{indent_str}}}"
        else:
            return str(data)

    def _create_dataset_with_csv(self, test_data):
        """Create a dataset and load CSV data using Dataset.replace_data()"""
        from pkpdapp.utils import DataParser

        # Create a dataset for the project
        dataset = Dataset.objects.create(
            name="WithData Test Dataset",
            project=test_data["project"],
        )

        # Read the CSV file
        csv_path = Path(__file__).parent.parent.parent.parent / "media" / "test_data" / "withData.csv"
        with open(csv_path, "r") as f:
            csv_content = f.read()

        # Parse CSV to DataFrame using DataParser
        parser = DataParser()
        data = parser.parse_from_str(csv_content)

        # Use replace_data to import the CSV
        dataset.replace_data(data)

        return {
            "dataset": dataset,
            "project": test_data["project"],
            "user": test_data["user"],
            "compound": test_data["compound"],
            "combined_model": test_data["combined_model"],
            "protocol": test_data["protocol"],
            "dose": test_data["dose"],
            "pk_model": test_data["pk_model"],
            "pd_model": test_data["pd_model"],
        }

    @override_settings(ALLOWED_HOSTS=['*'])
    def _collect_dataset_api_responses(self, dataset_data):
        """Collect API responses for dataset-related endpoints"""
        client = APIClient()
        client.force_authenticate(user=dataset_data["user"])

        responses = {}
        dataset_id = dataset_data["dataset"].id
        project_id = dataset_data["project"].id
        compound_id = dataset_data["project"].compound.id
        pd_model_id = dataset_data["pd_model"].id
        dose_id = dataset_data["dose"].id

        # Core project endpoints
        responses["project_list"] = client.get("/api/project/").json()
        responses["project_detail"] = client.get(f"/api/project/{project_id}/").json()
        responses["user_list"] = client.get("/api/user/").json()
        responses["compound_detail"] = client.get(f"/api/compound/{compound_id}/").json()

        # Model endpoints
        responses["combined_model_list"] = client.get(
            f"/api/combined_model/?project_id={project_id}"
        ).json()
        responses["pk_model_list"] = client.get("/api/pharmacokinetic/").json()
        responses["pd_model_list"] = client.get("/api/pharmacodynamic/").json()
        responses["pd_model_detail"] = client.get(
            f"/api/pharmacodynamic/{pd_model_id}/"
        ).json()
        responses["tag_list"] = client.get("/api/tag/").json()

        # Protocol/dosing endpoints
        responses["protocol_list"] = client.get(
            f"/api/protocol/?project_id={project_id}"
        ).json()
        responses["dose_detail"] = client.get(f"/api/dose/{dose_id}/").json()
        responses["variable_list"] = client.get("/api/variable/").json()
        responses["unit_list"] = client.get(
            f"/api/unit/?compound_id={compound_id}"
        ).json()

        # Dataset endpoints
        responses["dataset_list"] = client.get(f"/api/dataset/?project_id={project_id}").json()
        responses["dataset_detail"] = client.get(f"/api/dataset/{dataset_id}/").json()
        responses["subject_list"] = client.get(f"/api/subject/?dataset_id={dataset_id}").json()
        responses["subject_group_list"] = client.get(f"/api/subject_group/?project_id={project_id}").json()
        responses["biomarker_type_list"] = client.get(f"/api/biomarker_type/?dataset_id={dataset_id}").json()
        responses["simulation_list"] = client.get(
            f"/api/simulation/?project_id={project_id}"
        ).json()
        responses["results_table_list"] = client.get(
            f"/api/results_table/?project_id={project_id}"
        ).json()

        return responses

    def _print_dataset_summary(self, dataset_responses, dataset_data):
        """Print summary of dataset generation"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("SUMMARY - MOCKS WITH DATASET"))
        self.stdout.write("=" * 60)

        dataset = dataset_data["dataset"]
        project = dataset_data["project"]

        self.stdout.write(f"\nDataset Created:")
        self.stdout.write(f"  - Name: {dataset.name} (ID: {dataset.id})")
        self.stdout.write(f"  - Project: {project.name} (ID: {project.id})")

        subjects = dataset_responses["subject_list"]
        subject_groups = dataset_responses["subject_group_list"]
        biomarker_types = dataset_responses["biomarker_type_list"]
        protocols = dataset_responses["protocol_list"]

        self.stdout.write(f"\nDataset Contents:")
        self.stdout.write(f"  - Subjects: {len(subjects)}")
        self.stdout.write(f"  - Subject Groups: {len(subject_groups)}")
        for group in subject_groups:
            self.stdout.write(f"    - {group['name']}")
        self.stdout.write(f"  - Biomarker Types: {len(biomarker_types)}")
        for bt in biomarker_types:
            self.stdout.write(f"    - {bt['name']}")
        self.stdout.write(f"  - Protocols: {len(protocols)}")
        for protocol in protocols:
            self.stdout.write(f"    - {protocol['name']}")

        self.stdout.write(f"\nAPI Endpoints Called:")
        for endpoint_name in dataset_responses.keys():
            self.stdout.write(f"  - {endpoint_name}")

        self.stdout.write(f"\nTotal Endpoints: {len(dataset_responses)}")
        self.stdout.write("=" * 60 + "\n")

    def _print_summary(self, api_responses, test_data, label=""):
        """Print summary of generated data"""
        self.stdout.write("\n" + "=" * 60)
        title = f"SUMMARY - MOCKS {label}" if label else "SUMMARY"
        self.stdout.write(self.style.SUCCESS(title))
        self.stdout.write("=" * 60)

        self.stdout.write(f"\nTest Data Created:")
        self.stdout.write(f"  - User: {test_data['user'].username}")
        self.stdout.write(f"  - Project: {test_data['project'].name} (ID: {test_data['project'].id})")
        self.stdout.write(f"  - Compound: {test_data['compound'].name} (ID: {test_data['compound'].id})")
        self.stdout.write(f"  - Combined Model: {test_data['combined_model'].name}")
        self.stdout.write(f"    - PK Model: {test_data['pk_model'].name}")
        self.stdout.write(f"    - PD Model: {test_data['pd_model'].name}")
        self.stdout.write(f"  - Protocol: {test_data['protocol'].name} (ID: {test_data['protocol'].id})")
        self.stdout.write(f"  - Dose: {test_data['dose'].amount} {test_data['protocol'].amount_unit.symbol} at t={test_data['dose'].start_time}")

        self.stdout.write(f"\nAPI Endpoints Called:")
        for endpoint_name in api_responses.keys():
            self.stdout.write(f"  - {endpoint_name}")

        self.stdout.write(f"\nTotal Endpoints: {len(api_responses)}")
        self.stdout.write("=" * 60 + "\n")
