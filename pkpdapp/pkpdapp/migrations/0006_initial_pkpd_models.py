#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import codecs
from myokit.formats.sbml import SBMLParser
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
    models_pk = [
        {
            'name':
            'one_compartment_pk_model',
            'description':
            """
In this model the distribution of the drug is modelled by one
compartment with a linear elimination rate \(k_e\)

$$
    \\frac{\\text{d}A}{\\text{d}t} = -k_e A \\quad C = \\frac{A}{V}.
$$

Here, \(A\) and \(C\) are the amount and the concentration of
the drug in the body, respectively. \(V\) is the effective volume
of distribution of the drug in the compartment.

This model may be interpreted as modelling the blood plasma
concentration of the drug, with the assumption that the clearance of
the drug through the liver may be approximated by an exponential decay
with the rate \(k_e\).

With a :class:`erlotinib.PharmacokineticModel` the drug may be either
directly administered to \(A$ or indirectly through a dosing
compartment.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/PK_one_comp.xml'  # noqa: E501
        },
        {
            'name':
            'two_compartment_pk_model',
            'description':
            """
Description of a two compartment PK model here.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/PK_two_comp.xml'  # noqa: E501
        },
        {
            'name':
            'three_compartment_pk_model',
            'description':
            """
Description of a three compartment PK model here.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/PK_three_comp.xml'  # noqa: E501
        },
    ]

    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
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
                    project=demo_project
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
                        unit=stored_unit,
                        pd_model=model,
                        color=i,
                        display=v.name() != 'time',
                    )

        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

    for m in models_pk:
        try:
            with urllib.request.urlopen(m['sbml_url'], timeout=5) as f:
                # parse as csv file
                sbml_string = codecs.decode(f.read(), 'utf-8')
                model = PharmacokineticModel.objects.create(
                    name=m['name'],
                    description=m['description'],
                    mmt=MyokitModelMixin.sbml_string_to_mmt(sbml_string),
                )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')

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
