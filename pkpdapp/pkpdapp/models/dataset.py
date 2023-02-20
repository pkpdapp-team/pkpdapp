#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pandas as pd
from django.db import models
from pkpdapp.models import Project
from pkpdapp.models import (
    Dose, Biomarker, BiomarkerType, Subject, Protocol, Unit,
    Compound, CategoricalBiomarker,
)
from pkpdapp.utils import DataParser


class Dataset(models.Model):
    """
    A PKPD dataset containing one or more :model:`pkpdapp.Biomarker`.
    """
    name = models.CharField(
        max_length=100,
        help_text='name of the dataset'
    )
    datetime = models.DateTimeField(
        help_text=(
            'date/time the experiment was conducted. '
            'All time measurements are relative to this date/time, ' +
            'which is in YYYY-MM-DD HH:MM:SS format. For example, ' +
            '2020-07-18 14:30:59'
        ),
        null=True, blank=True
    )
    description = models.TextField(
        help_text='short description of the dataset',
        blank=True, default=''
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='datasets',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )

    def __str__(self):
        return self.name

    def get_project(self):
        return self.project

    def replace_data(self, data: pd.DataFrame):
        # remove existing dataset
        BiomarkerType.objects.filter(dataset=self).delete()
        Subject.objects.filter(dataset=self).delete()

        data_without_dose = data.query('OBSERVATION != "."')

        time_unit = Unit.objects.get(symbol=data["TIME_UNIT"].iloc[0])

        # create biomarker types
        # assume AMOUNT_UNIT and TIME_UNIT are constant for each bt
        bts_unique = data_without_dose[
            ['OBSERVATION_NAME', 'AMOUNT_UNIT', 'TIME_UNIT']
        ].drop_duplicates()
        biomarker_types = {}
        for i, row in bts_unique.iterrows():
            unit = Unit.objects.get(symbol=row['AMOUNT_UNIT'])
            observation_name = row['OBSERVATION_NAME']
            biomarker_types[observation_name] = BiomarkerType.objects.create(
                name=observation_name,
                description="",
                stored_unit=unit,
                display_unit=unit,
                stored_time_unit=time_unit,
                display_time_unit=time_unit,
                dataset=self,
                color=i,
            )

        # create subjects
        subjects = {}
        for i, row in data[['SUBJECT_ID']].drop_duplicates().iterrows():
            subject_id = row['SUBJECT_ID']

            subjects[subject_id] = Subject.objects.create(
                id_in_dataset=subject_id,
                dataset=self,
                shape=i,
            )

        # create compounds
        compounds = {}
        for compound in data['COMPOUND'].drop_duplicates():
            # create compound if not already in database
            try:
                compounds[compound] = Compound.objects.get(name=compound)
            except Compound.DoesNotExist:
                compounds[compound] = Compound.objects.create(
                    name=compound
                )

        # create subject protocol
        for i, row in data[
            ['SUBJECT_ID', 'COMPOUND', 'ROUTE', "AMOUNT_UNIT"]
        ].drop_duplicates().iterrows():
            subject_id = row['SUBJECT_ID']
            compound = row['COMPOUND']
            route = row['ROUTE']
            amount_unit = Unit.objects.get(symbol=row['AMOUNT_UNIT'])
            subject = subjects[subject_id]
            compound = compounds[compound]
            if route == 'IV':
                route = Protocol.DoseType.DIRECT
            else:
                route = Protocol.DoseType.INDIRECT
            if not subject.protocol:
                subject.protocol = Protocol.objects.create(
                    name='{}-{}-{}'.format(
                        self.name,
                        compound.name,
                        subject
                    ),
                    compound=compound,
                    time_unit=time_unit,
                    amount_unit=amount_unit,
                    dose_type=route
                )
                subject.save()

        # insert covariate columns as categorical for now
        covariates = {}
        last_covariate_value = {}
        parser = DataParser()
        for covariate_name in data.columns:
            if parser.is_covariate_column(covariate_name):
                dimensionless_unit = Unit.objects.get(symbol='')
                covariates[covariate_name] = BiomarkerType.objects.create(
                    name=covariate_name,
                    description="",
                    stored_unit=dimensionless_unit,
                    display_unit=dimensionless_unit,
                    stored_time_unit=time_unit,
                    display_time_unit=time_unit,
                    dataset=self,
                    color=len(covariates),
                )
                last_covariate_value[covariate_name] = None

        for i, row in data.iterrows():
            subject_id = row["SUBJECT_ID"]
            time = row["TIME"]
            amount = row["AMOUNT"]
            amount_unit = row["AMOUNT_UNIT"]
            observation = row["OBSERVATION"]
            observation_name = row["OBSERVATION_NAME"]
            compound = row['COMPOUND']
            route = row['ROUTE']
            infusion_time = row['INFUSION_TIME']

            amount_unit = Unit.objects.get(symbol=amount_unit)

            subject = subjects[subject_id]

            if observation != ".":  # measurement observation
                Biomarker.objects.create(
                    time=time,
                    subject=subject,
                    value=observation,
                    biomarker_type=biomarker_types[observation_name]
                )
            try:
                float(amount)
                amount_convertable_to_float = True
            except ValueError:
                amount_convertable_to_float = False
            if amount_convertable_to_float and float(amount) > 0.0:  # dose observation
                if route == 'IV':
                    route = Protocol.DoseType.DIRECT
                else:
                    route = Protocol.DoseType.INDIRECT

                compound = compounds[compound]
                protocol = subject.protocol
                start_time = float(time)
                amount = float(amount)
                infusion_time = float(infusion_time)
                Dose.objects.create(
                    start_time=start_time,
                    amount=amount,
                    duration=infusion_time,
                    protocol=protocol,
                )

            # insert covariate columns as categorical for now
            for covariate_name in covariates.keys():
                covariate_value = row[covariate_name]
                if covariate_value != ".":
                    # only insert if value has changed
                    last_value = last_covariate_value[covariate_name]
                    if (
                        last_value is not None and
                        covariate_value != last_value
                    ):
                        last_covariate_value[covariate_name] = covariate_value
                        CategoricalBiomarker.objects.create(
                            time=time,
                            subject=subject,
                            value=covariate_value,
                            biomarker_type=covariates[covariate_name]
                        )

        self.merge_protocols()

    def merge_protocols(self):
        unique_protocols = []
        protocol_subjects = []
        for subject in self.subjects.all():
            if subject.protocol is None:
                continue
            protocol = subject.protocol
            index = None
            for i, other_protocol in enumerate(unique_protocols):
                if protocol.is_same_as(other_protocol):
                    index = i
                    break
            if index is None:
                unique_protocols.append(protocol)
                protocol_subjects.append([subject])
            else:
                protocol_subjects[index].append(subject)
                protocol.delete()

        # migrate subjects to unique_protocols
        for protocol, subjects in zip(unique_protocols, protocol_subjects):
            for subject in subjects:
                subject.protocol = protocol
                subject.save()
