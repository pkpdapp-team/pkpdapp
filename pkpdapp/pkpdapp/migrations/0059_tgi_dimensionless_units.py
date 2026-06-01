#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


def remove_soluble_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    tag = Tag.objects.get(name="soluble")
    tag.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0058_add_favorites_tag_to_selected_models"),
    ]

    operations = [
        migrations.RunPython(remove_soluble_tag),
    ]
