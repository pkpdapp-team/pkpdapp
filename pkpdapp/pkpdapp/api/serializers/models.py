#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    PharmacokineticModel,
    CombinedModel,
    PharmacodynamicModel, PkpdMapping,
    MyokitModelMixin,
    DerivedVariable,
)
from pkpdapp.api.serializers import (
    ValidSbml, ValidMmt
)


class PkpdMappingSerializer(serializers.ModelSerializer):
    datetime = serializers.DateField(read_only=True, required=False)
    read_only = serializers.BooleanField(read_only=True, required=False)

    class Meta:
        model = PkpdMapping
        fields = '__all__'


class DerivedVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedVariable
        fields = '__all__'


class BaseDosedPharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = CombinedModel
        fields = '__all__'


class CombinedModelSerializer(serializers.ModelSerializer):
    mappings = PkpdMappingSerializer(many=True)
    derived_variables = DerivedVariableSerializer(many=True)
    components = serializers.SerializerMethodField('get_components')
    variables = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    mmt = serializers.SerializerMethodField('get_mmt', read_only=True)
    time_unit = serializers.SerializerMethodField('get_time_unit')
    is_library_model = serializers.SerializerMethodField(
        'get_is_library_model'
    )

    class Meta:
        model = CombinedModel
        fields = '__all__'

    def get_is_library_model(self, m) -> bool:
        return m.is_library_model

    def get_mmt(self, m) -> str:
        return m.get_mmt()

    def get_time_unit(self, m) -> int:
        unit = m.get_time_unit()
        if unit is None:
            return -1
        else:
            return unit.id

    def get_components(self, m):
        model = m.get_myokit_model()
        return [
            _serialize_component(m, c, model)
            for c in model.components(sort=True)
        ]

    def create(self, validated_data):
        mappings_data = validated_data.pop('mappings')
        derived_variables_data = validated_data.pop('derived_variables')
        new_pkpd_model = BaseDosedPharmacokineticSerializer().create(
            validated_data
        )
        for field_datas, Serializer in [
                (mappings_data, PkpdMappingSerializer),
                (derived_variables_data, DerivedVariableSerializer)
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                field_data['pkpd_model'] = new_pkpd_model
                serializer.create(field_data)

        return new_pkpd_model

    def update(self, instance, validated_data):
        mappings_data = validated_data.pop('mappings')
        derived_var_data = validated_data.pop('derived_variables')
        old_mappings = list((instance.mappings).all())
        old_derived_vars = list((instance.derived_variables).all())

        models_changed = (
            instance.pk_model != validated_data.get('pk_model') or
            instance.pd_model != validated_data.get('pd_model') or
            instance.pd_model2 != validated_data.get('pd_model2') 
        )
        new_pkpd_model = BaseDosedPharmacokineticSerializer().update(
            instance, validated_data
        )

        # don't update mappings if read_only
        # don't update mapping or derived variables if models have changed
        if not (instance.read_only or models_changed):
            for field_datas, old_models, Serializer in [
                    (mappings_data,
                     old_mappings, PkpdMappingSerializer),
                    (derived_var_data,
                     old_derived_vars, DerivedVariableSerializer),
            ]:
                for field_data in field_datas:
                    serializer = Serializer()
                    try:
                        old_model = old_models.pop(0)
                        new_model = serializer.update(
                            old_model, field_data
                        )
                        new_model.save()
                    except IndexError:
                        field_data['pkpd_model'] = new_pkpd_model
                        new_model = serializer.create(field_data)

        # delete any remaining old mappings
        for old_model in old_mappings:
            old_model.delete()
        for old_model in old_derived_vars:
            old_model.delete()

        return new_pkpd_model


class PharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacokineticModel
        fields = '__all__'


def _serialize_component(model, component, myokit_model):

    states = [
        v.pk
        for v in model.variables.filter(state=True)
        if v.qname.startswith(component.name())
    ]

    variables = [
        v.pk
        for v in model.variables.filter(constant=True)
        if v.qname.startswith(component.name())
    ]

    outputs = [
        v.pk
        for v in model.variables.filter(constant=False)
        if v.qname.startswith(component.name())
    ]

    equations = [
        MyokitModelMixin._serialise_equation(e)
        for e in component.equations(bound=False, const=False)
    ]
    return {
        'name': component.name(),
        'states': states,
        'variables': variables,
        'outputs': outputs,
        'equations': equations,
    }


class PharmacodynamicSerializer(serializers.ModelSerializer):
    components = serializers.SerializerMethodField('get_components')
    variables = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    mmt = serializers.CharField(validators=[ValidMmt()], required=False)

    def get_components(self, m):
        model = m.get_myokit_model()
        return [
            _serialize_component(m, c, model)
            for c in model.components(sort=True)
        ]

    class Meta:
        model = PharmacodynamicModel
        fields = '__all__'


class PharmacodynamicSbmlSerializer(serializers.ModelSerializer):
    sbml = serializers.CharField(validators=[ValidSbml()], write_only=True)

    class Meta:
        model = PharmacodynamicModel
        fields = ['sbml']
        extra_kwargs = {'sbml': {'write_only': True}}

    def create(self, validated_data):
        sbml = validated_data.pop('sbml')
        mmt = MyokitModelMixin.sbml_string_to_mmt(sbml)
        validated_data['mmt'] = mmt
        return PharmacodynamicModel(**validated_data)

    def update(self, instance, validated_data):
        sbml = validated_data.get('sbml')
        mmt = MyokitModelMixin.sbml_string_to_mmt(sbml)
        instance.mmt = mmt
        instance.save()
        return instance
