#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_project_shared_email(user, project, shared_by, read_only):
    """
    Notify `user` that `project` has been shared with them by `shared_by`.
    Never raises: a failed email must not fail the project save.
    """
    if not user.email:
        logger.info(f"Not emailing {user.username}: no email address")
        return
    try:
        base = (settings.FRONTEND_BASE_URL or "").rstrip("/")
        context = {
            "user": user,
            "project": project,
            "shared_by": shared_by,
            "shared_by_name": (
                shared_by.get_full_name() or shared_by.username
                if shared_by
                else "A colleague"
            ),
            "read_only": read_only,
            "project_url": base,
            "login_url": base,
        }
        subject = f"PKPDApp: project '{project.name}' was shared with you"
        text = render_to_string("email/project_shared.txt", context)
        html = render_to_string("email/project_shared.html", context)
        message = EmailMultiAlternatives(
            subject, text, settings.DEFAULT_FROM_EMAIL, [user.email]
        )
        message.attach_alternative(html, "text/html")
        message.send()
    except Exception:
        logger.exception(f"Failed to send share email to {user.username}")
