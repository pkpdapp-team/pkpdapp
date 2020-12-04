#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


def load_projects(apps, schema_editor):
    projects = [
        {
            'name': 'demo',
            'description': '''This is an example project demonstrating some of the
            capabilities of pkpdapp''',
        }
    ]

    Project = apps.get_model("pkpdapp", "Project")
    for b in projects:
        biomarker = Project(
            name=b['name'],
            description=b['description'],
        )
        biomarker.save()


def delete_projects(apps, schema_editor):
    Project = apps.get_model("pkpdapp", "Project")
    Project.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_projects, delete_projects),
    ]
