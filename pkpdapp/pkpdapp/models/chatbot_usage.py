#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import datetime
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.db.models import F
from django.utils import timezone


class ChatbotUsage(models.Model):
    """Chatbot LLM usage and spend for one user in one calendar month (UTC)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chatbot_usage",
    )
    month = models.DateField(help_text="First day of the month (UTC).")
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal("0"),
        help_text="Estimated spend in USD.",
    )
    input_tokens = models.BigIntegerField(default=0)
    output_tokens = models.BigIntegerField(default=0)
    requests = models.BigIntegerField(default=0)

    class Meta:
        ordering = ["-month"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "month"], name="unique_chatbot_usage_user_month"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.month:%Y-%m}: ${self.cost}"

    @staticmethod
    def current_month() -> datetime.date:
        """Return the first day of the current month in UTC."""
        return timezone.now().date().replace(day=1)

    @classmethod
    def record(
        cls,
        user: AbstractBaseUser,
        cost: float,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        """Atomically add one LLM call's usage to this month's total."""
        usage, _ = cls.objects.get_or_create(user=user, month=cls.current_month())
        cls.objects.filter(pk=usage.pk).update(
            cost=F("cost") + Decimal(str(cost)),
            input_tokens=F("input_tokens") + input_tokens,
            output_tokens=F("output_tokens") + output_tokens,
            requests=F("requests") + 1,
        )

    @classmethod
    def spend_this_month(cls, user: AbstractBaseUser) -> Decimal:
        """Return the user's spend (USD) for the current month."""
        usage = cls.objects.filter(user=user, month=cls.current_month()).first()
        return usage.cost if usage else Decimal("0")
