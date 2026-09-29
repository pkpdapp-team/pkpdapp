#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from pkpdapp.models import Profile

PREDI_BACKEND = "pkpdapp.predilogin.PrediBackend"


class Command(BaseCommand):
    help = (
        "Update every user's full name, email and department from PrediLogin. "
        "Only runs when the deployment authenticates against PrediLogin "
        "(PrediBackend in AUTHENTICATION_BACKENDS); otherwise it is a no-op."
    )

    def handle(self, **options):
        if PREDI_BACKEND not in settings.AUTHENTICATION_BACKENDS:
            self.stdout.write(
                "PrediLogin is not enabled; leaving users unchanged."
            )
            return

        # Imported here: predilogin reads AUTH_PREDILOGIN_* settings at import
        # time, which only exist when PrediLogin is enabled.
        from pkpdapp.predilogin import get_user_details

        for user in User.objects.all():
            details = get_user_details(user.username)
            if not details:
                self.stdout.write(
                    f"No details found for {user.username}; skipping."
                )
                continue
            if details.get("email"):
                user.email = details["email"]
            if details.get("first_name"):
                user.first_name = details["first_name"]
            if details.get("last_name"):
                user.last_name = details["last_name"]
            user.save()

            if details.get("department"):
                profile, _ = Profile.objects.get_or_create(user=user)
                profile.department = details["department"]
                profile.save()

            self.stdout.write(f"Updated user from PrediLogin: {user.username}")
