#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from allauth.account.adapter import DefaultAccountAdapter
from django.urls import reverse


class PkpdAccountAdapter(DefaultAccountAdapter):
    """
    Custom allauth account adapter.

    The default allauth email-confirmation link points at allauth's own
    server-rendered confirmation page. Because the user-facing app is a
    single-page React frontend, we instead point the emailed link at our own
    API verify endpoint (``/api/verify-email/<key>/``), which confirms the
    address and then redirects the browser to the SPA.
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        path = reverse(
            "auth-verify-email", kwargs={"key": emailconfirmation.key}
        )
        return request.build_absolute_uri(path)
