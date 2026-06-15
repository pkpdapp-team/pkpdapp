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
    username = data.get("username")
    password = data.get("password")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    email = data.get("email", "")

    if username is None or password is None:
        return JsonResponse(
            {"detail": "Please provide username and password."}, status=400
        )

    if not email:
        return JsonResponse(
            {"detail": "Please provide an email address."}, status=400
        )

    # Check if user already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"detail": "A user with this username already exists."}, status=400
        )

    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"detail": "A user with this email already exists."}, status=400
        )

    try:
        # Create the new user. The user is created up front but cannot log in
        # until their email address has been verified (enforced in login_view).
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
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
