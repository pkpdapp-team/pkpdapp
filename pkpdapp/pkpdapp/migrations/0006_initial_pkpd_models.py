#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import codecs


def load_pkpd_models(apps, schema_editor):
    models = [
        {
            'name': 'tumour_growth_inhibition_model_koch',
            'description': '''
Tumour growth inhibition pharmacodynamic model introduced by Koch et al. in
[1]_.  In this model the tumour growth inhibition is modelled by an empirical
model of the tumour volume :math:`V_T` over time
.. math::
    \frac{\text{d}V_T}{\text{d}t} =
        \frac{2\lambda_0\lambda_1 V_T}
        {2\lambda_0V_T + \lambda_1} - \kappa C V_T.
Here, the tumour growth in absence of the drug is assumed to grow
exponentially at rate :math:`2\lambda_0` for tumour volumes below some
critical volume :math:`V_{\text{crit}}`. For volumes beyond
:math:`V_{\text{crit}}` the growth dynamics is assumed to slow down
and transition to a linear growth at rate :math:`\lambda_0`. The tumour
growth inhibitory effect of the compound is modelled proportionally to
its concentration :math:`C` and the current tumour volume. The
proportionality factor :math:`\kappa` can be interpreted as the potency
of the drug.
Note that the critical tumour volume :math:`V_{\text{crit}}` at which
the growth dynamics transitions from exponential to linear growth is
given by the two growth rates
.. math::
    V_{\text{crit}} = \frac{\lambda _1}{2\lambda _0}.

References
----------
.. [1] Koch, G. et al. Modeling of tumor growth and anticancer effects
    of combination therapy. J Pharmacokinet Pharmacodyn 36, 179–197
    (2009).''',  # noqa: W605
            'model_type': 'Pharmacodynamic',
            'sbml_url':
            'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009.xml'  # noqa: E501
        }
    ]

    PkpdModel = apps.get_model("pkpdapp", "PkpdModel")
    Project = apps.get_model("pkpdapp", "Project")
    for m in models:
        with urllib.request.urlopen(m['sbml_url']) as f:
            # parse as csv file
            sbml_string = codecs.decode(f.read(), 'utf-8')
            pkpd_model = PkpdModel(
                name=m['name'],
                description=m['description'],
                model_type=m['model_type'],
                sbml=sbml_string
            )
            pkpd_model.save()
            # add to demo project
            demo_project = Project.objects.get(name='demo')
            demo_project.pkpd_models.add(pkpd_model)



def delete_pkpd_models(apps, schema_editor):
    PkpdModel = apps.get_model("pkpdapp", "PkpdModel")
    PkpdModel.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models, delete_pkpd_models),
    ]
