#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import importlib


v3models = importlib.import_module("pkpdapp.migrations.0027_version_3_models")


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0059_tgi_dimensionless_units"),
    ]

    operations = [
        migrations.RunPython(v3models.load_pkpd_models),
    ]
