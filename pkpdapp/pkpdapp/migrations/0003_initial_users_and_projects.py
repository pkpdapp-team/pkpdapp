#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
from django.contrib.auth.hashers import make_password


def load_users_and_projects(apps, schema_editor):
    users = [
        {
            'username': 'demo',
            'password': '12345',
            'selected_project': 'demo',
            'projects': [
                {
                    'name': 'demo',
                    'description': '''This is an example project demonstrating some of the
                    capabilities of pkpdapp''',
                },
            ]
        }
    ]

    Project = apps.get_model("pkpdapp", "Project")
    Profile = apps.get_model("pkpdapp", "Profile")
    User = apps.get_model("auth", "User")
    for u in users:
        user = User.objects.create(
            username=u['username'],
            password=make_password(u['password']),
        )

        for p in u['projects']:
            project = Project.objects.create(
                name=p['name'],
                description=p['description'],
            )
            project.users.add(user)

        project = Project.objects.get(name=u['selected_project'])
        profile = Profile(
            user=user,
            selected_project=project
        )
        profile.save()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_users_and_projects),
    ]
