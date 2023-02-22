#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
import unittest
import urllib.request
from pkpdapp.utils import (
    MonolixModelParser, MonolixProjectParser
)

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501
class TestMonolixParser(unittest.TestCase):
    def test_parse_model(self):
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

    def test_parse_project(self):
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/Model_208.mlxtran', timeout=5
        ) as f:
            monolix_str = codecs.decode(f.read(), 'ascii')
        parser = MonolixProjectParser()
        project = parser.parse(monolix_str)
        self.assertCountEqual(
            project.keys(),
            ['<DATAFILE>', '<MODEL>', '<MONOLIX>', '<PARAMETER>', '<FIT>', ]
        )
        self.assertCountEqual(
            project['<DATAFILE>'].keys(),
            ['[CONTENT]', '[FILEINFO]']
        )
        self.assertCountEqual(
            project['<MODEL>'].keys(),
            ['[COVARIATE]', '[INDIVIDUAL]',  '[LONGITUDINAL]']
        )


