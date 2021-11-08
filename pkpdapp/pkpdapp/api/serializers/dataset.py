#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
import codecs
import pandas as pd
from pkpdapp.models import (
    Dataset, BiomarkerType, Protocol, Subject,
    Unit, Compound, Biomarker, Dose
)
from pkpdapp.api.serializers import ProtocolSerializer


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    protocols = ProtocolSerializer(
        many=True, read_only=True
    )
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    subject_groups = serializers.SerializerMethodField('get_groups')

    class Meta:
        model = Dataset
        fields = '__all__'

    def get_groups(self, dataset):
        groups = {}
        for s in dataset.subjects.all():
            if s.group not in groups:
                groups[s.group] = []
            groups[s.group].append(s.pk)
        return groups


class DatasetCsvSerializer(serializers.ModelSerializer):
    csv = serializers.FileField()

    class Meta:
        model = Dataset
        fields = ['csv']

    def validate_csv(self, csv):
        utf8_file = codecs.EncodedFile(csv.open(), "utf-8")

        # error in columns
        try:
            data = pd.read_csv(utf8_file)
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(
                'Error parsing file: {}'.format(err)
            )

        colnames = list(data.columns)

        # all columns in Roche data format
        required_cols = ['ID',
                         'STUDYID',
                         'AMT',
                         'COMPOUND',
                         'TIME',
                         'TIME_UNIT',  # not in Roche list but seems needed
                         'YTYPE',
                         'YDESC',
                         'DV',
                         'UNIT',
                         'SUBJECT_GROUP',
                         'DOSE_GROUP']  # not in Roche list but seems needed]
        error_cols = [
            col for col in required_cols if col not in colnames
        ]
        if len(error_cols) > 0:
            raise serializers.ValidationError(
                (
                    'Error parsing file, '
                    'does not have the following columns: {}'
                ).format(error_cols)
            )

        # check that time unit is only h or d
        time_units = data['TIME_UNIT'].unique().tolist()

        pkpdapp_units = Unit.objects.all()
        pkpdapp_time_units = pkpdapp_units.filter(
            id__in=[u.id for u in pkpdapp_units if u.is_time_unit()]
        )
        pkpdapp_time_units_symbols = \
            pkpdapp_time_units.values_list('symbol', flat=True)

        error_tunits = [
            tu for tu in time_units
            if tu not in pkpdapp_time_units_symbols
        ]
        if len(error_tunits) > 0:
            raise serializers.ValidationError(
                (
                    'Error parsing file, '
                    'contains the following unknown time units: {}'
                ).format(error_tunits)
            )

        # check whether biomarker units are in list of standard units
        bio_units = data['UNIT'].unique().tolist()
        pkpdapp_units_symbols = \
            pkpdapp_units.values_list('symbol', flat=True)
        error_bunits = [
            u for u in bio_units
            if u not in pkpdapp_units_symbols
        ]
        if len(error_bunits) > 0:
            raise serializers.ValidationError(
                (
                    'Error parsing file, '
                    'contains the following unknown units: {}'
                ).format(error_bunits)
            )

        # check for missing data and drop any rows where data are missing
        num_missing = data.isna().sum().sum()
        if num_missing > 0:
            data = data.dropna()
        return data

    def update(self, instance, validated_data):
        # remove existing dataset
        BiomarkerType.objects.filter(dataset=instance).delete()
        Protocol.objects.filter(dataset=instance).delete()
        Subject.objects.filter(dataset=instance).delete()

        # save default biomarker types
        data = validated_data['csv']
        data_without_dose = data.query('DV != "."')

        # TODO: assumes UNIT and TIME_UNIT are constant for each bt
        bts_unique = data_without_dose[
            ['YDESC', 'UNIT', 'TIME_UNIT']
        ].drop_duplicates()
        for i, row in bts_unique.iterrows():
            unit = Unit.objects.get(symbol=row['UNIT'])
            time_unit = Unit.objects.get(symbol=row['TIME_UNIT'])
            BiomarkerType.objects.create(
                name=row['YDESC'],
                description="",
                stored_unit=unit,
                display_unit=unit,
                stored_time_unit=time_unit,
                display_time_unit=time_unit,
                dataset=instance,
                color=i,
            )

        biomarker_index = {}
        for i, b in enumerate(bts_unique):
            biomarker_index[b] = i
        # save each row of data as either biomarker or dose
        subject_index = 0
        for _, row in data.iterrows():
            time_unit = Unit.objects.get(symbol=row['TIME_UNIT'])
            value_unit = Unit.objects.get(symbol=row['UNIT'])
            value = row['DV']
            subject_id = row['ID']

            # create subject
            try:
                subject = Subject.objects.get(
                    id_in_dataset=subject_id,
                    dataset=instance,
                )
            except Subject.DoesNotExist:
                dose_group = row['DOSE_GROUP']

                # handle if dose group is '.'
                try:
                    dose_group_value = float(dose_group)
                    # TODO: put it in as dimensionless for now
                    dose_group_unit = Unit.objects.get(symbol='')
                except ValueError:
                    dose_group_value = None
                    dose_group_unit = None

                group = row['SUBJECT_GROUP']

                subject = Subject.objects.create(
                    id_in_dataset=subject_id,
                    dataset=instance,
                    group=group,
                    dose_group_amount=dose_group_value,
                    dose_group_unit=dose_group_unit,
                    shape=subject_index,
                )
                subject_index += 1
            if value != ".":  # measurement observation
                Biomarker.objects.create(
                    time=row['TIME'],
                    subject=subject,
                    value=row['DV'],
                    biomarker_type=BiomarkerType.objects.get(
                        name=row['YDESC'],
                        dataset=instance)
                )
            elif row['AMT'] != ".":  # dose observation
                compound_str = row['COMPOUND']
                try:
                    compound = Compound.objects.get(name=compound_str)
                except Compound.DoesNotExist:
                    compound = Compound.objects.create(
                        name=compound_str
                    )
                try:
                    protocol = Protocol.objects.get(
                        dataset=instance,
                        subject_id=subject,
                        compound=compound
                    )
                except Protocol.DoesNotExist:
                    protocol = Protocol.objects.create(
                        name='{}-{}-{}'.format(
                            instance.name,
                            compound.name,
                            subject
                        ),
                        compound=compound,
                        time_unit=time_unit,
                        amount_unit=value_unit,
                        dataset=instance,
                        subject=subject,
                    )
                start_time = float(row['TIME'])
                amount = float(row['AMT'])
                infusion_time = float(row['TINF'])
                Dose.objects.create(
                    start_time=start_time,
                    amount=amount,
                    duration=infusion_time,
                    protocol=protocol,
                )
        return instance
