#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
import unittest
import urllib.request
from urllib.request import urlretrieve
from pkpdapp.utils import MonolixParser

from django.test import TestCase
from django.utils import timezone

from pkpdapp.models import Biomarker, BiomarkerType, Dataset, Unit

class TestMonolixParser(unittest.TestCase):
    def test_parse(self):
        BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/PK_Model.txt', timeout=5
        ) as f:
            monolix_str = codecs.decode(f.read(), 'utf-8')
        parser = MonolixParser()
        parser.initialise_model()
        print('model is', parser.myokit_model)
        print(parser.myokit_model.code())
        parser.parse(monolix_str)
        print('model is', parser.myokit_model)
        print(parser.myokit_model.code())
        parser.myokit_model.validate()




