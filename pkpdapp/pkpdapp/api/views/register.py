#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import os

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from pkpdapp.api.serializers import UserSerializer


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

    # Check if user already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"detail": "A user with this username already exists."}, status=400
        )

    if email and User.objects.filter(email=email).exists():
        return JsonResponse(
            {"detail": "A user with this email already exists."}, status=400
        )

    try:
        # Create new user
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email,
        )

        # Automatically log in the user
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return JsonResponse(
                {
                    "user": UserSerializer(user).data,
                    "detail": "Successfully registered and logged in.",
                }
            )
        else:
            return JsonResponse(
                {
                    "detail": "Registration successful but login failed. "
                    "Please try logging in manually."
                },
                status=500,
            )

    except Exception as e:
        return JsonResponse({"detail": f"Registration failed: {str(e)}"}, status=500)
