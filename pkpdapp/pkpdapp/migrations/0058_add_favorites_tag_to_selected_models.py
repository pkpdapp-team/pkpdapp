#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


TAG_NAME = "favorites"
MODEL_NAMES = [
    "1-compartmental model",
    "2-compartmental model",
    "3-compartmental model",
    "1-compartmental extended Michaelis-Menten TMDD model - constant target",
    "2-compartmental extended Michaelis-Menten TMDD model - constant target",
]


def add_favorites_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")

    tag, _ = Tag.objects.get_or_create(name=TAG_NAME)

    for model in PharmacokineticModel.objects.filter(name__in=MODEL_NAMES):
        model.tags.add(tag)


def remove_favorites_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")

    try:
        tag = Tag.objects.get(name=TAG_NAME)
    except Tag.DoesNotExist:
        return

    for model in PharmacokineticModel.objects.filter(name__in=MODEL_NAMES):
        model.tags.remove(tag)


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0057_add_soluble_target_tag_to_matching_models"),
    ]

    operations = [
        migrations.RunPython(
            add_favorites_tag,
            reverse_code=remove_favorites_tag,
        ),
    ]
