#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import os

PROJECT_NAME = "pkpdapp"


def main():
    from django.apps import apps

    load_units = __import__(
        "pkpdapp.migrations.0007_initial_units", fromlist=["load_units"]
    ).load_units
    load_units(apps, None)


if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "%s.settings" % PROJECT_NAME)
    import django

    django.setup()
    main()
