#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pandas as pd
from django.db import models
from pkpdapp.models import Project
from pkpdapp.models import (
    Dose,
    Biomarker,
    BiomarkerType,
    Subject,
    Protocol,
    Unit,
    CategoricalBiomarker,
    SubjectGroup,
    CombinedModel,
)
from pkpdapp.utils import DataParser


class Dataset(models.Model):
    """
    A PKPD dataset containing one or more :model:`pkpdapp.Biomarker`.
    """

    name = models.CharField(max_length=100, help_text="name of the dataset")
    datetime = models.DateTimeField(
        help_text=(
            "date/time the experiment was conducted. "
            "All time measurements are relative to this date/time, "
            + "which is in YYYY-MM-DD HH:MM:SS format. For example, "
            + "2020-07-18 14:30:59"
        ),
        null=True,
        blank=True,
    )
    description = models.TextField(
        help_text="short description of the dataset", blank=True, default=""
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="datasets",
        blank=True,
        null=True,
        help_text='Project that "owns" this model',
    )

    def __str__(self):
        return self.name

    def get_project(self):
        return self.project

    def replace_data(self, data: pd.DataFrame):
        # remove existing dataset
        BiomarkerType.objects.filter(dataset=self).delete()
        Subject.objects.filter(dataset=self).delete()
        Protocol.objects.filter(dataset=self).delete()
        SubjectGroup.objects.filter(dataset=self).delete()
        project = self.get_project()
        model = CombinedModel.objects.filter(project=project).first()
        variables = model.variables.all()
        for v in variables:
            print(f"Variable: {v.qname} (id={v.id})")

        data_without_dose = data.query('OBSERVATION != "." and OBSERVATION != ""')

        time_unit = Unit.objects.get(symbol=data["TIME_UNIT"].iloc[0])

        # create biomarker types
        # assume AMOUNT_UNIT and TIME_UNIT are constant for each bt
        bts_unique = data_without_dose[
            [
                "OBSERVATION_NAME",
                "OBSERVATION_UNIT",
                "OBSERVATION_VARIABLE",
                "TIME_UNIT",
            ]
        ].drop_duplicates()
        biomarker_types = {}
        for i, row in bts_unique.iterrows():
            unit = Unit.objects.get(symbol=row["OBSERVATION_UNIT"])
            observation_name = row["OBSERVATION_NAME"]
            observation_qname = row["OBSERVATION_VARIABLE"]
            print(f"Creating biomarker type: {observation_qname}")
            observation_variable = variables.get(qname=observation_qname)
            biomarker_types[observation_name] = BiomarkerType.objects.create(
                name=observation_name,
                description="",
                stored_unit=unit,
                display_unit=unit,
                stored_time_unit=time_unit,
                display_time_unit=time_unit,
                dataset=self,
                color=i,
                variable=observation_variable,
            )

        # create subjects
        subjects = {}
        for i, row in data[["SUBJECT_ID", "GROUP_ID"]].drop_duplicates().iterrows():
            subject_id = row["SUBJECT_ID"]

            subjects[subject_id] = Subject.objects.create(
                id_in_dataset=subject_id,
                dataset=self,
                shape=i,
            )

        # create subject groups
        groups = {}
        for i, row in data[["GROUP_ID"]].drop_duplicates().iterrows():
            group_id = row["GROUP_ID"]
            group_name = f"Data-Group {group_id}"
            group = SubjectGroup.objects.create(
                name=group_name,
                id_in_dataset=group_id,
                dataset=self,
                project=self.project,
            )
            groups[group_id] = group
            for i, row in (
                data[data["GROUP_ID"] == group_id][["SUBJECT_ID"]]
                .drop_duplicates()
                .iterrows()
            ):
                subject_id = row["SUBJECT_ID"]
                subject = subjects[subject_id]
                subject.group = group
                subject.save()
        # create group protocol
        dosing_rows = data.query('AMOUNT_VARIABLE != ""')
        for i, row in (
            dosing_rows[
                [
                    "GROUP_ID",
                    "ADMINISTRATION_NAME",
                    "AMOUNT_UNIT",
                    "AMOUNT_VARIABLE",
                    "PER_BODY_WEIGHT_KG",
                ]
            ]
            .drop_duplicates()
            .iterrows()
        ):
            group_id = row["GROUP_ID"]
            route = row["ADMINISTRATION_NAME"]
            amount_unit = Unit.objects.get(symbol=row["AMOUNT_UNIT"])
            amount_per_body_weight = row["PER_BODY_WEIGHT_KG"]
            group = groups[group_id]
            mapped_qname = row["AMOUNT_VARIABLE"]
            if route == "IV":
                route = Protocol.DoseType.DIRECT
            else:
                route = Protocol.DoseType.INDIRECT
            protocol = Protocol.objects.create(
                name="{}-{}".format(self.name, group.name),
                time_unit=time_unit,
                amount_unit=amount_unit,
                dose_type=route,
                variable=variables.get(qname=mapped_qname),
                group=group,
                dataset=self,
                amount_per_body_weight=amount_per_body_weight,
                project=self.project,
            )
            group.protocols.add(protocol)
            group.save()

        # insert covariate columns as categorical for now
        covariates = {}
        last_covariate_value = {}
        parser = DataParser()
        for covariate_name in data.columns:
            if parser.is_covariate_column(covariate_name):
                dimensionless_unit = Unit.objects.get(symbol="")
                covariates[covariate_name] = BiomarkerType.objects.create(
                    name=covariate_name,
                    description="",
                    stored_unit=dimensionless_unit,
                    display_unit=dimensionless_unit,
                    stored_time_unit=time_unit,
                    display_time_unit=time_unit,
                    display=False,
                    dataset=self,
                    color=len(covariates),
                )
                last_covariate_value[covariate_name] = None

        # parse dosing rows
        dosing_rows = data.query('AMOUNT_VARIABLE != ""')
        for i, row in (
            dosing_rows[
                [
                    "GROUP_ID",
                    "TIME",
                    "AMOUNT",
                    "AMOUNT_UNIT",
                    "AMOUNT_VARIABLE",
                    "INFUSION_TIME",
                    "EVENT_ID",
                    "ADMINISTRATION_NAME",
                    "ADDITIONAL_DOSES",
                    "INTERDOSE_INTERVAL",
                ]
            ]
            .drop_duplicates()
            .iterrows()
        ):
            group_id = row["GROUP_ID"]
            time = row["TIME"]
            amount = row["AMOUNT"]
            amount_unit = row["AMOUNT_UNIT"]
            mapped_qname = row["AMOUNT_VARIABLE"]
            infusion_time = row["INFUSION_TIME"]
            event_id = row["EVENT_ID"]

            group = groups[group_id]
            protocol = group.protocols.get(variable__qname=mapped_qname)

            try:
                repeats = int(row["ADDITIONAL_DOSES"]) + 1
                repeat_interval = float(row["INTERDOSE_INTERVAL"])
            except ValueError:
                repeats = 1
                repeat_interval = 1.0

            amount_unit = Unit.objects.get(symbol=amount_unit)

            try:
                float(amount)
                amount_convertable_to_float = True
            except ValueError:
                amount_convertable_to_float = False
            has_amount = amount_convertable_to_float and float(amount) > 0.0
            is_dosing_event = True
            try:
                event_id_int = int(event_id)
                is_dosing_event = event_id_int == 1 or event_id_int == 4
            except ValueError:
                is_dosing_event = has_amount

            if is_dosing_event and has_amount:

                start_time = float(time)
                amount = float(amount)
                infusion_time = float(infusion_time)
                Dose.objects.create(
                    start_time=start_time,
                    amount=amount,
                    duration=infusion_time,
                    protocol=protocol,
                    repeats=repeats,
                    repeat_interval=repeat_interval,
                )

        # parse observation rows
        for i, row in data.iterrows():
            subject_id = row["SUBJECT_ID"]
            time = row["TIME"]
            observation = row["OBSERVATION"]
            observation_name = row["OBSERVATION_NAME"]
            event_id = row["EVENT_ID"]

            subject = subjects[subject_id]

            has_observation = observation != "."
            is_observation_event = True
            try:
                event_id_int = int(event_id)
                is_observation_event = event_id_int == 0
            except ValueError:
                is_observation_event = has_observation
            if is_observation_event and has_observation:  # measurement observation
                try:
                    observation = float(observation)
                except ValueError:
                    observation = 0.0
                Biomarker.objects.create(
                    time=time,
                    subject=subject,
                    value=observation,
                    biomarker_type=biomarker_types[observation_name],
                )

            # insert covariate columns as categorical for now
            for covariate_name in covariates.keys():
                covariate_value = row[covariate_name]
                if covariate_value != ".":
                    # only insert if value has changed
                    last_value = last_covariate_value[covariate_name]
                    if last_value is None or (
                        last_value is not None and covariate_value != last_value
                    ):
                        last_covariate_value[covariate_name] = covariate_value
                        CategoricalBiomarker.objects.create(
                            time=time,
                            subject=subject,
                            value=covariate_value,
                            biomarker_type=covariates[covariate_name],
                        )

        self.create_default_protocol_doses()

    def create_default_protocol_doses(self):
        for protocol in self.protocols.all():
            # if there are no doses, add a default zero dose
            if len(protocol.doses.all()) == 0:
                Dose.objects.create(
                    start_time=0.0,
                    amount=0.0,
                    duration=0.0833,
                    protocol=protocol,
                    repeats=1,
                    repeat_interval=1.0,
                )
