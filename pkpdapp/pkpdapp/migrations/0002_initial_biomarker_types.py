#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


def load_biomarker_types(apps, schema_editor):
    biomarkers = [
        {
            'id': 0,
            'name': 'concentration',
            'description': 'concentration',
            'unit': 'mg',
        }
    ]

    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")
    for b in biomarkers:
        biomarker = BiomarkerType(
            id=b['id'],
            name=b['name'],
            description=b['description'],
            unit=b['unit']
        )
        biomarker.save()


def delete_biomarker_types(apps, schema_editor):
    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")
    BiomarkerType.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_biomarker_types, delete_biomarker_types),
    ]
