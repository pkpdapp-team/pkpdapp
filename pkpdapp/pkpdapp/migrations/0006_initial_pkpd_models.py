#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import codecs


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
model of the tumour volume :math:`V_T` over time

.. math::
    \frac{\text{d}V_T}{\text{d}t} =
        \frac{\lambda V_T}
        {V_T / V_{\text{crit}} + 1} - \kappa C V_T.


Here, the tumour growth in absence of the drug is assumed to grow
exponentially at rate :math:`\lambda` for tumour volumes below some
critical volume :math:`V_{\text{crit}}`. For volumes beyond
:math:`V_{\text{crit}}` the growth dynamics is assumed to slow down
and transition to a linear growth at rate
:math:`\lambda V_{\text{crit}}`. The tumour growth inhibitory effect
of the compound is modelled proportionally to its concentration
:math:`C` and the current tumour volume. The proportionality factor
:math:`\kappa` can be interpreted as the potency of the drug.

Note that this parameterisation of the model is related to the original
parametersation in [1]_ by

.. math::
    V_{\text{crit}} = \frac{\lambda _1}{2\lambda _0} \quad \text{and}
    \quad \lambda = 2\lambda _1 .
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
compartment with a linear elimination rate :math:`k_e`

.. math ::
    \frac{\text{d}A}{\text{d}t} = -k_e A \quad C = \frac{A}{V}.

Here, :math:`A` and :math:`C` are the amount and the concentration of
the drug in the body, respectively. :math:`V` is the effective volume
of distribution of the drug in the compartment.

This model may be interpreted as modelling the blood plasma
concentration of the drug, with the assumption that the clearance of
the drug through the liver may be approximated by an exponential decay
with the rate :math:`k_e`.

With a :class:`erlotinib.PharmacokineticModel` the drug may be either
directly administered to :math:`A` or indirectly through a dosing
compartment.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/pk_one_comp.xml'  # noqa: E501
        },
        {
            'name':
            'two_compartment_pk_model',
            'description':
            """
Description of a two compartment PK model here.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/pk_two_comp.xml'  # noqa: E501
        },
        {
            'name':
            'three_compartment_pk_model',
            'description':
            """
Description of a three compartment PK model here.
""",  # noqa: W605
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/pk_three_comp.xml'  # noqa: E501
        },
    ]

    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    Project = apps.get_model("pkpdapp", "Project")
    for m in models_pd:
        with urllib.request.urlopen(m['sbml_url']) as f:
            # parse as csv file
            sbml_string = codecs.decode(f.read(), 'utf-8')
            pkpd_model = PharmacodynamicModel(name=m['name'],
                                              description=m['description'],
                                              sbml=sbml_string)
            pkpd_model.save()
            # add to demo project
            demo_project = Project.objects.get(name='demo')
            demo_project.pd_models.add(pkpd_model)

    for m in models_pk:
        with urllib.request.urlopen(m['sbml_url']) as f:
            # parse as csv file
            sbml_string = codecs.decode(f.read(), 'utf-8')
            pkpd_model = PharmacokineticModel(name=m['name'],
                                              description=m['description'],
                                              sbml=sbml_string)
            pkpd_model.save()


def delete_pkpd_models(apps, schema_editor):
    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacodynamicModel.objects.all().delete()
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    PharmacokineticModel.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models, delete_pkpd_models),
    ]
