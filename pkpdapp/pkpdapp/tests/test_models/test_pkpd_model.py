#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Project,
    PharmacodynamicModel,
    Compound,
    DosedPharmacokineticModel,
    PkpdModel,
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
        dosed_pk_model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pharmacokinetic_model=pk_model,
            dose_compartment='central',
            protocol=protocol,
        )
        pd_model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        pkpd_model = PkpdModel.objects.create(
            dosed_pk_model=dosed_pk_model,
            pd_model=pd_model,
            project=project
        )
        pk_variable = dosed_pk_model.variables.get(
            qname='central.drug_c_concentration',
        )
        pd_variable = pd_model.variables.get(
            qname='myokit.drug_concentration',
        )
        PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=pk_variable,
            pd_variable=pd_variable,
        )

        model = pkpd_model.get_myokit_model()
        for component in model.components():
            print('component', component.name())
            for variable in component.variables():
                print('\tvariable', variable.qname())



