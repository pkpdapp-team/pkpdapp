#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from drf_spectacular.utils import extend_schema_field
from pkpdapp.utils import (
    MonolixModelParser,
    monolix_import,
)
from rest_framework import serializers
import codecs
from pkpdapp.models import (
    Project,
)


class MonolixSerializer(serializers.ModelSerializer):
    data_csv = serializers.FileField(write_only=True)
    model_txt = serializers.FileField(write_only=True)
    project_mlxtran = serializers.FileField(write_only=True)
    data = serializers.PrimaryKeyRelatedField(read_only=True)
    pd_model = serializers.PrimaryKeyRelatedField(read_only=True)
    pk_model = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Project
        fields = ['data_csv', 'model_txt', 'project_mlxtran',
                  'data', 'pd_model', 'pk_model']

    def validate_data_csv(self, data_csv):
        utf8_file = codecs.EncodedFile(data_csv.open(), "utf-8")
        # error in columns
        try:
            utf8_str = codecs.decode(utf8_file.read(), 'utf-8')
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(str(err))

        return utf8_str

    def validate_model_txt(self, model_txt):
        utf8_file = codecs.EncodedFile(model_txt.open(), "utf-8")
        parser = MonolixModelParser()

        # error in columns
        try:
            utf8_str = codecs.decode(utf8_file.read(), 'utf-8')
            parser.parse(utf8_str)
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(str(err))

        return utf8_str

    def validate_project_mlxtran(self, project_mlxtran):
        utf8_file = codecs.EncodedFile(project_mlxtran.open(), "utf-8")
        # error in columns
        try:
            utf8_str = codecs.decode(utf8_file.read(), 'utf-8')
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(str(err))

        return utf8_str

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        if instance is None:
            raise serializers.ValidationError('project instance must exist')
        try:
            monolix_import(instance, data['project_mlxtran'],
                           data['model_txt'], data['data_csv'], validate=True)
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(str(err))
        return data

    def update(self, instance, validated_data):
        result = monolix_import(
            instance, validated_data['project_mlxtran'],
            validated_data['model_txt'], validated_data['data_csv'],
            validate=False
        )
        if result is None:
            return None
        result_dict = {
            'data_csv': validated_data['data_csv'],
            'model_txt': validated_data['model_txt'],
            'project_mlxtran': validated_data['project_mlxtran'],
            'pd_model': result[0],
            'pk_model': result[1],
            'data': result[2],
        }
        print('result_dict: ', result_dict)
        return result_dict
