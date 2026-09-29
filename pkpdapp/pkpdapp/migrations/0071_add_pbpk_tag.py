#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


TAG_NAME = "PBPK"


def add_pbpk_tag(apps, schema_editor):
    # Create the PBPK tag before the models are (re)loaded so that
    # load_pkpd_models can assign it from models.csv like every other tag.
    Tag = apps.get_model("pkpdapp", "Tag")
    Tag.objects.get_or_create(name=TAG_NAME)


def remove_pbpk_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    Tag.objects.filter(name=TAG_NAME).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0070_subjectgroup_age_max_subjectgroup_age_min_and_more"),
    ]

    operations = [
        migrations.RunPython(
            add_pbpk_tag,
            reverse_code=remove_pbpk_tag,
        ),
    ]
