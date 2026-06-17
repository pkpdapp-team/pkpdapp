#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json

from allauth.account.models import EmailAddress
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from pkpdapp.api.serializers import UserSerializer


def get_csrf(request):
    response = JsonResponse(
        {"X-CSRFToken": get_token(request), "detail": "CSRF cookie set"}
    )
    return response


@ensure_csrf_cookie
@require_POST
def login_view(request):
    data = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")
    if username is None or password is None:
        return JsonResponse(
            {"detail": "Please provide username and password."}, status=400
        )

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse(
            {
                "detail": "Invalid credentials. Either you have supplied an incorrect username/password combination, or you do not have sufficient access"  # noqa E501
            },
            status=400,
        )

    # If this user has any allauth-managed email addresses (i.e. they signed
    # up through the email/password registration flow), require that at least
    # one is verified before allowing login. Users created by other means
    # (LDAP, Predi, admin, social login) have no unverified addresses and are
    # unaffected.
    email_addresses = EmailAddress.objects.filter(user=user)
    if email_addresses.exists() and not email_addresses.filter(verified=True).exists():
        return JsonResponse(
            {
                "detail": "Please verify your email address before logging in. "
                "Check your inbox for the verification link."
            },
            status=403,
        )

    login(request, user)

    return JsonResponse(
        {"user": UserSerializer(user).data, "detail": "Successfully logged in."}
    )


@ensure_csrf_cookie
def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "You're not logged in."}, status=400)

    logout(request)
    return JsonResponse({"detail": "Successfully logged out."})


class SessionView(APIView):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, format=None):
        return JsonResponse(
            {"isAuthenticated": True, "user": UserSerializer(request.user).data}
        )


class WhoAmIView(APIView):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, format=None):
        return JsonResponse({"user": request.user})
