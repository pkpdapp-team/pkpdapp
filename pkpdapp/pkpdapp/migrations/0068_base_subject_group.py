#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


BASE_GROUP_NAME = "Sim-Group 1"


def create_base_groups(apps, schema_editor):
    """
    Give every project a real base "Sim-Group 1" SubjectGroup and repoint the
    project's group-less simulation protocols (group IS NULL, dataset IS NULL)
    at it. Dataset/subject protocols (which carry a dataset) are left untouched.
    """
    Project = apps.get_model("pkpdapp", "Project")
    SubjectGroup = apps.get_model("pkpdapp", "SubjectGroup")
    Protocol = apps.get_model("pkpdapp", "Protocol")

    for project in Project.objects.all():
        # idempotent get-or-create of the project-level base group
        base_group = (
            SubjectGroup.objects.filter(
                project=project, dataset__isnull=True, name=BASE_GROUP_NAME
            ).first()
        )
        if base_group is None:
            base_group = SubjectGroup.objects.create(
                name=BASE_GROUP_NAME, project=project, dataset=None
            )

        Protocol.objects.filter(
            group__isnull=True, project=project, dataset__isnull=True
        ).update(group=base_group)


def remove_base_groups(apps, schema_editor):
    """
    Best-effort reverse: null out the group on protocols pointing at a base
    group, then delete the base groups. Keyed off name + dataset IS NULL, so it
    cannot distinguish a base group this migration created from one a user later
    renamed/recreated. Protocols are unlinked first to avoid CASCADE deletion.
    """
    SubjectGroup = apps.get_model("pkpdapp", "SubjectGroup")
    Protocol = apps.get_model("pkpdapp", "Protocol")

    base_groups = SubjectGroup.objects.filter(
        dataset__isnull=True, name=BASE_GROUP_NAME
    )
    for base_group in base_groups:
        Protocol.objects.filter(group=base_group).update(group=None)
    base_groups.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0067_merge_20260716_2304"),
    ]

    operations = [
        migrations.RunPython(
            create_base_groups,
            reverse_code=remove_base_groups,
        ),
    ]
