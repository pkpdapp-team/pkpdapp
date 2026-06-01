#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
from django.db.models import Q


TAG_NAME = "soluble target"
SOLUBLE_TARGET_SUFFIX = "soluble target"
CATCH_AND_RELEASE_SUFFIX = "(catch and release)"


def _matching_models(model_class):
    return model_class.objects.filter(
        Q(name__iendswith=SOLUBLE_TARGET_SUFFIX)
        | Q(name__iendswith=CATCH_AND_RELEASE_SUFFIX)
    )


def add_soluble_target_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")

    tag, _ = Tag.objects.get_or_create(name=TAG_NAME)

    for model in _matching_models(PharmacokineticModel):
        model.tags.add(tag)

    for model in _matching_models(PharmacodynamicModel):
        model.tags.add(tag)


def remove_soluble_target_tag(apps, schema_editor):
    Tag = apps.get_model("pkpdapp", "Tag")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")

    try:
        tag = Tag.objects.get(name=TAG_NAME)
    except Tag.DoesNotExist:
        return

    for model in _matching_models(PharmacokineticModel):
        model.tags.remove(tag)

    for model in _matching_models(PharmacodynamicModel):
        model.tags.remove(tag)


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0056_rename_constant_tag"),
    ]

    operations = [
        migrations.RunPython(
            add_soluble_target_tag,
            reverse_code=remove_soluble_target_tag,
        ),
    ]
