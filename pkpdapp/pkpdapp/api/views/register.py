#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import os

from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST


@ensure_csrf_cookie
@require_POST
def register_view(request):
    # Check if signup is enabled
    enable_signup = os.environ.get("ENABLE_SIGNUP", "false").lower() == "true"
    if not enable_signup:
        return JsonResponse(
            {"detail": "Registration is not enabled on this server."}, status=403
        )

    data = json.loads(request.body)
    password = data.get("password")
    email = data.get("email", "")

    if not email or password is None:
        return JsonResponse(
            {"detail": "Please provide an email address and password."}, status=400
        )

    # The email address doubles as the username.
    username = email

    if User.objects.filter(email=email).exists() or User.objects.filter(
        username=username
    ).exists():
        return JsonResponse(
            {"detail": "A user with this email already exists."}, status=400
        )

    try:
        # Create the new user. The user is created up front but cannot log in
        # until their email address has been verified (enforced in login_view).
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
        )

        # Register the email with allauth as unverified and send the
        # confirmation email containing the verify link.
        email_address, _ = EmailAddress.objects.get_or_create(
            user=user,
            email=email,
            defaults={"primary": True, "verified": False},
        )
        email_address.send_confirmation(request, signup=True)

        return JsonResponse(
            {
                "detail": "Registration successful. Please check your email "
                "to verify your account before logging in."
            }
        )

    except Exception as e:
        return JsonResponse({"detail": f"Registration failed: {str(e)}"}, status=500)
