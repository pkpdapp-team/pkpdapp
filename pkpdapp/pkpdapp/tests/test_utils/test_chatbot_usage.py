#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import dataclasses
import datetime
import time
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache.backends.locmem import LocMemCache
from django.test import TestCase, override_settings

from pkpdapp.models import ChatbotUsage
from pkpdapp.utils import chatbot_usage
from pkpdapp.utils.chatbot_usage import ModelPricing, TokenUsage


def pricing_response(payload):
    response = mock.Mock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


PORTKEY_PAYLOAD = {
    "pay_as_you_go": {
        "request_token": {"price": 0.00025},
        "response_token": {"price": 0.001},
        "cache_read_input_token": {"price": 0.000125},
    },
    "currency": "USD",
}

PRICING = ModelPricing(input=1e-6, output=4e-6, cached_input=0.5e-6)
DAY = 24 * 60 * 60
# the pricing id of CHATBOT_MODEL below
MODEL_ID = "openai/gpt-test"


@override_settings(
    CHATBOT_MODEL="@my-openai/gpt-test",
    CHATBOT_PRICING_PROVIDER="openai",
    CHATBOT_INPUT_PRICE_PER_MTOK=None,
    CHATBOT_CACHED_INPUT_PRICE_PER_MTOK=None,
    CHATBOT_OUTPUT_PRICE_PER_MTOK=None,
    CHATBOT_SMALL_MODEL="gpt-test-mini",
    CHATBOT_SMALL_INPUT_PRICE_PER_MTOK=None,
    CHATBOT_SMALL_CACHED_INPUT_PRICE_PER_MTOK=None,
    CHATBOT_SMALL_OUTPUT_PRICE_PER_MTOK=None,
)
class ModelPricingTestCase(TestCase):
    def setUp(self):
        for name in ["_last_pricing", "_retry_after"]:
            setattr(chatbot_usage, name, {})
            self.addCleanup(setattr, chatbot_usage, name, {})
        self.cache = LocMemCache("chatbot-usage-tests", {})
        self.cache.clear()
        cache_patch = mock.patch.object(chatbot_usage, "cache", self.cache)
        cache_patch.start()
        self.addCleanup(cache_patch.stop)

    def previous_pricing(self, age, pricing=PRICING):
        return chatbot_usage._PricingEntry(
            fetched_at=time.time() - age,
            model=MODEL_ID,
            pricing=pricing,
        )

    def test_fetches_portkey_pricing_in_dollars_per_token(self):
        with mock.patch.object(
            chatbot_usage.httpx, "get",
            return_value=pricing_response(PORTKEY_PAYLOAD),
        ) as get:
            pricing = chatbot_usage.get_model_pricing()
            # Second call is served from the cache.
            chatbot_usage.get_model_pricing()

        get.assert_called_once()
        self.assertEqual(
            get.call_args.args[0],
            "https://api.portkey.ai/model-configs/pricing/openai/gpt-test",
        )
        self.assertAlmostEqual(pricing.input, 2.5e-6)
        self.assertAlmostEqual(pricing.cached_input, 1.25e-6)
        self.assertAlmostEqual(pricing.output, 1e-5)

    @override_settings(
        CHATBOT_INPUT_PRICE_PER_MTOK=2.0,
        CHATBOT_OUTPUT_PRICE_PER_MTOK=8.0,
    )
    def test_env_overrides_skip_portkey(self):
        with mock.patch.object(chatbot_usage.httpx, "get") as get:
            pricing = chatbot_usage.get_model_pricing()

        get.assert_not_called()
        self.assertEqual(pricing, ModelPricing(input=2e-6, output=8e-6))

    @override_settings(
        CHATBOT_INPUT_PRICE_PER_MTOK=2.0,
        CHATBOT_OUTPUT_PRICE_PER_MTOK=8.0,
        CHATBOT_SMALL_INPUT_PRICE_PER_MTOK=0.5,
        CHATBOT_SMALL_OUTPUT_PRICE_PER_MTOK=1.0,
    )
    def test_small_model_has_its_own_env_overrides(self):
        with mock.patch.object(chatbot_usage.httpx, "get") as get:
            pricing = chatbot_usage.get_model_pricing("gpt-test-mini")

        get.assert_not_called()
        self.assertEqual(pricing, ModelPricing(input=0.5e-6, output=1e-6))

    def test_returns_none_when_portkey_fails(self):
        with mock.patch.object(
            chatbot_usage.httpx, "get", side_effect=OSError("offline")
        ):
            self.assertIsNone(chatbot_usage.get_model_pricing())

    def test_failed_fetch_is_not_retried_immediately(self):
        with mock.patch.object(
            chatbot_usage.httpx, "get", side_effect=OSError("offline")
        ) as get:
            chatbot_usage.get_model_pricing()
            chatbot_usage.get_model_pricing()

        get.assert_called_once()

    def test_falls_back_to_previous_price_under_a_week_old(self):
        chatbot_usage._last_pricing[MODEL_ID] = self.previous_pricing(6 * DAY)
        with mock.patch.object(
            chatbot_usage.httpx, "get", side_effect=OSError("offline")
        ) as get:
            pricing = chatbot_usage.get_model_pricing()

        get.assert_called_once()
        self.assertEqual(pricing, PRICING)

    def test_does_not_use_previous_price_over_a_week_old(self):
        chatbot_usage._last_pricing[MODEL_ID] = self.previous_pricing(8 * DAY)
        with mock.patch.object(
            chatbot_usage.httpx, "get", side_effect=OSError("offline")
        ):
            self.assertIsNone(chatbot_usage.get_model_pricing())

    def test_refreshes_price_older_than_a_day(self):
        chatbot_usage._last_pricing[MODEL_ID] = self.previous_pricing(2 * DAY)
        with mock.patch.object(
            chatbot_usage.httpx, "get",
            return_value=pricing_response(PORTKEY_PAYLOAD),
        ):
            pricing = chatbot_usage.get_model_pricing()

        self.assertAlmostEqual(pricing.input, 2.5e-6)

    def test_uses_price_shared_by_another_worker(self):
        self.cache.set(
            chatbot_usage._pricing_cache_key(MODEL_ID), self.previous_pricing(60)
        )
        with mock.patch.object(chatbot_usage.httpx, "get") as get:
            pricing = chatbot_usage.get_model_pricing()

        get.assert_not_called()
        self.assertEqual(pricing, PRICING)

    def test_ignores_previous_price_for_another_model(self):
        chatbot_usage._last_pricing["openai/other-model"] = dataclasses.replace(
            self.previous_pricing(60), model="openai/other-model"
        )
        with mock.patch.object(
            chatbot_usage.httpx, "get", side_effect=OSError("offline")
        ):
            self.assertIsNone(chatbot_usage.get_model_pricing())

    def test_returns_none_when_model_has_no_pricing(self):
        with mock.patch.object(
            chatbot_usage.httpx, "get", return_value=pricing_response({})
        ):
            self.assertIsNone(chatbot_usage.get_model_pricing())

    @override_settings(CHATBOT_CACHED_INPUT_PRICE_PER_MTOK=0.1)
    def test_partial_env_override_is_applied_to_portkey_pricing(self):
        with mock.patch.object(
            chatbot_usage.httpx, "get",
            return_value=pricing_response(PORTKEY_PAYLOAD),
        ):
            pricing = chatbot_usage.get_model_pricing()

        self.assertAlmostEqual(pricing.input, 2.5e-6)
        self.assertAlmostEqual(pricing.cached_input, 1e-7)


class TokenUsageTestCase(TestCase):
    def test_from_response(self):
        usage = TokenUsage.from_response(SimpleNamespace(
            input_tokens=100,
            output_tokens=10,
            input_tokens_details=SimpleNamespace(cached_tokens=40),
        ))
        self.assertEqual(
            usage,
            TokenUsage(input_tokens=100, output_tokens=10, cached_input_tokens=40),
        )

    def test_from_response_with_missing_fields(self):
        usage = TokenUsage.from_response(SimpleNamespace(input_tokens=None))
        self.assertEqual(usage, TokenUsage())

    def test_cost(self):
        usage = TokenUsage(input_tokens=100, output_tokens=10, cached_input_tokens=40)
        pricing = ModelPricing(input=1.0, output=2.0, cached_input=0.5)
        self.assertEqual(pricing.cost(usage), 60 * 1.0 + 40 * 0.5 + 10 * 2.0)

    def test_cost_uses_input_price_for_cached_tokens_if_unknown(self):
        usage = TokenUsage(input_tokens=100, output_tokens=10, cached_input_tokens=40)
        pricing = ModelPricing(input=1.0, output=2.0)
        self.assertEqual(pricing.cost(usage), 120.0)


class SpendLimitTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        pricing_patch = mock.patch.object(
            chatbot_usage, "get_model_pricing", return_value=PRICING
        )
        self.get_model_pricing = pricing_patch.start()
        self.addCleanup(pricing_patch.stop)

    def test_record_accumulates_for_the_current_month(self):
        ChatbotUsage.record(self.user, 0.25, 100, 10)
        ChatbotUsage.record(self.user, 0.5, 200, 20)

        usage = ChatbotUsage.objects.get(user=self.user)
        self.assertEqual(usage.cost, Decimal("0.75"))
        self.assertEqual(usage.input_tokens, 300)
        self.assertEqual(usage.output_tokens, 30)
        self.assertEqual(usage.requests, 2)
        self.assertEqual(ChatbotUsage.spend_this_month(self.user), Decimal("0.75"))

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=None)
    def test_no_limit_never_blocks(self):
        ChatbotUsage.record(self.user, 1000, 0, 0)
        chatbot_usage.check_spend_limit(self.user)

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=1.0)
    def test_limit_blocks_once_reached(self):
        ChatbotUsage.record(self.user, 0.99, 0, 0)
        chatbot_usage.check_spend_limit(self.user)

        ChatbotUsage.record(self.user, 0.01, 0, 0)
        with self.assertRaises(chatbot_usage.SpendLimitExceeded) as cm:
            chatbot_usage.check_spend_limit(self.user)
        self.assertEqual(cm.exception.reset_date, chatbot_usage.next_reset_date())
        self.assertIn("monthly", str(cm.exception))

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=1.0)
    def test_limit_blocks_when_pricing_unknown(self):
        self.get_model_pricing.return_value = None
        with self.assertRaises(chatbot_usage.PricingUnavailable):
            chatbot_usage.check_spend_limit(self.user)

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=1.0, CHATBOT_SMALL_MODEL="small")
    def test_limit_blocks_when_small_model_pricing_unknown(self):
        self.get_model_pricing.side_effect = lambda model=None: (
            None if model == "small" else PRICING
        )
        with self.assertRaises(chatbot_usage.PricingUnavailable):
            chatbot_usage.check_spend_limit(self.user)

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=None)
    def test_no_limit_does_not_need_pricing(self):
        self.get_model_pricing.return_value = None
        chatbot_usage.check_spend_limit(self.user)

    @override_settings(CHATBOT_MONTHLY_SPEND_LIMIT=1.0)
    def test_previous_months_do_not_count(self):
        ChatbotUsage.objects.create(
            user=self.user, month=datetime.date(2000, 1, 1), cost=Decimal("5")
        )
        chatbot_usage.check_spend_limit(self.user)

    def test_next_reset_date_rolls_over_the_year(self):
        with mock.patch.object(
            ChatbotUsage, "current_month", return_value=datetime.date(2026, 12, 1)
        ):
            self.assertEqual(
                chatbot_usage.next_reset_date(), datetime.date(2027, 1, 1)
            )
