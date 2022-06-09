#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    PharmacokineticModel, MyokitModelMixin,
    DosedPharmacokineticModel,
    PharmacodynamicModel, PkpdMapping
)
from pkpdapp.api.serializers import ValidSbml


class PkpdMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PkpdMapping
        fields = '__all__'


class BaseDosedPharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = DosedPharmacokineticModel
        fields = '__all__'


class DosedPharmacokineticSerializer(serializers.ModelSerializer):
    mappings = PkpdMappingSerializer(many=True)
    components = serializers.SerializerMethodField('get_components')
    variables = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )

    class Meta:
        model = DosedPharmacokineticModel
        fields = '__all__'

    def get_components(self, m):
        model = m.get_myokit_model()
        return [
            _serialize_component(m, c, model)
            for c in model.components(sort=True)
        ]

    def create(self, validated_data):
        mappings_data = validated_data.pop('mappings')
        new_pkpd_model = BaseDosedPharmacokineticSerializer().create(
            validated_data
        )
        for field_datas, Serializer in [
                (mappings_data, PkpdMappingSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                field_data['pkpd_model'] = new_pkpd_model
                serializer.create(field_data)

        return new_pkpd_model

    def update(self, instance, validated_data):
        mappings_data = validated_data.pop('mappings')
        old_mappings = list((instance.mappings).all())
        for i in range(len(mappings_data), len(old_mappings)):
            old_mappings[i].delete()
            del old_mappings[i]

        new_pkpd_model = BaseDosedPharmacokineticSerializer().update(
            instance, validated_data
        )

        # don't update mappings if read_only
        if not instance.read_only:
            for field_datas, old_models, Serializer in [
                    (mappings_data,
                     old_mappings, PkpdMappingSerializer)
            ]:
                for field_data in field_datas:
                    serializer = Serializer()
                    try:
                        old_model = old_models.pop(0)
                        new_model = serializer.update(
                            old_model, field_data
                        )
                    except IndexError:
                        field_data['pkpd_model'] = new_pkpd_model
                        new_model = serializer.create(field_data)
                    new_model.save()

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

    def get_components(self, m):
        model = m.get_myokit_model()
        return [
            _serialize_component(m, c, model)
            for c in model.components(sort=True)
        ]

    class Meta:
        model = PharmacodynamicModel
        exclude = ['sbml']


class PharmacodynamicSbmlSerializer(serializers.ModelSerializer):
    sbml = serializers.CharField(validators=[ValidSbml()])

    class Meta:
        model = PharmacodynamicModel
        fields = ['sbml']
