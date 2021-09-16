#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import codecs


def load_pkpd_models(apps, schema_editor):
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

    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")

    for m in models_pk:
        try:
            with urllib.request.urlopen(m['sbml_url'], timeout=5) as f:
                # parse as csv file
                sbml_string = codecs.decode(f.read(), 'utf-8')
                model = PharmacokineticModel.objects.create(
                    name=m['name'],
                    description=m['description'],
                    sbml=sbml_string,
                )
        except urllib.error.URLError:
            print('WARNING: urlopen timed-out, no data loaded')


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models),
    ]
