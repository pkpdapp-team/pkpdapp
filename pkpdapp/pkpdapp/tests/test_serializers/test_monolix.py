#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
import urllib.request
from pkpdapp.models import (
    Project,
)
from pkpdapp.api.serializers import (
    MonolixSerializer,
)

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501


class TestMonolixSerializer(TestCase):
    def test_import(self):
        project = Project.objects.create(
            name='test',
        )
        model_f = urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/PK_Model.txt', timeout=5
        )
        project_f = urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/Model_208.mlxtran', timeout=5
        )
        data_f = urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/TE_Data.txt', timeout=5
        )

        files = []
        for f, n in zip(
            [model_f, project_f, data_f],
            ['model_txt', 'project_mlxtran', 'data_csv']
        ):
            content = SimpleUploadedFile(n, f.read())
            files.append(content)

        data = {
            'model_txt': files[0],
            'project_mlxtran': files[1],
            'data_csv': files[2],
        }
        serializer = MonolixSerializer(project, data=data)
        print(serializer.is_valid())
        print(serializer.errors)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.assertIn('pd_model', serializer.data)
        self.assertIn('pk_model', serializer.data)
        self.assertIn('data', serializer.data)
