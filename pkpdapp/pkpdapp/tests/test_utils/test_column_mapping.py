#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from django.utils import timezone
from pkpdapp.utils.data_parser import DataParser
from pkpdapp.models import Dataset


class TestColumnMapping(TestCase):
    """Test ADPC column name mapping"""

    def test_adpc_column_mapping(self):
        """Test that ADPC column names are correctly mapped"""
        csv_data = """USUBJID,AFRLT,RRLTU,AVAL,AVALU,DOSEA,DOSEU
1,0,h,100,ng/mL,50,mg
1,1,h,80,ng/mL,50,mg
2,0,h,120,ng/mL,50,mg"""

        parser = DataParser()
        data = parser.parse_from_str(csv_data)

        # Verify ADPC columns are mapped to standard names
        self.assertIn("SUBJECT_ID", data.columns)  # USUBJID
        self.assertIn("TIME", data.columns)  # AFRLT
        self.assertIn("TIME_UNIT", data.columns)  # RRLTU
        self.assertIn("OBSERVATION", data.columns)  # AVAL
        self.assertIn("OBSERVATION_UNIT", data.columns)  # AVALU
        self.assertIn("AMOUNT", data.columns)  # DOSEA
        self.assertIn("AMOUNT_UNIT", data.columns)  # DOSEU

    def test_adpc_case_insensitive(self):
        """Test that ADPC column mapping is case-insensitive"""
        csv_data = """usubjid,afrlt,aval,dosea
1,0,100,50
2,1,80,50"""

        parser = DataParser()
        data = parser.parse_from_str(csv_data)

        self.assertIn("SUBJECT_ID", data.columns)
        self.assertIn("TIME", data.columns)
        self.assertIn("OBSERVATION", data.columns)
        self.assertIn("AMOUNT", data.columns)

    def test_adpc_dataset_creation(self):
        """Test end-to-end dataset creation with ADPC format"""
        csv_data = """USUBJID,AFRLT,RRLTU,AVAL,AVALU,DOSEA,DOSEU
1,0,h,.,ng/mL,50,mg
1,0.5,h,95,ng/mL,50,mg
1,1,h,80,ng/mL,50,mg
2,0,h,.,ng/mL,50,mg
2,0.5,h,115,ng/mL,50,mg
2,1,h,95,ng/mL,50,mg"""

        parser = DataParser()
        data = parser.parse_from_str(csv_data)

        dataset = Dataset.objects.create(
            name="ADPC Test Dataset",
            datetime=timezone.now(),
        )
        dataset.replace_data(data)

        # Verify dataset was created successfully
        self.assertEqual(dataset.subjects.count(), 2)
        self.assertGreater(dataset.biomarker_types.count(), 0)
