#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


def load_algorithms(apps, schema_editor):
    Algorithm = apps.get_model("pkpdapp", "Algorithm")

    algorithms = [
        {
            'name': 'Haario-Bardenet',
            'category': 'SA',
        },
        {
            'name': 'Differential evolution',
            'category': 'SA',
        },
        {
            'name': 'DREAM',
            'category': 'SA',
        },
        {
            'name': 'Population MCMC',
            'category': 'SA',
        },
        {
            'name': 'CMAES',
            'category': 'OP',
        },
        {
            'name': 'XNES',
            'category': 'OP',
        },
        {
            'name': 'SNES',
            'category': 'OP',
        },
        {
            'name': 'PSO',
            'category': 'OP',
        },
        {
            'name': 'Nelder-Mead',
            'category': 'OP',
        },

    ]

    for algorithm in algorithms:
        Algorithm.objects.create(
            name=algorithm['name'],
            category=algorithm['category'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_algorithms),
    ]
