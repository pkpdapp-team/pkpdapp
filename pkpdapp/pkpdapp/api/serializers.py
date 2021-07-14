#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Dataset, BiomarkerType, Subject, Protocol, Project,
    PharmacokineticModel, PharmacodynamicModel,
    DosedPharmacokineticModel, PkpdModel,
    Profile, Dose, Unit,
)
from django.contrib.auth.models import User
from pkpdapp.models.mechanistic_model import MyokitModelMixin
from myokit.formats.sbml import SBMLParsingError


class ValidSbml:
    def __call__(self, value):
        print('testing value')
        try:
            MyokitModelMixin.parse_sbml_string(value)
        except SBMLParsingError as e:
            raise serializers.ValidationError(e)


class DoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dose
        fields = '__all__'


class ProtocolSerializer(serializers.ModelSerializer):
    doses = DoseSerializer(
        many=True, read_only=True
    )
    dose_ids = serializers.PrimaryKeyRelatedField(
        queryset=Dose.objects.all(),
        source='doses',
        many=True, write_only=True,
    )

    class Meta:
        model = Protocol
        fields = '__all__'


class PharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacokineticModel
        fields = '__all__'


class DosedPharmacokineticSerializer(serializers.ModelSerializer):
    states = serializers.SerializerMethodField('get_states')
    outputs = serializers.SerializerMethodField('get_outputs')
    variables = serializers.SerializerMethodField('get_variables')
    simulate = serializers.SerializerMethodField('get_simulate')

    def get_states(self, m):
        return m.states()

    def get_outputs(self, m):
        return m.outputs()

    def get_variables(self, m):
        return m.variables()

    def get_simulate(self, m):
        return m.simulate()

    class Meta:
        model = DosedPharmacokineticModel
        fields = '__all__'


class PharmacodynamicSerializer(serializers.ModelSerializer):
    states = serializers.SerializerMethodField('get_states')
    outputs = serializers.SerializerMethodField('get_outputs')
    variables = serializers.SerializerMethodField('get_variables')
    simulate = serializers.SerializerMethodField('get_simulate')

    def get_states(self, m):
        return m.states()

    def get_outputs(self, m):
        return m.outputs()

    def get_variables(self, m):
        return m.variables()

    def get_simulate(self, m):
        return m.simulate()

    class Meta:
        model = PharmacodynamicModel
        exclude = ['sbml']


class PharmacodynamicSbmlSerializer(serializers.ModelSerializer):
    sbml = serializers.CharField(validators=[ValidSbml()])

    class Meta:
        model = PharmacodynamicModel
        fields = ['sbml']


class PkpdSerializer(serializers.ModelSerializer):
    class Meta:
        model = PkpdModel
        fields = '__all__'


# all serializers that get used by the dataset serializer

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class BiomarkerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiomarkerType
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = BiomarkerTypeSerializer(
        many=True, read_only=True
    )
    protocols = ProtocolSerializer(
        many=True, read_only=True
    )
    subjects = SubjectSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Dataset
        fields = '__all__'


class DatasetCsvSerializer(serializers.ModelSerializer):
    csv = serializers.FileField()

    class Meta:
        model = Dataset
        fields = ['csv']

    def validate_csv(self, csv):
        # error in columns
        data = pd.read_csv(csv)
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
        error_cols = []
        for col in required_cols:
            if col not in colnames:
                error_cols.append(col)
        if len(error_cols) > 0:
            raise serializers.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s does not have the following columns: '
                    '%(error_cols)s'
                )),
                code='invalid',
                params={'filename': uploaded_file.name,
                        'error_cols': error_cols},
            )

        # check that time unit is only h or d
        time_units = data['TIME_UNIT'].unique().tolist()
        error_tunits = []
        for t_unit in time_units:
            if t_unit not in ['h', 'd', 'hours']:
                error_tunits.append(t_unit)
        if len(error_tunits) > 0:
            raise serializers.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s contains the following unknown time units: '
                    '%(error_tunits)s'
                )),
                code='invalid',
                params={'filename': uploaded_file.name,
                        'error_tunits': error_tunits},
            )

        # check whether biomarker units are in list of standard units
        bio_units = data['UNIT'].unique().tolist()
        error_bunits = []
        available_units = [
            s['symbol'] for s in Unit.objects.values('symbol')
        ]
        for b_unit in bio_units:
            if b_unit not in available_units:
                error_bunits.append(b_unit)
        if len(error_bunits) > 0:
            raise serializers.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s contains the following unknown units: '
                    '%(error_bunits)s'
                )),
                code='invalid',
                params={'filename': uploaded_file.name,
                        'error_bunits': error_bunits},
            )

        # check for missing data and drop any rows where data are missing
        num_missing = data.isna().sum().sum()
        if num_missing > 0:
            if not self.instance.id and "warn_missing_data" not in self.data:
                # creates entry in self.data if a user tries to save again
                self.add_error('file', format_html(
                    'Warning! There are ' + str(num_missing) + ' missing data '
                    'values in file which will be dropped during upload.'
                    ' To add the dataset anyway, please save again.'
                    '<input type="hidden" id="warn-missing-data"'
                    'name="warn_missing_data" value="0"/>')
                )
            data = data.dropna()
        self._data = data
        return data

    def update(self, instance, validated_data):
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.datasets.add(instance)
            if commit:
                project.save()

        # save default biomarker types
        data = self._data
        data_without_dose = data.query('DV != "."')
        bts_unique = data_without_dose[['YDESC', 'UNIT']].drop_duplicates()
        for index, row in bts_unique.iterrows():
            unit_query = Unit.objects.filter(symbol=row['UNIT'])
            unit = unit_query[0]
            BiomarkerType.objects.create(
                name=row['YDESC'],
                description="",
                unit=unit.standard_unit,
                dataset=instance)

        biomarker_index = {}
        for i, b in enumerate(bts_unique):
            biomarker_index[b] = i
        # save each row of data as either biomarker or dose
        for index, row in data.iterrows():
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
                group = row['SUBJECT_GROUP']
                dose_group = row['DOSE_GROUP']

                subject = Subject.objects.create(
                    id_in_dataset=subject_id,
                    dataset=instance,
                    group=group,
                    dose_group=dose_group,
                )
            if value != ".":  # measurement observation
                Biomarker.objects.create(
                    time=time_unit.multiplier * row['TIME'],
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
                        dataset=instance,
                        subject=subject,
                    )
                start_time = time_unit.multiplier * float(row['TIME'])
                amount = value_unit.multiplier * float(row['AMT'])
                Dose.objects.create(
                    start_time=start_time,
                    amount=amount,
                    protocol=protocol,
                )

        return instance


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    project_set = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True,
    )

    class Meta:
        model = User
        fields = '__all__'
        fields = (
            'id', 'username', 'first_name',
            'last_name', 'email', 'profile', 'project_set'
        )


class ProjectSerializer(serializers.ModelSerializer):
    # dataset_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=Dataset.objects.all(), source='datasets',
    #     many=True, required=False,
    # )
    # pk_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=DosedPharmacokineticModel.objects.all(),
    #     source='pk_models',
    #     many=True, required=False,
    # )
    # pd_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=PharmacodynamicModel.objects.all(),
    #     source='pd_models',
    #     many=True, required=False,
    # )
    # pkpd_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=PkpdModel.objects.all(),
    #     source='pkpd_models',
    #     many=True,
    #     required=False,
    # )
    # protocol_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=Protocol.objects.all(),
    #     source='protocols',
    #     many=True,
    #     required=False,
    # )
    # user_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=User.objects.all(),
    #     source='users',
    #     many=True,
    # )

    class Meta:
        model = Project
        fields = '__all__'
