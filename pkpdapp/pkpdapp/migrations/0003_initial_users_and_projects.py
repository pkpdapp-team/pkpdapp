#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
from django.contrib.auth.hashers import make_password


def load_users_and_projects(apps, schema_editor):
    compound = {
        'name': 'demoCompound',
        'description': '''This is an example compound demonstrating
        some of the capabilities of pkpdapp''',
        'molecular_mass': 100,
        'molecular_mass_unit': 'g/mol',
        'compound_type': 'SM',
        'intrinsic_clearance_unit': 'µL/min/mg',
        'intrinsic_clearance_assay': 'MS',
        'fraction_unbound_plasma': 1.0,
        'fraction_unbound_including_cells': 1.0,
        'target_molecular_mass': 100,
        'target_molecular_mass_unit': 'g/mol',
        'target_concentration': 1e-9,
        'target_concentration_unit': 'nmol/L',
        'dissociation_constant_unit': 'nmol/L',
        'is_soluble': True,
    }
    users = [
        {
            'username': 'demo',
            'password': '12345',
            'projects': [
                {
                    'name': 'demo',
                    'description': '''This is an example project demonstrating
                    some of the capabilities of pkpdapp''',
                    'read_only': False,
                },
            ]
        },
        {
            'username': 'demo2',
            'password': '12345',
            'projects': [
                {
                    'name': 'demo',
                    'description': '''This is an example project demonstrating
                    some of the capabilities of pkpdapp''',
                    'read_only': True,
                },
            ]
        }
    ]

    Project = apps.get_model("pkpdapp", "Project")
    Profile = apps.get_model("pkpdapp", "Profile")
    Unit = apps.get_model("pkpdapp", "Unit")
    User = apps.get_model("auth", "User")
    Compound = apps.get_model("pkpdapp", "Compound")
    compound = Compound.objects.create(
        name=compound['name'],
        description=compound['description'],
        molecular_mass=compound['molecular_mass'],
        compound_type=compound['compound_type'],
        molecular_mass_unit=Unit.objects.get(symbol=compound['molecular_mass_unit']),
        intrinsic_clearance_unit=Unit.objects.get(symbol=compound['intrinsic_clearance_unit']),
        intrinsic_clearance_assay='MS',
        fraction_unbound_plasma=1.0,
        fraction_unbound_including_cells=1.0,
        target_molecular_mass=100,
        target_molecular_mass_unit=Unit.objects.get(symbol=compound['target_molecular_mass_unit']),
        target_concentration=1e-9,
        target_concentration_unit=Unit.objects.get(symbol=compound['target_concentration_unit']),
        dissociation_unit=Unit.objects.get(symbol=compound['dissociation_constant_unit']),
        is_soluble=True,
    )
    for u in users:
        user = User.objects.create(
            username=u['username'],
            password=make_password(u['password']),
        )
        
        for p in u['projects']:
            try:
                project = Project.objects.get(
                    name=p['name']
                )
            except Project.DoesNotExist:
                project = Project.objects.create(
                    name=p['name'],
                    description=p['description'],
                    compound=compound,
                )
            project.users.add(
                user,
                through_defaults={'read_only': p['read_only']}
            )

        profile = Profile(
            user=user,
        )
        profile.save()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_users_and_projects),
    ]
