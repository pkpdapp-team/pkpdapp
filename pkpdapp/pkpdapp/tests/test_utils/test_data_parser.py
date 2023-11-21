#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import django
import codecs
from django.utils import timezone
import urllib.request
from django.test import TestCase
from pkpdapp.models.dataset import Dataset
from pkpdapp.utils import DataParser

django.setup()
BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501


class TestDataParser(TestCase):
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
                "SUBJECT_ID", "TIME", "AMOUNT", "OBSERVATION",
                "TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT",
                "OBSERVATION_NAME", "COMPOUND", "ROUTE", "INFUSION_TIME",
            ]
            for col in expected:
                self.assertIn(col, data.columns.tolist())

            dataset = Dataset.objects.create(
                name=filename,
                datetime=timezone.now(),
            )
            dataset.replace_data(data)

            if filename == 'datasets/TCB4dataset.csv':
                biomarker_types_in_file = [
                    'IL2', 'IL10', 'IL6', 'IFNg', 'TNFa', 'Cells'
                ]
                covariate_columns = [
                    'SUBJECT_GROUP', 'DOSE_GROUP', 'CL', 'YTYPE',
                    'mdv', 'STUDYID'
                ]
                self.assertCountEqual(
                    biomarker_types_in_file + covariate_columns,
                    dataset.biomarker_types.values_list('name', flat=True),
                )

            if filename == 'usecase0/usecase0.csv':
                # check that categorical covariate SEX is added
                self.assertIn(
                    "SEX",
                    dataset.biomarker_types.values_list(
                        'name', flat=True
                    )
                )

                # check that SEX is "Male" for single subjects
                sex_bt = dataset.biomarker_types.get(name="SEX")
                sex_data = sex_bt.data()
                self.assertEqual(len(sex_data["values"]), 1)
                self.assertEqual(sex_data["values"].iloc[0], "Male")

                # default display for covariates is false
                self.assertFalse(sex_bt.display)

            if filename == 'datasets/demo_pk_data_upload.csv':

                # check the right biomarker_types are there
                biomarker_types_in_file = [
                    'Docetaxel', 'Red blood cells', 'Hemoglobin',
                    'Platelets ', 'White blood cells',
                    'Neutrophiles absolute', 'Lymphocytes absolute',
                    'Monocytes absolute', 'Eosinophils absolute',
                    'Basophils absolute',
                ]
                covariate_columns = [
                    'DOSE',
                    'EVID',
                    'CENS',
                    'WT',
                    'YTYPE',
                    'MDV',
                    'STUDYID',
                    'SPECIES',
                    'SEX',
                    'SUBJECT_GROUP',
                    'STUDYID.1',
                    'DOSE_GROUP',
                ]
                self.assertCountEqual(
                    dataset.biomarker_types.values_list('name', flat=True),
                    biomarker_types_in_file + covariate_columns
                )

                # check the right number of subjects and protocols added
                self.assertEqual(dataset.subjects.count(), 66)
                protocols = set([
                    subject.protocol for subject in dataset.subjects.all()
                ])
                self.assertEqual(len(protocols), 39)
            if filename == 'usecase_monolix/TE_Data.txt':
                expected_names = [
                    'observation', 'Dose', 'Dose_units', 'Dose_cat'
                ]
                biomarker_names = dataset.biomarker_types.values_list(
                    'name', flat=True
                )
                self.assertCountEqual(biomarker_names, expected_names)
                expected_units = ['', '', '', '']
                biomarker_units = dataset.biomarker_types.values_list(
                    'stored_unit__symbol', flat=True
                )
                self.assertCountEqual(biomarker_units, expected_units)
