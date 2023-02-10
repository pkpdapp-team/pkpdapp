#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
import unittest
import urllib.request

from pkpdapp.utils import DataParser


class TestDataParser(unittest.TestCase):
    def test_parse(self):
        BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/TE_Data.txt', timeout=5
        ) as f:
            csv_str = codecs.decode(f.read(), 'utf-8')
        parser = DataParser()
        data = parser.parse_from_str(csv_str, delimiter='\t')
        expected = ['ID', 'TIME', 'TIME_UNIT', 'AMOUNT', 'AMOUNT_UNIT', 'OBSERVATION', 'DV_units', 'Dose', 'Dose_units', 'DOSE_GROUP']
        self.assertListEqual(data.columns.tolist(), expected)
