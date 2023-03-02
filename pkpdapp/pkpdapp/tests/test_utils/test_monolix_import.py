#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import codecs
from django.utils import timezone
import unittest
import urllib.request
from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project
)

from pkpdapp.utils import (
    monolix_import
)

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501


class TestMonolixImport(TestCase):
    def test_import_project(self):
        project = Project.objects.create(
            name='test',
        )
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/PK_Model.txt', timeout=5
        ) as f:
            monolix_model_str = codecs.decode(f.read(), 'utf-8')
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/Model_208.mlxtran', timeout=5
        ) as f:
            monolix_project_str = codecs.decode(f.read(), 'ascii')
        with urllib.request.urlopen(
            BASE_URL_DATASETS + 'usecase_monolix/TE_Data.txt', timeout=5
        ) as f:
            monolix_data_str = codecs.decode(f.read(), 'utf-8')

        result = monolix_import(
            project, monolix_project_str,
            monolix_model_str, monolix_data_str, validate=False
        )
        self.assertIsNotNone(result)
        pd_model, pk_model, dataset = result
        constant_variables = pd_model.variables.filter(constant=True).values_list('qname', flat=True)
        expected_constant_variables = [
            'root.Cl', 'root.KD', 'root.R0', 'root.V', 'root.fres', 
            'root.hind', 'root.ka', 'root.kdeg', 'root.koff'
        ]
        self.assertCountEqual(constant_variables, expected_constant_variables)
        state_variables = pd_model.variables.filter(state=True).values_list('qname', flat=True)
        expected_state_variables = ['cmt1.A1', 'root.A2', 'root.A3', 'root.A4', 'root.A5']
        self.assertCountEqual(state_variables, expected_state_variables)
        other_variables = pd_model.variables.filter(constant=False, state=False).values_list('qname', flat=True)
        expected_other_variables = [
            'root.C2', 'root.C3', 'root.C4', 'root.C5', 'root.CD_t', 'root.CR_t', 'root.PRR', 'root.RR', 'root.t'
        ]
        self.assertCountEqual(other_variables, expected_other_variables)
        self.assertEqual(pk_model.dose_compartment, 'cmt1')

        displayed_biomarkers = dataset.biomarker_types.filter(display=True).values_list('name', flat=True)
        expected_biomarkers = ['observation']
        self.assertCountEqual(displayed_biomarkers, expected_biomarkers)
        displayed_pd_variables = pd_model.variables.filter(constant=False, display=True).values_list('qname', flat=True)
        displayed_pk_variables = pk_model.variables.filter(constant=False, display=True).values_list('qname', flat=True)
        expected_variables = ['root.PRR']
        self.assertCountEqual(displayed_pd_variables, expected_variables)
        self.assertCountEqual(displayed_pk_variables, expected_variables)
        print(pd_model.mmt)
        
        
