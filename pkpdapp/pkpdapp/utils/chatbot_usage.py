#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""Per-user chatbot spend tracking and monthly limits.

Spend is recorded in our own database (ChatbotUsage). The only call to
Portkey here is its public model pricing endpoint, which receives the model
name and nothing about the user.
"""
import dataclasses
import datetime
import logging
import math
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Optional

import httpx
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.cache import cache

from pkpdapp.models import ChatbotUsage

logger = logging.getLogger("pkpdapp.utils.chatbot")

PORTKEY_PRICING_URL = "https://api.portkey.ai/model-configs/pricing"
# Prices are re-fetched once they are older than this...
_PRICING_REFRESH_SECONDS = 24 * 60 * 60
# ...but a previously fetched price is still used, if fetching fails, until
# it is older than this.
_PRICING_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
_PRICING_RETRY_SECONDS = 5 * 60
_PRICING_TIMEOUT_SECONDS = 2
_PRICING_CACHE_KEY = "chatbot_model_pricing"


@dataclass(frozen=True)
class TokenUsage:
    """Token counts reported for one Responses API call."""

    input_tokens: int = 0
    output_tokens: int = 0
    # The part of input_tokens served from the provider's prompt cache.
    cached_input_tokens: int = 0

    @classmethod
    def from_response(cls, usage: Any) -> "TokenUsage":
        """Build from a Responses API `response.usage` object.

        Reasoning tokens are included in output_tokens.
        """
        input_tokens = getattr(usage, "input_tokens", None) or 0
        details = getattr(usage, "input_tokens_details", None)
        cached_tokens = getattr(details, "cached_tokens", None) or 0
        return cls(
            input_tokens=input_tokens,
            output_tokens=getattr(usage, "output_tokens", None) or 0,
            cached_input_tokens=min(cached_tokens, input_tokens),
        )


@dataclass(frozen=True)
class ModelPricing:
    """Model prices in USD per token."""

    input: float
    output: float
    # Price of cached input tokens; None means the same as `input`.
    cached_input: Optional[float] = None

    def cost(self, usage: TokenUsage) -> float:
        """Return the USD cost of `usage` at these prices."""
        cached_price = self.input if self.cached_input is None else self.cached_input
        uncached_tokens = usage.input_tokens - usage.cached_input_tokens
        return (
            uncached_tokens * self.input
            + usage.cached_input_tokens * cached_price
            + usage.output_tokens * self.output
        )


@dataclass(frozen=True)
class _PricingEntry:
    """A price fetched from Portkey, and when."""

    fetched_at: float  # time.time()
    model: str  # "{provider}/{model}"
    pricing: ModelPricing


# Last successfully fetched price per model id. Also stored in the Django
# cache so it is shared between workers and survives restarts.
_last_pricing: dict[str, _PricingEntry] = {}
# time.time() per model id before which a failed fetch is not retried.
_retry_after: dict[str, float] = {}


class ChatbotUnavailable(Exception):
    """Raised when a user may not use the chatbot right now."""

    code: Optional[str] = None


class SpendLimitExceeded(ChatbotUnavailable):
    """Raised when a user has used up their monthly chatbot allowance."""

    code = "monthly_limit_reached"

    def __init__(
        self, spent: Decimal, limit: float, reset_date: datetime.date
    ) -> None:
        self.spent = spent
        self.limit = limit
        self.reset_date = reset_date
        super().__init__(
            "You've reached your monthly AI assistant usage limit. "
            f"Your allowance resets on {reset_date.day} "
            f"{reset_date:%B %Y}."
        )


class PricingUnavailable(ChatbotUnavailable):
    """Raised when a spend limit is set but the model price is unknown."""

    code = "pricing_unavailable"

    def __init__(self) -> None:
        super().__init__(
            "The AI assistant is temporarily unavailable. "
            "Please try again later."
        )


def _pricing_model_name(model: str) -> str:
    """The model without any Portkey '@provider-slug/' prefix."""
    if model.startswith("@") and "/" in model:
        model = model.split("/", 1)[1]
    return model


def _pricing_model_id(model: str) -> str:
    return f"{settings.CHATBOT_PRICING_PROVIDER}/{_pricing_model_name(model)}"


def _fetch_portkey_pricing(model_id: str) -> ModelPricing:
    """Fetch a model's prices from Portkey.

    Portkey reports prices in USD cents per token.
    """
    url = f"{PORTKEY_PRICING_URL}/{model_id}"
    response = httpx.get(url, timeout=_PRICING_TIMEOUT_SECONDS)
    response.raise_for_status()
    payg = (response.json() or {}).get("pay_as_you_go") or {}

    def price(key: str) -> Optional[float]:
        cents = (payg.get(key) or {}).get("price")
        return None if cents is None else float(cents) / 100

    input_price = price("request_token")
    output_price = price("response_token")
    if input_price is None or output_price is None:
        raise ValueError(f"no token pricing returned from {url}")
    return ModelPricing(
        input=input_price,
        output=output_price,
        cached_input=price("cache_read_input_token"),
    )


def _env_overrides() -> dict[str, float]:
    """USD-per-token prices set by the CHATBOT_*_PRICE_PER_MTOK env vars,
    keyed by ModelPricing field."""
    per_mtok = {
        "input": settings.CHATBOT_INPUT_PRICE_PER_MTOK,
        "cached_input": settings.CHATBOT_CACHED_INPUT_PRICE_PER_MTOK,
        "output": settings.CHATBOT_OUTPUT_PRICE_PER_MTOK,
    }
    return {k: v / 1_000_000 for k, v in per_mtok.items() if v is not None}


def _pricing_cache_key(model_id: str) -> str:
    return f"{_PRICING_CACHE_KEY}:{model_id}"


def _previous_pricing(model_id: str) -> Optional[_PricingEntry]:
    """Return the most recent previously fetched price for the model."""
    entries = [
        e for e in (
            _last_pricing.get(model_id),
            cache.get(_pricing_cache_key(model_id)),
        )
        if isinstance(e, _PricingEntry)
    ]
    return max(entries, key=lambda e: e.fetched_at, default=None)


def _portkey_pricing(model: str) -> Optional[ModelPricing]:
    """Return Portkey's pricing for the model, falling back to the previous
    fetch for up to a week if Portkey can't be reached. None if unknown."""
    model_id = _pricing_model_id(model)
    now = time.time()
    previous = _previous_pricing(model_id)
    age = now - previous.fetched_at if previous else math.inf
    if previous is not None and age < _PRICING_REFRESH_SECONDS:
        return previous.pricing

    if now >= _retry_after.get(model_id, 0.0):
        try:
            pricing = _fetch_portkey_pricing(model_id)
        except Exception as e:
            _retry_after[model_id] = now + _PRICING_RETRY_SECONDS
            logger.error(
                "[chatbot] could not fetch model pricing for %s: %s",
                model_id, e,
            )
        else:
            entry = _PricingEntry(fetched_at=now, model=model_id, pricing=pricing)
            _last_pricing[model_id] = entry
            cache.set(
                _pricing_cache_key(model_id), entry,
                timeout=_PRICING_MAX_AGE_SECONDS,
            )
            return pricing

    if previous is not None and age < _PRICING_MAX_AGE_SECONDS:
        logger.warning(
            "[chatbot] using model pricing fetched %.1f hours ago", age / 3600
        )
        return previous.pricing
    return None


def get_model_pricing(model: Optional[str] = None) -> Optional[ModelPricing]:
    """Return a model's prices (default CHATBOT_MODEL), or None if unknown.

    Env var overrides take precedence for CHATBOT_MODEL; anything not
    overridden comes from Portkey's pricing endpoint.
    """
    model = model or settings.CHATBOT_MODEL or ""
    # the CHATBOT_*_PRICE_PER_MTOK env vars are for the main model
    overrides = _env_overrides() if model == settings.CHATBOT_MODEL else {}
    if "input" in overrides and "output" in overrides:
        return ModelPricing(**overrides)

    fetched = _portkey_pricing(model)
    if fetched is None:
        return None
    return dataclasses.replace(fetched, **overrides)


def record_usage(
    user: AbstractBaseUser,
    usage: TokenUsage,
    pricing: Optional[ModelPricing],
) -> float:
    """Add one Responses API call's usage to the user's monthly total and
    return its cost (0 if pricing is unknown)."""
    cost = pricing.cost(usage) if pricing else 0.0
    ChatbotUsage.record(user, cost, usage.input_tokens, usage.output_tokens)
    return cost


def next_reset_date() -> datetime.date:
    """Return the first day of next month (UTC), when allowances reset."""
    month = ChatbotUsage.current_month()
    if month.month == 12:
        return month.replace(year=month.year + 1, month=1)
    return month.replace(month=month.month + 1)


def check_spend_limit(user: AbstractBaseUser) -> None:
    """Raise SpendLimitExceeded if the user is at or over the monthly limit,
    or PricingUnavailable if a limit is set but spend can't be priced."""
    limit = settings.CHATBOT_MONTHLY_SPEND_LIMIT
    if limit is None:
        return
    if get_model_pricing() is None:
        raise PricingUnavailable()
    spent = ChatbotUsage.spend_this_month(user)
    if spent >= Decimal(str(limit)):
        raise SpendLimitExceeded(spent, limit, next_reset_date())
