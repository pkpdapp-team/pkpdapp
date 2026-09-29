#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import os

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Set the django.contrib.sites Site (used by django-allauth in the "
        "verification email links and text) to the deployment's HOST_NAME. "
        "Without this the Site keeps its default domain 'example.com'."
    )

    def handle(self, **options):
        host_name = os.environ.get("HOST_NAME")
        if not host_name:
            self.stdout.write(
                "HOST_NAME not set; leaving Site domain unchanged."
            )
            return

        site, _ = Site.objects.update_or_create(
            pk=settings.SITE_ID,
            defaults={"domain": host_name, "name": host_name},
        )
        self.stdout.write(f"Site {site.pk} domain set to {site.domain}")
