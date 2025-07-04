#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import myokit
import csv


# Update the MMT strings for all pharmacodynamic models.
def update_pd_models(apps, schema_editor):
    PharmacodynamicModel = apps.get_model("pkpdapp", "PharmacodynamicModel")

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
            if (
                row[1] == "PK-Model"
                or row[1] == "PK-Extravascular"
                or row[1] == "PK-Effect-Compartment"
            ):
                # Ignore PK models.
                continue
            else:
                mmt_filename = f"pkpdapp/migrations/models-v3/{filename}"
                mmt_string = open(mmt_filename, "r").read()
                myokit_model = myokit.parse(mmt_string)[0]
                myokit_model.validate()
                model_name = myokit_model.meta["name"]
                model = PharmacodynamicModel.objects.get(name=model_name)
                print("updating model", model.name)
                model.mmt = mmt_string
                model.save()


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0033_alter_project_tags"),
    ]

    operations = [
        migrations.RunPython(update_pd_models),
    ]
