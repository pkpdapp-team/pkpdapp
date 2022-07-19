#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Project,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdMapping,
    PharmacokineticModel,
    BiomarkerType,
    Protocol,
)


class TestPkpdModel(TestCase):
    def test_myokit_model_creation(self):
        project = Project.objects.get(
            name='demo',
        )
        pk_model = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model'
        )
        biomarker_type = BiomarkerType.objects.get(
            name='DemoDrug Concentration',
            dataset__name='usecase0'
        )
        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )

        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        pkpd_model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pk_model=pk_model,
            pd_model=pd_model,
            dose_compartment='central',
            protocol=protocol,
            project=project,
        )
        pk_variable = pkpd_model.variables.get(
            qname='central.drug_c_concentration',
        )
        pd_variable = pkpd_model.variables.get(
            qname='PD.drug_concentration',
        )
        mapping = PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=pk_variable,
            pd_variable=pd_variable,
        )
        myokit_model = pkpd_model.get_myokit_model()

        # check all the right variables are there
        variables = [
            'myokit.time',
            'PD.drug_concentration',
            'PD.tumour_volume',
            'PD.lambda_0',
            'PD.lambda_1',
            'PD.kappa',
            'central.size',
            'central.drug_c_amount',
            'central.drug_c_concentration',
            'central.dose_rate',
            'peripheral_1.size',
            'peripheral_1.drug_p1_amount',
            'peripheral_1.drug_p1_concentration',
            'peripheral_2.size',
            'peripheral_2.drug_p2_amount',
            'peripheral_2.drug_p2_concentration',
            'myokit.clearance',
            'myokit.k_peripheral1',
            'myokit.k_peripheral2',
            'myokit.drug_c_scale_factor',
            'myokit.scaled_drug_c_concentration',
        ]
        for var in myokit_model.variables():
            self.assertIn(var.qname(), variables)
            index = variables.index(var.qname())
            del variables[index]

        # check that PD.drug_concentration is not constant
        self.assertFalse(
            myokit_model.get('PD.drug_concentration').is_constant()
        )

        # check it still works if remove pk_model
        mapping.delete()
        pkpd_model.pk_model = None
        pkpd_model.save()

        myokit_model = pkpd_model.get_myokit_model()

        # check all the right variables are there
        variables = [
            'PD.time',
            'PD.drug_concentration',
            'PD.tumour_volume',
            'PD.lambda_0',
            'PD.lambda_1',
            'PD.kappa',
        ]

        for var in myokit_model.variables():
            self.assertIn(var.qname(), variables)
            index = variables.index(var.qname())
            del variables[index]

        # check it still works if remove pd_model
        pkpd_model.pk_model = pk_model
        pkpd_model.pd_model = None
        pkpd_model.save()

        myokit_model = pkpd_model.get_myokit_model()

        # check all the right variables are there
        variables = [
            'myokit.time',
            'central.size',
            'central.drug_c_amount',
            'central.drug_c_concentration',
            'central.dose_rate',
            'peripheral_1.size',
            'peripheral_1.drug_p1_amount',
            'peripheral_1.drug_p1_concentration',
            'peripheral_2.size',
            'peripheral_2.drug_p2_amount',
            'peripheral_2.drug_p2_concentration',
            'myokit.clearance',
            'myokit.k_peripheral1',
            'myokit.k_peripheral2',
            'myokit.drug_c_scale_factor',
            'myokit.scaled_drug_c_concentration',
        ]
        for var in myokit_model.variables():
            self.assertIn(var.qname(), variables)
            index = variables.index(var.qname())
            del variables[index]

        # check it still works if remove all models
        pkpd_model.pk_model = None
        pkpd_model.pd_model = None
        pkpd_model.save()

        myokit_model = pkpd_model.get_myokit_model()
        variables = [
            'myokit.time',
        ]
        for var in myokit_model.variables():
            self.assertIn(var.qname(), variables)
            index = variables.index(var.qname())
            del variables[index]
