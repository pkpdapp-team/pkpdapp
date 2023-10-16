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
    models_pd = [
        {
            'name':
            'tumour_growth_inhibition_model_koch',
            'description':
            '''
Tumour growth inhibition pharmacodynamic model introduced by Koch et al. in
[1].  In this model the tumour growth inhibition is modelled by an empirical
model of the tumour volume \(V_T\) over time

$$
    \\frac{\\text{d}V_T}{\\text{d}t} =
        \\frac{2\\lambda_0\\lambda_1 V_T}
        {2\\lambda_0V_T + \\lambda_1} - \\kappa C V_T.
$$

Here, the tumour growth in absence of the drug is assumed to grow
exponentially at rate \(2\\lambda_0\) for tumour volumes below some
critical volume \(V_{\\text{crit}}\). For volumes beyond
\(V_{\\text{crit}}\) the growth dynamics is assumed to slow down
and transition to a linear growth at rate \(\\lambda_0\). The tumour
growth inhibitory effect of the compound is modelled proportionally to
its concentration \(C\) and the current tumour volume. The
proportionality factor \(\\kappa\) can be interpreted as the potency
of the drug.
Note that the critical tumour volume \(V_{\\text{crit}}\) at which
the growth dynamics transitions from exponential to linear growth is
given by the two growth rates

$$
    V_{\\text{crit}} = \\frac{\\lambda _1}{2\\lambda _0}.
$$

**References**

[1] Koch, G. et al. Modeling of tumor growth and anticancer effects
    of combination therapy. J Pharmacokinet Pharmacodyn 36, 179–197
    (2009).''',  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009.xml'  # noqa: E501
        },
        {
            'name':
            'tumour_growth_inhibition_model_koch_reparametrised',
            'description':
            """
Returns the absolute path to a SBML file, specifying the tumour growth
inhibition pharmacodynamic model introduced by Koch et al. in [1]_ with
modified parametrisation.

In this model the tumour growth inhibition is modelled by an empirical
model of the tumour volume \(V_T\) over time

$$
    \\frac{\\text{d}V_T}{\\text{d}t} =
        \\frac{\lambda V_T}
        {V_T / V_{\\text{crit}} + 1} - \\kappa C V_T.
$$

Here, the tumour growth in absence of the drug is assumed to grow
exponentially at rate \(\\lambda\) for tumour volumes below some
critical volume \(V_{\\text{crit}}\). For volumes beyond
\(V_{\\text{crit}}\) the growth dynamics is assumed to slow down
and transition to a linear growth at rate
\(\\lambda V_{\\text{crit}}\). The tumour growth inhibitory effect
of the compound is modelled proportionally to its concentration
\(C\) and the current tumour volume. The proportionality factor
\(\\kappa\) can be interpreted as the potency of the drug.

Note that this parameterisation of the model is related to the original
parametersation in [1]_ by

$$
    V_{\\text{crit}} = \\frac{\\lambda _1}{2\\lambda _0} \\quad \\text{and}
    \\quad \\lambda = 2\\lambda _1 .
$$
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009_reparametrised.xml'  # noqa: E501
        },
    ]
    models_pd = []
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
            'name': 'tumour_growth_gompertz',
            'description': '',
            'mmt_filename': 'pkpdapp/migrations/models/TG_Gompertz_PDModel.mmt'  # noqa: E501
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
    ]

    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    CombinedModel = apps.get_model("pkpdapp", "CombinedModel")
    Unit = apps.get_model("pkpdapp", "Unit")
    Variable = apps.get_model("pkpdapp", "Variable")
    Project = apps.get_model("pkpdapp", "Project")
    demo_project = Project.objects.get(name='demo')
    for m in models_pd:
        try:
            with urllib.request.urlopen(m['sbml_url'], timeout=5) as f:
                sbml_string = codecs.decode(f.read(), 'utf-8')
                model = PharmacodynamicModel.objects.create(
                    name=m['name'],
                    description=m['description'],
                    mmt=MyokitModelMixin.sbml_string_to_mmt(sbml_string),
                    project=demo_project,
                    is_library_model=True,
                )

                myokit_model = SBMLParser().parse_string(
                    str.encode(sbml_string)
                ).myokit_model()

                for i, v in enumerate(myokit_model.variables()):
                    unit = v.unit()
                    exponents = unit.exponents()
                    multiplier = unit.multiplier_log_10()
                    close_enough = 1e-9
                    close_enough_units = Unit.objects.filter(
                        g__range=(
                            exponents[0] - close_enough,
                            exponents[0] + close_enough,
                        ),
                        m__range=(
                            exponents[1] - close_enough,
                            exponents[1] + close_enough,
                        ),
                        s__range=(
                            exponents[2] - close_enough,
                            exponents[2] + close_enough,
                        ),
                        A__range=(
                            exponents[3] - close_enough,
                            exponents[3] + close_enough,
                        ),
                        K__range=(
                            exponents[4] - close_enough,
                            exponents[4] + close_enough,
                        ),
                        cd__range=(
                            exponents[5] - close_enough,
                            exponents[5] + close_enough,
                        ),
                        mol__range=(
                            exponents[6] - close_enough,
                            exponents[6] + close_enough,
                        ),
                        multiplier__range=(
                            multiplier - close_enough,
                            multiplier + close_enough,
                        ),
                    )
                    if close_enough_units.count() > 0:
                        stored_unit = close_enough_units[0]
                    else:
                        raise RuntimeError(
                            'Unit {} {} ({}) does not exist'.format(
                                unit, unit.exponents(),
                                unit.multiplier_log_10()
                            )
                        )

                    Variable.objects.create(
                        name=v.name(),
                        qname=v.qname(),
                        constant=v.is_constant(),
                        state=v.is_state(),
                        binding=v.binding(),
                        unit=stored_unit,
                        pd_model=model,
                        color=i,
                        display=v.name() != 'time',
                    )

        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

    for m in models_pd_mmt:
        try:
            # check myokit can parse the model
            mmt_string = open(m['mmt_filename'], 'r').read()
            myokit_model = myokit.parse(mmt_string)[0]
            print('loading', m['mmt_filename'], myokit_model.meta['name'])
            myokit_model.validate()
            model = PharmacodynamicModel.objects.create(
                name=m['name'],
                description=myokit_model.meta['name'],
                mmt=mmt_string,
            )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

    for m in models_pk:
        try:
            # check myokit can parse the model
            mmt_string = open(m['mmt_filename'], 'r').read()
            myokit_model = myokit.parse(mmt_string)[0]
            print('loading', m['mmt_filename'], myokit_model.meta['name'])
            myokit_model.validate()
            model = PharmacokineticModel.objects.create(
                name=m['name'],
                description=myokit_model.meta['name'],
                mmt=mmt_string,
                is_library_model=True,
            )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

    model = CombinedModel.objects.create(
        name='demo',
        project=demo_project,
    )

    # three_comp_model = PharmacokineticModel.objects.get(
    #    name='three_compartment_pk_model'
    # )
    # usecase0_model = DosedPharmacokineticModel.objects.create(
    #    name='usecase0',
    #    project=demo_project,
    #    pk_model=three_comp_model,
    #    dose_compartment='central',
    #    protocol=(
    #        Dataset.objects.get(name='usecase0')
    #        .subjects.first().protocol
    #    )
    # )
    # for variable in usecase0_model.variables.all():
    #    if variable.qname == 'myokit.drug_c_scale':
    #        continue
    #    if variable.state and variable.qname != 'myokit.drug_c_concentration':
    #        variable.display = False
    #    variable.lower_bound = 0
    #    variable.upper_bound = 0.1
    #    variable.default_value = 0.05
    #    variable.save()

    # usecase1_model = DosedPharmacokineticModel.objects.create(
    #    name='usecase1',
    #    project=demo_project,
    #    pk_model=three_comp_model,
    #    dose_compartment='central',
    #    protocol=(
    #        Dataset.objects.get(name='usecase1')
    #        .subjects.first().protocol
    #    )
    # )
    # for variable in usecase1_model.variables.all():
    #    if variable.qname == 'myokit.drug_c_scale':
    #        continue
    #    if variable.state and variable.qname != 'myokit.drug_c_concentration':
    #        variable.display = False

    #    variable.lower_bound = 0
    #    variable.upper_bound = 0.1
    #    variable.default_value = 0.05
    #    variable.save()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
        ('pkpdapp', '0005_initial_datasets'),
        ('pkpdapp', '0007_initial_units'),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models),
    ]
