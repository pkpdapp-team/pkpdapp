#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations, models


OLD_NAME = "constant"
NEW_NAME = "constant target concentration"


def rename_constant_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    Tag.objects.filter(name=OLD_NAME).update(name=NEW_NAME)


def rename_constant_target_concentration_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    Tag.objects.filter(name=NEW_NAME).update(name=OLD_NAME)


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0055_add_ug_unit"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tag",
            name="name",
            field=models.CharField(max_length=50, help_text="name of the tag"),
        ),
        migrations.RunPython(
            rename_constant_tag,
            reverse_code=rename_constant_target_concentration_tag,
        ),
    ]
