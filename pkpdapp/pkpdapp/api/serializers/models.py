#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import traceback
from django.db import IntegrityError
from rest_framework import serializers
from pkpdapp.models import (
    PharmacokineticModel,
    CombinedModel,
    PharmacodynamicModel,
    PkpdMapping,
    MyokitModelMixin,
    DerivedVariable,
    Variable,
    TimeInterval,
)
from pkpdapp.api.serializers import ValidSbml, ValidMmt


class PkpdMappingSerializer(serializers.ModelSerializer):
    datetime = serializers.DateField(read_only=True, required=False)
    read_only = serializers.BooleanField(read_only=True, required=False)

    class Meta:
        model = PkpdMapping
        fields = "__all__"


class DerivedVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = DerivedVariable
        fields = "__all__"


class TimeIntervalSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeInterval
        fields = "__all__"


class BaseDosedPharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = CombinedModel
        fields = "__all__"


class CombinedModelSerializer(serializers.ModelSerializer):
    mappings = PkpdMappingSerializer(many=True)
    derived_variables = DerivedVariableSerializer(many=True)
    time_intervals = TimeIntervalSerializer(many=True)
    components = serializers.SerializerMethodField("get_components")
    variables = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    mmt = serializers.SerializerMethodField("get_mmt", read_only=True)
    sbml = serializers.SerializerMethodField("get_sbml", read_only=True)
    time_unit = serializers.SerializerMethodField("get_time_unit")
    is_library_model = serializers.SerializerMethodField("get_is_library_model")

    class Meta:
        model = CombinedModel
        fields = "__all__"

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

    def get_sbml(self, m) -> str:
        try:
            return m.get_sbml()
        except Exception as e:
            print(traceback.format_exc())
            return f"Error converting to SBML: {e}"

    def get_components(self, m):
        model = m.get_myokit_model()
        return [_serialize_component(m, c, model) for c in model.components(sort=True)]

    def create(self, validated_data):
        mappings_data = validated_data.pop("mappings", [])
        derived_variables_data = validated_data.pop("derived_variables", [])
        time_intervals_data = validated_data.pop("time_intervals", [])
        new_pkpd_model = BaseDosedPharmacokineticSerializer().create(validated_data)
        for field_datas, Serializer in [
            (mappings_data, PkpdMappingSerializer),
            (derived_variables_data, DerivedVariableSerializer),
            (time_intervals_data, TimeIntervalSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                field_data["pkpd_model"] = new_pkpd_model
                serializer.create(field_data)

        return new_pkpd_model

    def update(self, instance, validated_data):
        mappings_data = validated_data.pop("mappings", [])
        derived_var_data = validated_data.pop("derived_variables", [])
        time_interval_data = validated_data.pop("time_intervals", [])
        old_mappings = list((instance.mappings).all())
        old_derived_vars = list((instance.derived_variables).all())
        old_time_intervals = list((instance.time_intervals).all())

        # if pk_model2 is None, then ensure that lag time and bioavailability is off
        if validated_data.get("pk_model2") is None:
            validated_data["has_lag"] = False
            validated_data["has_bioavailability"] = False

        pd_model_changed = False
        if "pd_model" in validated_data:
            pd_model_changed = instance.pd_model != validated_data.get("pd_model")

        # turn on read_only so we don't try to update mappings yet
        is_read_only = validated_data.get("read_only", False)
        validated_data["read_only"] = True
        new_pkpd_model = BaseDosedPharmacokineticSerializer().update(
            instance, validated_data
        )
        validated_data["read_only"] = is_read_only

        # if pd model has changed, update effect variable
        if pd_model_changed:
            for mapping in mappings_data:
                try:
                    mapping["pd_variable"] = new_pkpd_model.variables.get(
                        qname=mapping["pd_variable"].qname
                    )
                except Variable.DoesNotExist:
                    mapping["pd_variable"] = None

            mappings_data = [m for m in mappings_data if m["pd_variable"] is not None]

        # don't update mappings if read_only
        if not is_read_only:
            for derived_var in derived_var_data:
                serializer = DerivedVariableSerializer()
                try:
                    old_model = old_derived_vars.pop(0)
                    new_model = serializer.update(old_model, derived_var)
                    new_model.save()
                except IndexError:
                    derived_var["pkpd_model"] = new_pkpd_model
                    new_model = serializer.create(derived_var)
                except IntegrityError:
                    # skip derived variable if it causes integrity error
                    # this can occur if a variable is removed from the model
                    # that is used in a derived variable
                    continue

            for time_interval in time_interval_data:
                serializer = TimeIntervalSerializer()
                try:
                    old_model = old_time_intervals.pop(0)
                    new_model = serializer.update(old_model, time_interval)
                    new_model.save()
                except IndexError:
                    time_interval["pkpd_model"] = new_pkpd_model
                    new_model = serializer.create(time_interval)

            for mapping in mappings_data:
                serializer = PkpdMappingSerializer()
                try:
                    old_model = old_mappings.pop(0)
                    new_model = serializer.update(old_model, mapping)
                    new_model.save()
                except IndexError:
                    mapping["pkpd_model"] = new_pkpd_model
                    new_model = serializer.create(mapping)
                except IntegrityError:
                    # skip mapping if it causes integrity error
                    # this can occur if a variable is removed from the model
                    continue

            # delete any remaining old mappings, derived variables and time intervals
            for old_model in old_mappings:
                old_model.delete()
            for old_model in old_derived_vars:
                old_model.delete()
            for old_model in old_time_intervals:
                old_model.delete()

        # save and update model
        new_pkpd_model.refresh_from_db()
        new_pkpd_model.read_only = is_read_only
        new_pkpd_model.save()

        # clean up any plots with deleted y axis variables.
        simulations = new_pkpd_model.project.simulations.all()
        for sim in simulations:
            plots = sim.plots.all()
            for plot in plots:
                if plot.y_axes.count() == 0:
                    plot.delete()
        # delete any empty subject groups
        subject_groups = new_pkpd_model.project.groups.all()
        for sg in subject_groups:
            if sg.protocols.count() == 0:
                sg.delete()
        return new_pkpd_model


class PharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacokineticModel
        fields = "__all__"


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
        "name": component.name(),
        "states": states,
        "variables": variables,
        "outputs": outputs,
        "equations": equations,
    }


class PharmacodynamicSerializer(serializers.ModelSerializer):
    components = serializers.SerializerMethodField("get_components")
    variables = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    mmt = serializers.CharField(validators=[ValidMmt()], required=False)

    def get_components(self, m):
        model = m.get_myokit_model()
        return [_serialize_component(m, c, model) for c in model.components(sort=True)]

    class Meta:
        model = PharmacodynamicModel
        fields = "__all__"


class PharmacodynamicSbmlSerializer(serializers.ModelSerializer):
    sbml = serializers.CharField(validators=[ValidSbml()], write_only=True)

    class Meta:
        model = PharmacodynamicModel
        fields = ["sbml"]
        extra_kwargs = {"sbml": {"write_only": True}}

    def create(self, validated_data):
        sbml = validated_data.pop("sbml")
        mmt = MyokitModelMixin.sbml_string_to_mmt(sbml)
        validated_data["mmt"] = mmt
        return PharmacodynamicModel(**validated_data)

    def update(self, instance, validated_data):
        sbml = validated_data.get("sbml")
        mmt = MyokitModelMixin.sbml_string_to_mmt(sbml)
        instance.mmt = mmt
        instance.save()
        return instance
