#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    CombinedModel,
    Compound,
    Covariate,
    CovariatePopulation,
    Dataset,
    Dose,
    EfficacyExperiment,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Protocol,
    ResultsTable,
    Simulation,
    SimulationPlot,
    SimulationSlider,
    SimulationYAxis,
    Subject,
    SubjectGroup,
    TimeInterval,
    Unit,
)
from pkpdapp.utils.chatbot_context import ChatContext


class ChatContextQueryCountTestCase(TestCase):
    def setUp(self):
        self.hours = Unit.objects.get(symbol="h")
        self.ng_per_ml = Unit.objects.get(symbol="ng/mL")
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo project", compound=compound)
        self.model = CombinedModel.objects.create(
            name="demo model",
            project=self.project,
            pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
            pd_model=PharmacodynamicModel.objects.get(
                name="Indirect effect model (stimulation of production)"
            ),
        )
        self.simulation = Simulation.objects.create(
            name="default",
            project=self.project,
            time_max=48,
            time_max_unit=self.hours,
        )
        # one of each to start with: django skips the prefetch of an empty list
        self.add_rows(1)

    def add_rows(self, n: int):
        # one more of each thing a project can have many of
        a1 = self.model.variables.get(qname="PKCompartment.A1")
        c1 = self.model.variables.get(qname="PKCompartment.C1")

        group = SubjectGroup.objects.create(name=f"Sim-Group {n}", project=self.project)
        protocol = Protocol.objects.create(
            name=f"A1 - Sim-Group {n}",
            project=self.project,
            group=group,
            variable=a1,
            amount_unit=Unit.objects.get(symbol="mg"),
            time_unit=self.hours,
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)
        Dose.objects.create(protocol=protocol, start_time=24.0, amount=5.0)
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=Covariate.objects.create(
                project=self.project, name=f"covariate {n}", reference_value=1.0
            ),
            median=1.0,
            variance=0.1,
        )
        EfficacyExperiment.objects.create(
            name=f"experiment {n}",
            c50=2.0,
            c50_unit=Unit.objects.get(symbol="nmol/L"),
            hill_coefficient=1.0,
            compound=self.project.compound,
        )

        dataset = Dataset.objects.create(name=f"dataset {n}", project=self.project)
        data_group = SubjectGroup.objects.create(
            name=f"Data-Group {n}", dataset=dataset, project=self.project
        )
        observation_type = BiomarkerType.objects.create(
            name=f"PK {n}",
            dataset=dataset,
            variable=c1,
            stored_unit=self.ng_per_ml,
            display_unit=self.ng_per_ml,
            stored_time_unit=self.hours,
            display_time_unit=self.hours,
        )
        for id_in_dataset in range(2):
            subject = Subject.objects.create(
                id_in_dataset=id_in_dataset, dataset=dataset, group=data_group
            )
            Biomarker.objects.create(
                subject=subject, biomarker_type=observation_type, time=1.0, value=2.0
            )

        plot = SimulationPlot.objects.create(
            simulation=self.simulation,
            index=n,
            x_unit=self.hours,
            y_unit=self.ng_per_ml,
            y_unit2=self.ng_per_ml,
        )
        SimulationYAxis.objects.create(plot=plot, variable=c1)
        SimulationSlider.objects.create(
            simulation=self.simulation,
            variable=self.model.variables.get(qname="PKCompartment.CL"),
        )
        TimeInterval.objects.create(
            pkpd_model=self.model, start_time=0, end_time=24 * n, unit=self.hours
        )
        ResultsTable.objects.create(
            name=f"Table {n}", rows="groups", columns="parameters", project=self.project
        )

    def count_queries(self):
        with CaptureQueriesContext(connection) as queries:
            ChatContext.from_project(
                self.project, can_edit=True, current_page=None, current_sub_page=None
            )
        return len(queries)

    def test_query_count_does_not_grow(self):
        before = self.count_queries()

        self.add_rows(2)
        self.add_rows(3)

        self.assertEqual(self.count_queries(), before)
