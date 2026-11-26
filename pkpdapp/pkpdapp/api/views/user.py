#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pkpdapp.api.serializers import UserSerializer
from pkpdapp.models import Profile

logger = logging.getLogger(__name__)

MIN_SEARCH_LENGTH = 3
MAX_LOCAL_RESULTS = 20


def _predilogin():
    """predilogin reads settings at import time, so import lazily"""
    if not getattr(settings, "AUTH_PREDILOGIN_BASE_URL", None):
        return None
    from pkpdapp import predilogin

    return predilogin


class UserView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def search(self, request):
        """
        Search local users and (if configured) the predilogin directory.
        Directory-only matches are returned with id=None.
        """
        q = request.query_params.get("q", "").strip()
        if len(q) < MIN_SEARCH_LENGTH:
            return Response([])

        local = (
            User.objects.filter(
                Q(username__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(email__icontains=q)
            )
            .filter(Q(is_active=True) | Q(profile__is_placeholder=True))
            .select_related("profile")
            .order_by("username")
            .distinct()[:MAX_LOCAL_RESULTS]
        )
        results = {}
        for user in local:
            profile = getattr(user, "profile", None)
            results[user.username.lower()] = {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "department": profile.department if profile else "",
                "is_placeholder": bool(profile and profile.is_placeholder),
            }

        predi = _predilogin()
        if predi is not None:
            for found in predi.search_users(q):
                key = found.username.lower()
                if not found.username or key in results:
                    continue
                results[key] = {
                    "id": None,
                    "username": found.username,
                    "first_name": found.first_name,
                    "last_name": found.last_name,
                    "email": found.email,
                    "department": "",
                    "is_placeholder": True,
                }
        return Response(list(results.values()))

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def placeholder(self, request):
        """
        Get or create a placeholder user for a directory user who has not
        logged in yet. Details are re-fetched server side.
        """
        username = (request.data.get("username") or "").strip()
        if not username:
            raise ValidationError({"username": "required"})

        user = User.objects.filter(username__iexact=username).first()
        if user is not None:
            profile = getattr(user, "profile", None)
            if user.is_active or (profile and profile.is_placeholder):
                return Response(UserSerializer(user).data)
            raise ValidationError({"username": "user cannot be shared with"})

        predi = _predilogin()
        if predi is None:
            raise ValidationError("User directory is not available")
        details = predi.get_user_details(username)
        if not details:
            raise ValidationError({"username": "unknown user"})

        user = User(
            username=username,
            email=details.get("email", ""),
            first_name=details.get("first_name", ""),
            last_name=details.get("last_name", ""),
            is_active=False,
        )
        user.set_unusable_password()
        try:
            with transaction.atomic():
                user.save()
                Profile.objects.update_or_create(
                    user=user,
                    defaults={
                        "is_placeholder": True,
                        "department": details.get("department", ""),
                    },
                )
        except IntegrityError:
            # lost a race with a concurrent request: return the winner
            user = User.objects.get(username__iexact=username)
            return Response(UserSerializer(user).data)
        user.refresh_from_db()
        return Response(UserSerializer(user).data, status=201)
