#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from allauth.account.models import EmailConfirmationHMAC
from django.conf import settings
from django.shortcuts import redirect


def verify_email_view(request, key):
    """
    Confirm an email address from the key embedded in the verification link
    that was emailed to the user, then redirect them back to the SPA.

    The frontend reads the ``verified`` query parameter to show a success or
    failure message and prompt the user to log in.
    """
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    confirmation = EmailConfirmationHMAC.from_key(key)
    if confirmation is None:
        return redirect(f"{base}/?verified=0")

    confirmation.confirm(request)
    return redirect(f"{base}/?verified=1")
