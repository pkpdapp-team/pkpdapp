from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.models import User

import requests
import logging

logger = logging.getLogger(__name__)

UserModel = get_user_model()

API_KEY = settings.AUTH_PREDILOGIN_API_KEY
BASE_URL = settings.AUTH_PREDILOGIN_BASE_URL


def authenticate(password: str, username: str) -> bool:
    logger.debug(f"Authenticating user: {username}")
    endpoint = BASE_URL + "/v2.0/users/authenticate"
    headers = {"Content-Type": "application/json", "X-Gravitee-Api-Key": API_KEY}
    body = {"password": password, "userName": username}
    response = requests.post(endpoint, headers=headers, json=body, verify=False)
    return response.status_code == 200


def check_groupmembership(userid: str, group: str) -> bool:
    logger.debug(f"Checking group membership for user: {userid} in group: {group}")
    endpoint = BASE_URL + "/v2.0/groups/checkUserMembership"
    headers = {"Content-Type": "application/json", "X-Gravitee-Api-Key": API_KEY}
    body = {
        "groups": [group],
        "recLevel": 0,
        "useCache": True,
        "userIdOnly": True,
        "userIds": [userid],
    }
    response = requests.post(endpoint, headers=headers, json=body, verify=False)
    json_response = response.json()
    members = json_response["groups"][0]["members"]
    return any(member["userId"] == userid for member in members) if members else False


class PrediBackend(BaseBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        username = kwargs.get(UserModel.USERNAME_FIELD, username)
        if username is None:
            return None

        user = None
        if password and authenticate(password, username):
            try:
                user = User.objects.get(username=username)
                logger.debug(f"User found: {user.username}")
            except User.DoesNotExist:
                logger.debug(f"User not found, creating new user: {username}")
                is_user = check_groupmembership(username, "GLOPKPDAPP_User")
                is_superuser = check_groupmembership(username, "GLOPKPDAPP_Admin")
                if is_user or is_superuser:
                    user = User(username=username)
                    user.set_password(password)
                    user.is_staff = is_superuser
                    user.is_superuser = is_superuser
                    user.is_active = True
                    user.save()
            if user and not self.user_can_authenticate(user):
                user = None
        return user

    async def aauthenticate(self, request, username=None, password=None, **kwargs):
        self.authenticate(request, password, username, **kwargs)

    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        that attribute are allowed.
        """
        return getattr(user, "is_active", True)

    def get_user(self, user_id):
        user = None
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            pass
        logger.info(f"Retrieved user: {user.username if user else 'None'}")
        return user

    def get_user_permissions(self, user_obj, obj=None):
        logger.info(f"Getting user permissions for: {user_obj.username}")
        return user_obj.get_user_permissions()

    def get_group_permissions(self, user_obj, obj=None):
        logger.info(f"Getting group permissions for: {user_obj.username}")
        return user_obj.get_group_permissions()
