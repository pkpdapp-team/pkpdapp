#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
import unittest
import urllib.request

from pkpdapp.utils import MonolixModelParser


class TestMonolixParser(unittest.TestCase):
    def test_parse_model(self):
        BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/PK_Model.txt', timeout=5
        ) as f:
            monolix_str = codecs.decode(f.read(), 'utf-8')
        parser = MonolixModelParser()
        model, (admin_id, tlag, direct) = parser.parse(monolix_str)
        model.validate()
        self.assertEqual(admin_id, 1)
        self.assertEqual(tlag, 0)
        self.assertEqual(direct, True)
