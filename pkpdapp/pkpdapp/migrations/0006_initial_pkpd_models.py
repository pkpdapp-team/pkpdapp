#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import codecs
from myokit.formats.sbml import SBMLParser
import myokit
from pkpdapp.models import MyokitModelMixin


def load_pkpd_models(apps, schema_editor):
    models_pd_mmt = [
        {
            'name': 'indirect_effects_stimulation_elimination',
            'description': 'Indirect effects model with stimulation and elimination',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_StimulationElimination_Emax.mmt'  # noqa: E501
        },
        {
            'name': 'indirect_effects_inhibition_elimination',
            'description': 'Indirect effects model with inhibition and elimination',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_InhibitionElimination_Imax.mmt'  # noqa: E501
        },
        {
            'name': 'indirect_effects_stimulation_production',
            'description': 'Indirect effects model with stimulation and production',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_StimulationProduction_Emax.mmt'  # noqa: E501
        },
        {
            'name': 'indirect_effects_inhibition_production',
            'description': 'Indirect effects model with inhibition and production',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_InhibitionProduction_Imax.mmt'  # noqa: E501
        },
        {
            'name': 'indirect_effects_precursor_inhibition_production',
            'description': 'Indirect effects precursor model with inhibition and production',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_Precursor_InhibitionElimination_Emax.mmt'  # noqa: E501
        },
        {
            'name': 'indirect_effects_precursor_stimulation_production',
            'description': 'Indirect effects precursor model with stimulatino and production',  # noqa: E501
            'mmt_filename': 'pkpdapp/migrations/models/IE_Precursor_StimulationElimination_Emax.mmt'  # noqa: E501
        },
        {
            'name': 'direct_effects_emax',
            'description': 'Direct effects model with Emax',
            'mmt_filename': 'pkpdapp/migrations/models/DE_Emax.mmt'  # noqa: E501
        },
        {
            'name': 'direct_effects_imax',
            'description': 'Direct effects model with Imax',
            'mmt_filename': 'pkpdapp/migrations/models/DE_Imax.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_exponential',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Exponential_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_gompertz',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Gompertz_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_linear',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Linear_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_simeoni_logistic',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Simeoni_logistic_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_simeoni',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Simeoni_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_inhibition_delay_cell_distribution_conc_prop_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_CellDistribution_ConcPropKill_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_inhibition_delay_cell_distribution_emax_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_CellDistribution_EmaxKill_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_inhibition_delay_cell_distribution_exp_conc_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_CellDistribution_expConcPropKill_PDModel.mmt'  # noqa: E501
        },

        {
            'name': 'tumour_growth_inhibition_delay_signal_distribution_conc_prop_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_SignalDistribution_ConcPropKill_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_inhibition_delay_signal_distribution_emax_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_SignalDistribution_EmaxKill_PDModel.mmt'  # noqa: E501
        },
        {
            'name': 'tumour_growth_inhibition_delay_signal_distribution_exp_conc_kill',  # noqa: E501
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TGI_Delay_SignalDistribution_expConcPropKill_PDModel.mmt'  # noqa: E501
        },
    ]

    models_pk = [
        {
            'name':
            'one_compartment_clinical',
            'description':
            """
Description of a clinical one compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/1cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name':
            'one_compartment_preclinical',
            'description':
            """
Description of a preclinical one compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/1cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name':
            'two_compartment_clinical',
            'description':
            """
Description of a clinical two compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/2cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name':
            'two_compartment_preclinical',
            'description':
            """
Description of a preclinical two compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/2cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name':
            'three_compartment_clinical',
            'description':
            """
Description of a clinical three compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/3cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name':
            'three_compartment_preclinical',
            'description':
            """
Description of a preclinical three compartment PK model here.
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/3cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_full_clinical',
            'description':
            """
Description of a clinical one compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_1cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_full_preclinical',
            'description':
            """
Description of a clinical one compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_1cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_QSS_clinical',
            'description':
            """
Description of a clinical one compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_1cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_QSS_preclinical',
            'description':
            """
Description of a clinical two compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_1cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_full_clinical',
            'description':
            """
Description of a clinical two compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_2cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_full_preclinical',
            'description':
            """
Description of a clinical two compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_2cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_QSS_clinical',
            'description':
            """
Description of a clinical two compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_2cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_QSS_preclinical',
            'description':
            """
Description of a clinical two compartment TMDD model here.
""",  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_2cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_full_constant_target_clinical',
            'description':
            """
            Description of a clinical one compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_ConstTarget_1cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_full_constant_target_clinical',
            'description':
            """
            Description of a clinical two compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_ConstTarget_2cmpt_PK_Model_clinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_full_constant_target_preclinical',
            'description':
            """
            Description of a preclinical one compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_ConstTarget_1cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_full_constant_target_preclinical',
            'description':
            """
            Description of a preclinical two compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_Full_ConstTarget_2cmpt_PK_Model_preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_qss_constant_target_clinical',
            'description':
            """
            Description of a clinical one compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_ConstTarget_1cmpt_PK_Model_Clinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_qss_constant_target_clinical',
            'description':
            """
            Description of a clinical two compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_ConstTarget_2cmpt_PK_Model_clinical.mmt'  # noqa: E501
        },
        {
            'name': 'one_compartment_tmdd_qss_constant_target_preclinical',
            'description':
            """
            Description of a preclinical one compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_ConstTarget_1cmpt_PK_Model_Preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'two_compartment_tmdd_qss_constant_target_preclinical',
            'description':
            """
            Description of a preclinical two compartment TMDD model here.
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/TMDD_QSS_ConstTarget_2cmpt_PK_Model_preclinical.mmt'  # noqa: E501
        },
        {
            'name': 'three_compartment_mammillary',
            'description':
            """
            3-compartment mammillary PK Model - CL implementation
            """,  # noqa: W605
            'mmt_filename': 'pkpdapp/migrations/models/Dis_Classic_3_Compartmental_Model_CL_mammilary.mmt'  # noqa: E501
        },
        {
            'name': 
            'absorption_first_order',
            'description':
            """
First order absorption model, single absorption site (connects to any PK model)
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/Abs_01_FirstOrder.mmt'  # noqa: E501
        },
        {
            'name': 
            'absorption_transit',
            'description':
            """
Transit compartment absorption model (up to 10 transit compartments)
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/Abs_02_Transit.mmt'  # noqa: E501
        },
        {
            'name': 
            'absorption_ophtha',
            'description':
            """
Occular PK model including Vitreous and Aqueous Humour (can be connected to any systemic PK model)
""",  # noqa: W605
            'mmt_filename':
            'pkpdapp/migrations/models/Abs_03_Ophtha_PK.mmt'  # noqa: E501
        },
    ]

    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")

    for m in models_pd_mmt:
        try:
            # check myokit can parse the model
            mmt_string = open(m['mmt_filename'], 'r').read()
            print('updating', m['mmt_filename'])
            myokit_model = myokit.parse(mmt_string)[0]
            myokit_model.validate()
            # update the model if it already exists
            try:
                model = PharmacodynamicModel.objects.get(name=m['name'])
                model.mmt = mmt_string
                model.description = myokit_model.meta['name']
                model.is_library_model = True
                model.save()
            except PharmacodynamicModel.DoesNotExist:
                # add the model
                print('creating', m['mmt_filename'], myokit_model.meta['name'])
                model = PharmacodynamicModel.objects.create(
                    name=m['name'],
                    description=myokit_model.meta['name'],
                    mmt=mmt_string,
                    is_library_model=True,
                )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

    for m in models_pk:
        try:
            # check myokit can parse the model
            mmt_string = open(m['mmt_filename'], 'r').read()
            myokit_model = myokit.parse(mmt_string)[0]
            myokit_model.validate()
            # update the model if it already exists
            try:
                model = PharmacokineticModel.objects.get(name=m['name'])
                print('updating', m['mmt_filename'], myokit_model.meta['name'])
                model.mmt = mmt_string
                model.description = myokit_model.meta['name']
                model.is_library_model = True
                model.save()
            except PharmacokineticModel.DoesNotExist:
                print('creating', m['mmt_filename'], myokit_model.meta['name'])
                model = PharmacokineticModel.objects.create(
                    name=m['name'],
                    description=myokit_model.meta['name'],
                    mmt=mmt_string,
                    is_library_model=True,
                )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0007_initial_units'),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models),
    ]
