#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
from django.utils import timezone
import unittest
import urllib.request
from pkpdapp.models.biomarker_type import BiomarkerType
from pkpdapp.models.dataset import Dataset

from pkpdapp.utils import DataParser

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501
class TestDataParser(unittest.TestCase):
    def test_parse(self):
        for filename in [
            'datasets/TCB4dataset.csv', 
            'datasets/demo_pk_data_upload.csv',
            'usecase_monolix/TE_Data.txt',
            'usecase0/usecase0.csv',
            'usecase1/usecase1.csv',
            'usecase2/PKPD_UseCase_Abx.csv',
            
        ]:
            with urllib.request.urlopen(
                BASE_URL_DATASETS + filename, timeout=5
            ) as f:
                csv_str = codecs.decode(f.read(), 'utf-8')
            parser = DataParser()
            if filename == 'usecase_monolix/TE_Data.txt':
                data = parser.parse_from_str(csv_str, delimiter='\t')
            else:
                data = parser.parse_from_str(csv_str)
            expected = [
                "SUBJECT_ID", "TIME", "AMOUNT", "OBSERVATION", "DOSE_GROUP", 
                "TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT", 
                "OBSERVATION_NAME", "COMPOUND", "ROUTE", "INFUSION_TIME",
            ]
            for col in expected:
                self.assertIn(col, data.columns.tolist())
            
            if filename == 'datasets/TCB4dataset.csv':
                dataset = Dataset.objects.create(
                    name=filename,
                    datetime=timezone.now(),
                )
                dataset.replace_data(data)

                biomarker_types_in_file = [
                    'IL2', 'IL10', 'IL6', 'IFNg', 'TNFa', 'Cells'
                ]
                self.assertCountEqual(
                    biomarker_types_in_file,
                    dataset.biomarker_types.values_list('name', flat=True),
                )

            if filename == 'datasets/demo_pk_data_upload.csv':
                dataset = Dataset.objects.create(
                    name=filename,
                    datetime=timezone.now(),
                )
                dataset.replace_data(data)

                # check the right biomarker_types are there
                biomarker_types_in_file = [
                    'Docetaxel', 'Red blood cells', 'Hemoglobin',
                    'Platelets ', 'White blood cells',
                    'Neutrophiles absolute', 'Lymphocytes absolute',
                    'Monocytes absolute', 'Eosinophils absolute',
                    'Basophils absolute',
                ]
                self.assertCountEqual(
                    dataset.biomarker_types.values_list('name', flat=True),
                    biomarker_types_in_file
                )

                # check the right number of subjects and protocols added
                self.assertEqual(dataset.subjects.count(), 66)
                protocols = set([
                    subject.protocol for subject in dataset.subjects.all()
                ])
                self.assertEqual(len(protocols), 39)
                