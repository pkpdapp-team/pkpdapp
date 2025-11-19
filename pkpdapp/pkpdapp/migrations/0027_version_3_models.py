#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import myokit
import csv


def load_pkpd_models(apps, schema_editor):
    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")
    PharmacokineticModel = apps.get_model("pkpdapp", "PharmacokineticModel")
    Tag = apps.get_model("pkpdapp", "Tag")

    with open("pkpdapp/migrations/models-v3/models.csv", newline="") as csvfile:
        models = csv.reader(csvfile, delimiter=";")
        first_row = models.__next__()
        first_row_expect = [
            "filename",
            "type",
            "1-compartment",
            "2-compartment",
            "3-compartment",
            "PK",
            "TMDD",
            "QSS",
            "MM",
            "bispecific",
            "soluble",
            "constant",
            "direct",
            "indirect",
            "TGI",
            "DDI",
        ]
        for i, col in enumerate(first_row):
            assert col == first_row_expect[i]
        for row in models:
            # tags are 1-compartment to the end
            filename = row[0]
            tags = []
            for i, is_tag in enumerate(row[2:]):
                if is_tag == "1":
                    tags.append(first_row[2 + i])
            # type can be PK-Model, PD-Model, PK-Extravascular, or Tumor-Growth
            if (
                row[1] == "PK-Model"
                or row[1] == "PK-Extravascular"
                or row[1] == "PK-Effect-Compartment"
            ):
                model_class = PharmacokineticModel
                if row[1] == "PK-Model":
                    model_type = "PK"
                elif row[1] == "PK-Extravascular":
                    model_type = "PKEX"
                else:
                    model_type = "PKEF"
            else:
                model_class = PharmacodynamicModel
                if row[1] == "PD-Model":
                    model_type = "PD"
                elif row[1] == "Tumor-Growth":
                    model_type = "TG"
                else:
                    model_type = "TGI"
            mmt_filename = f"pkpdapp/migrations/models-v3/{filename}"
            print("parsing model file", mmt_filename)
            mmt_string = open(mmt_filename, "r").read()
            myokit_model = myokit.parse(mmt_string)[0]
            myokit_model.validate()
            try:
                print("updating existing model", mmt_filename)
                model = model_class.objects.get(name=myokit_model.meta["name"])
                model.description = myokit_model.meta["name"]
                model.mmt = mmt_string
                model.model_type = model_type
                model.tags.clear()
            except model_class.DoesNotExist:
                print("adding new model", mmt_filename)
                model = model_class.objects.create(
                    name=myokit_model.meta["name"],
                    description=myokit_model.meta["name"],
                    mmt=mmt_string,
                    is_library_model=True,
                    model_type=model_type,
                )

            for tag in tags:
                tag_model = Tag.objects.get(name=tag)
                model.tags.add(tag_model)
            model.save()


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0026_add_model_type"),
    ]

    operations = [
        migrations.RunPython(load_pkpd_models),
    ]
