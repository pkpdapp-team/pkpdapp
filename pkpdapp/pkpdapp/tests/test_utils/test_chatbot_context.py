#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    CombinedModel,
    Compound,
    Correlation,
    Covariate,
    CovariatePopulation,
    Dataset,
    DerivedVariable,
    Distribution,
    Dose,
    EfficacyExperiment,
    PharmacodynamicModel,
    PharmacokineticModel,
    PkpdMapping,
    Project,
    Protocol,
    ResultsTable,
    Simulation,
    SimulationPlot,
    SimulationSlider,
    SimulationYAxis,
    Subject,
    SubjectGroup,
    Tag,
    TimeInterval,
    Unit,
)
from pkpdapp.utils.chatbot_context import (
    CategoricalCovariateContext,
    ChatContext,
    CompoundContext,
    ContinuousCovariateContext,
    DataPageContext,
    DrugTargetContext,
    GroupPopulationContext,
    MapVariablesContext,
    ParametersContext,
    PKPDModelContext,
    ProtocolContext,
    ResultsContext,
    SecondaryParametersContext,
    SimulationsContext,
    SubjectGroupContext,
    TrialDesignContext,
    load_project_for_chat,
)
from pkpdapp.utils.lognormal import mean_std_to_median_logvar


class ChatContextTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(
            name="demo",
            compound_type=Compound.CompoundType.SMALL_MOLECULE,
            dissociation_constant=500,
        )
        self.project = Project.objects.create(
            name="demo project",
            compound=self.compound,
            description="A demo study",
            species=Project.Species.HUMAN,
        )

        experiment = EfficacyExperiment.objects.create(
            name="in vitro",
            c50=2.0,
            c50_unit=Unit.objects.get(symbol="nmol/L"),
            hill_coefficient=1.5,
            compound=self.compound,
        )
        self.compound.use_efficacy = experiment
        self.compound.save()

        self.project.pk_tags.add(Tag.objects.get(name="1-compartment"))
        self.model = CombinedModel.objects.create(
            name="demo model",
            project=self.project,
            pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
            pd_model=PharmacodynamicModel.objects.get(
                name="Indirect effect model (stimulation of production)"
            ),
        )

        group = SubjectGroup.objects.create(
            name="Sim-Group 1",
            project=self.project,
            study_size=50,
            age_min=18,
            age_max=65,
            m2f_ratio=0.4,
            population_region=SubjectGroup.Region.US,
        )
        protocol = Protocol.objects.create(
            name="IV",
            project=self.project,
            group=group,
            variable=self.model.variables.get(qname="PKCompartment.A1"),
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)
        Dose.objects.create(protocol=protocol, start_time=24.0, amount=5.0, repeats=3)

        median, variance = mean_std_to_median_logvar(70.0, 14.0)
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=Covariate.objects.create(
                project=self.project, name="albumin", reference_value=40.0
            ),
            median=median,
            variance=variance,
        )
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=Covariate.objects.create(
                project=self.project,
                name="smoker",
                type=Covariate.Type.CATEGORICAL,
                n_categories=2,
            ),
            category_probabilities=[0.3, 0.7],
        )

    def load_project(self):
        return load_project_for_chat(self.project)

    def load_model(self):
        return self.load_project().pk_models.all()[0]

    def load_protocol(self, name):
        for group in self.load_project().groups.all():
            for protocol in group.protocols.all():
                if protocol.name == name:
                    return protocol
        self.fail(f"no protocol named {name!r}")

    def load_group(self, name):
        for group in self.load_project().groups.all():
            if group.name == name:
                return group
        self.fail(f"no group named {name!r}")

    def test_describes_the_compound(self):
        compound = CompoundContext.from_compound(self.load_project().compound)

        self.assertEqual(compound.name, "demo")
        self.assertEqual(compound.modality, "Small Molecule")

    def test_describes_drug_and_target(self):
        drug_target = DrugTargetContext.from_compound(
            self.load_project().compound, can_edit=True
        )

        # the ui shows "g/mol (Da)" instead of the plain unit symbol
        self.assertEqual(drug_target.molecular_mass_unit, "g/mol (Da)")
        experiment = drug_target.efficacy_safety_data[0]
        self.assertEqual(experiment.name, "in vitro")
        self.assertEqual(experiment.c50_unit_symbol, "nmol/L")
        # setUp picks this experiment for the compound
        self.assertTrue(experiment.selection.selected)

    def test_describes_protocols_and_doses(self):
        protocol = ProtocolContext.from_protocol(
            self.load_protocol("IV"), can_edit=True
        )

        # setUp doses A1, the ui names the protocol after its variable
        self.assertEqual(protocol.heading, "A1 Administration")
        self.assertFalse(protocol.from_dataset)
        self.assertEqual([dose.amount for dose in protocol.doses], [10.0, 5.0])
        self.assertEqual([dose.number_of_doses for dose in protocol.doses], [1, 3])

    def test_describes_dataset_protocols(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        protocol = Protocol.objects.create(
            name="observed", project=self.project, group=group, dataset=dataset
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        protocol = ProtocolContext.from_protocol(
            self.load_protocol("observed"), can_edit=True
        )

        self.assertTrue(protocol.from_dataset)
        self.assertEqual(len(protocol.doses), 1)
        # the api rejects edits to dataset protocols
        self.assertFalse(protocol.per_body_weight.enabled)

    def test_describes_the_group_population(self):
        population = GroupPopulationContext.from_group(
            self.load_group("Sim-Group 1")
        )

        self.assertEqual(population.study_size, 50)
        self.assertEqual(population.male_fraction, 0.4)
        self.assertEqual(population.region, "United States")

    def test_describes_custom_covariates(self):
        albumin, smoker = self.load_group("Sim-Group 1").covariate_populations.all()

        albumin = ContinuousCovariateContext.from_population(albumin)
        smoker = CategoricalCovariateContext.from_population(smoker)

        # setUp stores albumin as median / log variance, the ui shows mean / std
        self.assertEqual(albumin.mean, 70.0)
        self.assertEqual(albumin.standard_deviation, 14.0)
        self.assertEqual(smoker.category_probabilities, [0.3, 0.7])

    def test_orders_groups_and_protocols_like_the_ui(self):
        SubjectGroup.objects.create(name="Extra group", project=self.project)
        SubjectGroup.objects.create(name="Another group", project=self.project)
        Protocol.objects.create(
            name="Bolus", project=self.project, group=self.load_group("Sim-Group 1")
        )

        groups = TrialDesignContext.from_project(
            self.load_project(), can_edit=True
        ).groups

        # "Sim" groups first, then by name
        self.assertEqual(
            [group.name for group in groups],
            ["Sim-Group 1", "Another group", "Extra group"],
        )
        # protocols by name: "Bolus" (no doses, created above)
        #                    before "IV" (2 doses, created in setUp)
        self.assertEqual([len(p.doses) for p in groups[0].protocols], [0, 2])

    def test_describes_dataset_groups(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        for id_in_dataset in range(3):
            Subject.objects.create(
                id_in_dataset=id_in_dataset, dataset=dataset, group=group
            )

        data_group = SubjectGroupContext.from_group(
            self.load_group("Data-Group 1"), can_edit=True
        )

        self.assertTrue(data_group.from_dataset)
        self.assertEqual(data_group.subject_count, 3)
        # dataset imports leave the population fields at their defaults
        self.assertIsNone(data_group.population)

    def test_describes_the_pkpd_model_tab(self):
        pkpd_model = PKPDModelContext.from_combined_model(
            self.load_model(), can_edit=True
        )

        self.assertEqual(pkpd_model.species, "Human")
        self.assertEqual(pkpd_model.pk_filter_tags, ["1-compartment"])
        self.assertEqual(pkpd_model.pk_model.name, "1-compartmental model")
        self.assertEqual(
            pkpd_model.pd_model.name,
            "Indirect effect model (stimulation of production)",
        )
        # lag time is only shown once an extravascular model is picked
        self.assertIsNone(pkpd_model.extravascular_model)
        self.assertIsNone(pkpd_model.has_lag)
        # anti-drug antibodies can only be ticked for large molecules
        self.assertFalse(pkpd_model.has_anti_drug_antibodies.enabled)
        # the indirect effect pd model has a hill coefficient
        self.assertTrue(pkpd_model.has_hill_coefficient.enabled)

    def test_describes_the_dosing_table(self):
        self.model.has_lag = True
        self.model.save()
        a1 = self.model.variables.get(qname="PKCompartment.A1")
        DerivedVariable.objects.create(
            pkpd_model=self.model, pk_variable=a1, type=DerivedVariable.Type.TLAG
        )

        map_variables = MapVariablesContext.from_combined_model(
            self.load_model(), can_edit=True
        )

        self.assertEqual([row.name for row in map_variables.dosing_variables], ["A1"])
        a1_row = map_variables.dosing_variables[0]
        # setUp doses A1, and A1 has a lag time
        self.assertTrue(a1_row.is_dosing_compartment.selected)
        self.assertTrue(a1_row.has_lag_time.selected)

    def test_describes_the_map_variables_tab(self):
        c1 = self.model.variables.get(qname="PKCompartment.C1")
        PkpdMapping.objects.create(
            pkpd_model=self.model,
            pk_variable=c1,
            pd_variable=self.model.variables.get(qname="PDCompartment.C_Drug"),
        )
        DerivedVariable.objects.create(
            pkpd_model=self.model,
            pk_variable=c1,
            type=DerivedVariable.Type.AREA_UNDER_CURVE,
        )

        map_variables = MapVariablesContext.from_combined_model(
            self.load_model(), can_edit=True
        )

        rows = map_variables.variable_mappings
        # concentrations first, then amounts, then the rest
        self.assertEqual([row.name for row in rows], ["C1", "A1", "E", "PDO", "STM"])
        self.assertTrue(rows[0].link_to_pd.selected)
        self.assertTrue(rows[0].secondary_parameters.selected)

    def test_describes_the_parameters_tab(self):
        cl = self.model.variables.get(qname="PKCompartment.CL")
        v1 = self.model.variables.get(qname="PKCompartment.V1")
        cl_population = Distribution.objects.create(
            variable=cl, pdf=Distribution.PDF.LOGNORMAL, variance=0.09
        )
        v1_population = Distribution.objects.create(
            variable=v1, pdf=Distribution.PDF.LOGNORMAL, variance=0.04
        )
        Correlation.objects.create(
            distribution_1=cl_population, distribution_2=v1_population, coefficient=0.5
        )
        DerivedVariable.objects.create(
            pkpd_model=self.model,
            pk_variable=v1,
            type=DerivedVariable.Type.AGE_COVARIATE,
        )
        DerivedVariable.objects.create(
            pkpd_model=self.model,
            pk_variable=v1,
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )

        parameters = ParametersContext.from_combined_model(
            self.load_model(), can_edit=True
        )

        # pk parameters first, covariate coefficients right after their parameter
        self.assertEqual(
            [row.name for row in parameters.rows],
            ["CL", "V1", "V1_a_AGE", "V1_a_WT", "C50", "E0", "Emax", "kdegE"],
        )
        v1_row = parameters.rows[1]
        self.assertTrue(v1_row.population.selected)
        # std deviation = sqrt(variance)
        self.assertEqual(v1_row.population_distribution.std_deviation, 0.2)
        # weight is listed before age, like the ui options
        self.assertEqual(
            [c.label for c in v1_row.covariates.selected], ["Weight", "Age"]
        )
        # a parameter with covariates cannot also get a nonlinearity
        self.assertFalse(v1_row.nonlinearity.enabled)
        correlation = parameters.correlations[0]
        self.assertEqual(
            (correlation.parameter_1, correlation.parameter_2), ("CL", "V1")
        )
        self.assertEqual(correlation.coefficient, 0.5)

    def test_describes_the_secondary_parameters_tab(self):
        hours = Unit.objects.get(symbol="h")
        TimeInterval.objects.create(
            pkpd_model=self.model, start_time=0, end_time=24, unit=hours
        )
        TimeInterval.objects.create(
            pkpd_model=self.model, start_time=24, end_time=48, unit=hours
        )
        c1 = self.model.variables.get(qname="PKCompartment.C1")
        c1.lower_threshold = 1.0
        c1.save()
        DerivedVariable.objects.create(
            pkpd_model=self.model,
            pk_variable=c1,
            type=DerivedVariable.Type.AREA_UNDER_CURVE,
        )

        secondary_parameters = SecondaryParametersContext.from_combined_model(
            self.load_model()
        )

        self.assertEqual(
            [(i.start_time, i.end_time) for i in secondary_parameters.time_intervals],
            [(0.0, 24.0), (24.0, 48.0)],
        )
        # only variables with secondary parameters ticked (an AUC) get thresholds
        thresholds = secondary_parameters.variable_thresholds
        self.assertEqual([t.name for t in thresholds], ["C1"])
        self.assertEqual(thresholds[0].lower_threshold, 1.0)

    def test_describes_the_data_page(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        hours = Unit.objects.get(symbol="h")
        ng_per_ml = Unit.objects.get(symbol="ng/mL")
        pk = BiomarkerType.objects.create(
            name="PK",
            dataset=dataset,
            variable=self.model.variables.get(qname="PKCompartment.C1"),
            stored_unit=ng_per_ml,
            display_unit=ng_per_ml,
            stored_time_unit=hours,
            display_time_unit=hours,
        )
        # not mapped to a model output, so the ui hides it
        unmapped = BiomarkerType.objects.create(
            name="unmapped",
            dataset=dataset,
            stored_unit=ng_per_ml,
            display_unit=ng_per_ml,
            stored_time_unit=hours,
            display_time_unit=hours,
        )
        subject = Subject.objects.create(id_in_dataset=1, dataset=dataset, group=group)
        Biomarker.objects.create(
            subject=subject, biomarker_type=pk, time=0.5, value=4.2
        )
        Biomarker.objects.create(
            subject=subject, biomarker_type=pk, time=48.0, value=1.1, exclude=True
        )
        Biomarker.objects.create(
            subject=subject, biomarker_type=unmapped, time=1.0, value=2.0
        )

        data_page = DataPageContext.from_project(self.load_project())

        self.assertEqual(
            [t.observation_id for t in data_page.observation_types], ["PK"]
        )
        pk_summary = data_page.observation_types[0]
        self.assertEqual(pk_summary.point_count, 2)
        self.assertEqual(pk_summary.excluded_from_fitting, 1)
        self.assertEqual(pk_summary.time_range, (0.5, 48.0))

    def test_describes_the_simulations_page(self):
        simulation = Simulation.objects.create(
            name="default",
            project=self.project,
            time_max=48,
            time_max_unit=Unit.objects.get(symbol="h"),
        )
        plot = SimulationPlot.objects.create(
            simulation=simulation, index=0, x_unit=Unit.objects.get(symbol="h")
        )
        SimulationYAxis.objects.create(
            plot=plot, variable=self.model.variables.get(qname="PKCompartment.C1")
        )
        SimulationSlider.objects.create(
            simulation=simulation,
            variable=self.model.variables.get(qname="PKCompartment.V1"),
        )
        SimulationSlider.objects.create(
            simulation=simulation,
            variable=self.model.variables.get(qname="PKCompartment.CL"),
        )

        project = self.load_project()
        simulations_page = SimulationsContext.from_simulation(
            project.simulations.all()[0], project.pk_models.all()[0]
        )

        self.assertEqual(simulations_page.duration, 48.0)
        self.assertEqual(simulations_page.plots[0].left_axis, ["C1"])
        # added V1 first, the ui sorts CL before V1
        self.assertEqual(simulations_page.slider_parameters, ["CL", "V1"])

    def test_describes_the_results_page(self):
        ResultsTable.objects.create(
            name="Table 2", rows="variables", columns="intervals", project=self.project
        )
        ResultsTable.objects.create(
            name="Table 1", rows="groups", columns="parameters", project=self.project
        )

        tables = ResultsContext.from_project(self.load_project()).tables

        # created out of order, the ui sorts the tabs by name
        self.assertEqual([table.name for table in tables], ["Table 1", "Table 2"])
        self.assertEqual(tables[0].rows, "groups")
        self.assertEqual(tables[0].columns, "parameters")

    def test_builds_the_whole_chat_context(self):
        context = ChatContext.from_project(
            self.project,
            can_edit=True,
            current_page="Model",
            current_sub_page="Parameters",
        )

        self.assertEqual(context.current_page, "Model")
        self.assertEqual(context.current_sub_page, "Parameters")
        self.assertEqual(context.project.name, "demo project")
        self.assertEqual(context.project.compound.name, "demo")
        self.assertEqual(
            context.project.model_page.pkpd_model_sub_page.pk_model.name,
            "1-compartmental model",
        )
        self.assertEqual(
            context.project.trial_design_page.groups[0].name, "Sim-Group 1"
        )

    def test_project_without_a_model_has_no_model_context(self):
        # protocols restrict deleting the variables they dose
        Protocol.objects.filter(project=self.project).delete()
        CombinedModel.objects.filter(project=self.project).delete()

        context = ChatContext.from_project(
            self.project, can_edit=True, current_page=None, current_sub_page=None
        )

        self.assertIsNone(context.project.model_page)
