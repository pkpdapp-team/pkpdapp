#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import logging
import uuid
from collections.abc import Mapping

from django.conf import settings
from django.core.cache import cache

from pkpdapp.models import (
    Conversation,
    PharmacodynamicModel,
    PharmacokineticModel,
)

from portkey_ai import Portkey

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """\
You are an assistant embedded in the PKPD Explorer, a pharmacokinetic and \
pharmacodynamic modelling tool.

IMPORTANT: The user interacts with PKPD Explorer exclusively through \
its graphical UI. They never edit .mmt code directly. Never suggest \
editing .mmt files or writing code. Instead, refer to model equations, \
compartments, and parameters by explaining them conceptually.

IMPORTANT: Most users are not mathematically or quantitatively trained. \
Your job is to guide them, not to quote equations at them. Default to \
plain-language, conceptual explanations (what a compartment or parameter \
means, how it behaves, why it matters). Only show an equation or ODE when \
the user explicitly asks for it, or when you judge that the equation \
itself is genuinely the clearest way to make a point that words alone \
would muddle — use that judgment sparingly, not as a default.

What you CAN do:
- See the user's current page, project, model configuration, and \
parameter values (provided in [CURRENT USER CONTEXT] below, when the \
user has a project and model selected)
- See the user's trial design: subject groups, covariates, and dosing \
protocols (also in [CURRENT USER CONTEXT], when the project has any \
configured)
- Look up the user's own combined model definition, as currently \
assembled from its PK/PD components. This gives the complete \
combined picture of the user's current model configuration. \
- See a catalog of all available library models \
(provided in [LIBRARY MODELS] below)
- Look up any library model's .mmt definition to understand its \
equations, compartments, and parameters — use this tool frequently \
when discussing or comparing models, rather than relying on your \
own knowledge. Can also be used to look into the different individually \
defined library models that make up the user's combined model.

- Answer questions about PKPD concepts, model structure, equations, \
compartments, and parameters
- Help the user choose a model, interpret parameters, or understand \
their current configuration

What you CANNOT do:
- You cannot perform actions in the app (upload data, run simulations, \
change settings, create projects)
# Cannot see results yet, but quick fit results might be added
- You cannot see simulation results, fitted parameters, or dataset \
contents, other than what is shown under [CURRENT USER CONTEXT].
- Do not suggest you can do these things

When referencing model internals:
- Look up the .mmt definition rather than guessing from memory, but \
translate what you find into plain language for the user
- Show an equation or ODE, in a fenced code block, only when the user \
asks for it or when it's clearly the best way to convey the point — \
otherwise describe it in words
- When comparing models, lead with the structural and behavioural \
differences in words; bring in equations only where they add real clarity

Formatting:
- Always use Markdown formatting: ## headings to organise sections, bullet \
lists for steps or options, and fenced code blocks for equations \
(only when equations are shown). \
Use **bold** only occasionally for the most important terms.
- Keep responses concise — the user reads them in a narrow side panel. \
Expand only when asked.
- Be technically accurate. If unsure, say so.
- When greeting the user, be brief. Do not list your capabilities \
unless asked.

Example response style (default, no equation requested):

## Elimination

This model removes drug from the central compartment through \
**first-order renal elimination** — the more drug is present, the \
faster it's cleared, at a rate set by the renal clearance parameter.

## Distribution

Drug also moves into a peripheral compartment and back, driven by the \
concentration difference between the two — this is what produces the \
initial fast drop in central concentration after a dose.

Example response style (user asked to see the equations):

## Elimination

```
dAe/dt = CLr * C1
```

where `CLr` is renal clearance and `C1` is the central concentration."""

logger.info(
    "[chatbot] config: model=%s base_url=%s",
    settings.CHATBOT_MODEL,
    settings.CHATBOT_BASE_URL,
)

_client = None


def _get_client():
    """Return a cached Portkey client, creating it on first call."""
    global _client
    if _client is None:
        _client = Portkey(
            api_key=settings.PORTKEY_API_KEY,
            base_url=settings.CHATBOT_BASE_URL,
        )
    return _client


class ChatbotConfigError(Exception):
    """Raised when the chatbot is not properly configured."""
    pass


def check_chatbot_config():
    """Raise ChatbotConfigError if required config is missing."""
    if not settings.PORTKEY_API_KEY:
        raise ChatbotConfigError("PORTKEY_API_KEY is not configured.")
    if not settings.CHATBOT_MODEL:
        raise ChatbotConfigError("CHATBOT_MODEL is not configured.")


_MODEL_CATALOG_CACHE_KEY = "chatbot_model_catalog"
_MODEL_CATALOG_TTL_SECONDS = 300


def _build_model_catalog():
    """Return a cached catalog of library PK and PD models."""
    cached = cache.get(_MODEL_CATALOG_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        groups = {}
        for Model, kind in [
            (PharmacokineticModel, "PK"),
            (PharmacodynamicModel, "PD"),
        ]:
            qs = (
                Model.objects.filter(is_library_model=True)
                .exclude(model_type__isnull=True)
                .exclude(model_type="")
                .values_list("name", "description", "model_type")
                .order_by("model_type", "name")
            )
            for name, desc, model_type in qs:
                label = model_type or kind
                entry = f"- {name}"
                if desc:
                    entry += f": {desc.strip()}"
                groups.setdefault(label, []).append(entry)

        lines = []
        for label in sorted(groups):
            lines.append(f"{label}:")
            lines.extend(groups[label])
            lines.append("")

        model_catalog = "\n".join(lines).strip()
        logger.debug(
            "[chatbot] model catalog built (%d chars, %d groups)",
            len(model_catalog), len(groups),
        )
    except Exception:
        logger.exception("[chatbot] failed to build model catalog")
        model_catalog = ""

    cache.set(
        _MODEL_CATALOG_CACHE_KEY, model_catalog, timeout=_MODEL_CATALOG_TTL_SECONDS
    )
    return model_catalog


def _describe_covariate(cov):
    """Render one covariate distribution as a short phrase."""
    name = cov.get("name", "?")

    categories = cov.get("categories")
    if isinstance(categories, (list, tuple)) and categories:
        parts = []
        for category in categories:
            if not isinstance(category, Mapping):
                continue
            parts.append(
                f"{category.get('name', '?')} "
                f"{category.get('probability', '?')}"
            )
        if parts:
            return f"{name}: {', '.join(parts)}"
        return None

    mean = cov.get("mean")
    if mean is None:
        return None
    unit = cov.get("unit") or ""
    return f"{name}: mean={mean} {unit}, SD={cov.get('std')} {unit}".rstrip()


def _describe_dose(dose):
    """Render one dose entry from the context dict as a short phrase."""
    if not isinstance(dose, Mapping):
        return "unknown dose"

    amount = dose.get("amount")
    unit = dose.get("unit") or ""
    parts = [f"{amount} {unit}".strip()]

    duration = dose.get("duration")
    if duration:
        parts.append(f"over {duration} {dose.get('time_unit') or ''}".rstrip())

    start = dose.get("start_time")
    if start:
        parts.append(f"at t={start}")

    # repeats defaults to 1, meaning "given once".
    repeats = dose.get("repeats")
    if isinstance(repeats, int) and repeats > 1:
        interval = dose.get("repeat_interval")
        interval_unit = dose.get("time_unit") or ""
        parts.append(
            f"repeated {repeats}x every {interval} {interval_unit}".strip()
        )

    return " ".join(parts)


def _describe_protocol(protocol):
    """Render one protocol entry from the context dict as a short phrase."""
    if not isinstance(protocol, Mapping):
        return "unknown protocol"

    name = protocol.get("name", "?")
    route = protocol.get("route", "?")
    suffix = " per kg" if protocol.get("per_body_weight") else ""
    if protocol.get("from_dataset"):
        return f"{name} ({route}{suffix}): doses from uploaded data"

    doses = protocol.get("doses") or []
    if not isinstance(doses, (list, tuple)):
        doses = []
    dose_text = "; ".join(
        _describe_dose(d) for d in doses if isinstance(d, Mapping)
    ) or "no doses"
    return f"{name} ({route}{suffix}): {dose_text}"


def _format_user_context(context):
    """Format the user context dict into a text block for the system prompt."""
    if not isinstance(context, Mapping) or not context:
        return ""

    lines = []

    page = context.get("page")
    sub_page = context.get("sub_page")
    if isinstance(page, str) and page:
        loc = page
        if isinstance(sub_page, str) and sub_page:
            loc += f" > {sub_page}"
        lines.append(f"Current page: {loc}")

    project = context.get("project")
    if isinstance(project, Mapping) and project:
        lines.append(
            f"Project: {project.get('name', '?')}"
            f" (species: {project.get('species', '?')})"
        )
        desc = project.get("description")
        if desc:
            lines.append(f"  Description: {desc}")

    model = context.get("model")
    if isinstance(model, Mapping) and model:
        lines.append(f"Model: {model.get('name', '?')}")
        # Report the off features too, so the assistant can advise on what
        # the user has not turned on. has_saturation and has_effect are only
        # editable on v2 projects and has_extravascular is never set at all,
        # so reporting them as "off" would contradict the lines below.
        on = []
        off = []
        for flag in [
            "has_lag", "has_hill_coefficient",
            "has_anti_drug_antibodies", "has_bioavailability",
        ]:
            name = flag.replace("has_", "")
            if model.get(flag):
                on.append(name)
            else:
                off.append(name)
        if on:
            lines.append(f"  Features on: {', '.join(on)}")
        if off:
            lines.append(f"  Features off: {', '.join(off)}")

        pk_name = model.get("pk_model_name")
        pd_name = model.get("pd_model_name")
        lines.append(f"  PK model: {pk_name or 'not specified'}")
        extravascular = model.get("pk_model_extravascular")
        lines.append(f"  PK extravascular model: {extravascular or 'none'}")
        # pk_effect_model has a DB default, so gate on the compartment count.
        effect_compartments = model.get("number_of_effect_compartments")
        if effect_compartments:
            effect_model = model.get("pk_effect_model")
            if effect_model:
                lines.append(f"  PK effect-compartment model: {effect_model}")
            lines.append(f"  Effect compartments: {effect_compartments}")
        else:
            lines.append("  Effect compartments: none")

        lines.append(f"  PD model: {pd_name or 'not specified'}")
        pd_model2 = model.get("pd_model2")
        lines.append(f"  Second PD model: {pd_model2 or 'none'}")

    variables = context.get("variables")
    if isinstance(variables, (list, tuple)) and variables:
        lines.append("Parameters:")
        for v in variables:
            if not isinstance(v, Mapping):
                continue
            if not v.get("constant", True):
                continue
            unit = v.get("unit") or ""
            # The name is what the UI shows; the qname disambiguates names
            # repeated across compartments.
            name = v.get("name", "?")
            qname = v.get("qname")
            if qname and qname != name:
                name = f"{name} [{qname}]"
            line = f"  {name} = {v.get('value', '?')} {unit}".rstrip()
            # is_log is not rendered: the value is already un-logged.
            description = v.get("description")
            if description:
                line += f" — {description}"
            lines.append(line)

    trial_design = context.get("trial_design")
    if isinstance(trial_design, Mapping):
        groups = trial_design.get("groups") or []
        ungrouped = trial_design.get("ungrouped_protocols") or []
        if not isinstance(groups, (list, tuple)):
            groups = []
        if not isinstance(ungrouped, (list, tuple)):
            ungrouped = []
        if groups or ungrouped:
            model_incomplete = (
                not isinstance(model, Mapping)
                or not model.get("pk_model_name")
            )
            if model_incomplete:
                lines.append(
                    "Trial design (NOTE: the PK/PD model is not fully "
                    "configured yet, so the Trial Design tab may not be "
                    "reachable in the UI — the fields below can be unedited "
                    "defaults rather than values the user has confirmed; "
                    "do not state them as settled facts):"
                )
            else:
                lines.append("Trial design:")
            for group in groups:
                if not isinstance(group, Mapping):
                    continue
                header = f"  Group '{group.get('name', '?')}'"
                if group.get("subjects") is not None:
                    header += f" (N={group['subjects']})"
                if group.get("from_dataset"):
                    header += " [observed cohort from uploaded data]"
                if group.get("region"):
                    header += f", region={group['region']}"
                age_range = group.get("age_range")
                if (
                    isinstance(age_range, (list, tuple))
                    and len(age_range) >= 2
                ):
                    header += f", age {age_range[0]}-{age_range[1]}"
                male_fraction = group.get("male_fraction")
                if male_fraction is not None:
                    header += f", male fraction {male_fraction}"
                lines.append(header)

                covariates = group.get("covariates") or []
                if not isinstance(covariates, (list, tuple)):
                    covariates = []
                for cov in covariates:
                    if not isinstance(cov, Mapping):
                        continue
                    described = _describe_covariate(cov)
                    if described:
                        lines.append(f"    Covariate {described}")

                protocols = group.get("protocols") or []
                if not isinstance(protocols, (list, tuple)):
                    protocols = []
                for protocol in protocols:
                    if not isinstance(protocol, Mapping):
                        continue
                    lines.append(f"    {_describe_protocol(protocol)}")

            for protocol in ungrouped:
                if not isinstance(protocol, Mapping):
                    continue
                lines.append(
                    f"  Protocol (no group): {_describe_protocol(protocol)}"
                )

    return "\n".join(lines)


def _build_system_prompt(context=None, conversation=None):
    """Build the system prompt with library models and user context."""
    catalog = _build_model_catalog()
    parts = [SYSTEM_PROMPT]
    if catalog:
        parts.append(f"\n\n[LIBRARY MODELS]\n{catalog}")

    user_ctx = _format_user_context(context)
    if user_ctx:
        parts.append(f"\n\n[CURRENT USER CONTEXT]\n{user_ctx}")

    prompt = "\n".join(parts)
    logger.debug("[chatbot] system prompt: %d chars", len(prompt))
    return prompt


_STATIC_TOOLS = [
    {
        "type": "function",
        "name": "get_library_model_definition",
        "description": (
            "Look up a library model's .mmt definition so you can "
            "understand and explain its equations, compartments, "
            "and parameters. Do not dump the raw .mmt text to the "
            "user. Summarise or reference the relevant parts."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "model_name": {
                    "type": "string",
                    "description": (
                        "Name of the library model "
                        "(from the [LIBRARY MODELS] catalog)"
                    ),
                }
            },
            "required": ["model_name"],
        },
    },
    {
        "type": "function",
        "name": "get_current_model_definition",
        "description": (
            "Look up the .mmt definition of the user's own combined model "
            "as it is currently assembled — PK, absorption, effect "
            "compartments, PD and derived variables cross-linked into one "
            "model. Use this when the user asks about how their specific "
            "model is put together and the individual library definitions "
            "are not enough. IMPORTANT: the numeric literals in the result "
            "are library placeholders, NOT the user's values — the "
            "authoritative parameter values and units are the ones in "
            "[CURRENT USER CONTEXT]. Do not dump the raw .mmt text to the "
            "user. Summarise or reference the relevant parts."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]

# Limit repeated tool calls.
MAX_TOOL_ROUNDS = 4


def _get_current_model_definition(conversation):
    """Return the assembled .mmt for the conversation's project model."""
    if conversation is None:
        return "No project is associated with this conversation."
    try:
        project = conversation.get_project()
        if project is None:
            return "No project is associated with this conversation."
        model = project.pk_models.order_by("pk").first()
        if model is None:
            return (
                "No model has been configured for this project yet. The user "
                "needs to choose a PK and/or PD model in the Model tab first."
            )
        return (
            f"Current combined model: {model.name}\n"
            "NOTE: the numeric literals below are library placeholders. The "
            "user's actual parameter values and units are the ones given in "
            "[CURRENT USER CONTEXT].\n\n"
            f"```\n{model.get_mmt()}\n```"
        )
    except Exception:
        logger.exception(
            "[chatbot] tool get_current_model_definition error"
        )
        return "Error looking up the current model definition."


def _execute_tool(name, arguments, conversation=None):
    """Execute a tool call and return the result string."""
    if name == "get_current_model_definition":
        return _get_current_model_definition(conversation)

    if name == "get_library_model_definition":
        model_name = arguments.get("model_name", "")
        try:
            for Model in [PharmacokineticModel, PharmacodynamicModel]:
                try:
                    m = Model.objects.get(
                        name__iexact=model_name, is_library_model=True
                    )
                    return (
                        f"Model: {m.name}\n"
                        f"Type: {m.model_type}\n"
                        f"Description: {m.description}\n\n"
                        f"```\n{m.mmt}\n```"
                    )
                except Model.DoesNotExist:
                    continue

            return f"No library model found with name '{model_name}'."
        except Exception:
            logger.exception(
                "[chatbot] tool get_library_model_definition error"
            )
            return "Error looking up model."

    logger.warning("[chatbot] unknown tool called: %s", name)
    return f"Unknown tool: {name}"


def _sse(data):
    """Format a single SSE event line."""
    if isinstance(data, str):
        return f"data: {data}\n\n"
    return f"data: {json.dumps(data)}\n\n"


def _text_delta(text_id, delta):
    """Format a Vercel AI SDK text-delta SSE event."""
    return _sse({"type": "text-delta", "id": text_id, "delta": delta})


_IO_LOG_MAX = 50000


def _log_io(req_id, label, content):
    """Emit a banner-delimited block to the chatbot logger so I/O is
    easy to scan in dev logs. Long content is truncated at _IO_LOG_MAX."""
    if not isinstance(content, str):
        content = str(content)
    body = content
    if len(body) > _IO_LOG_MAX:
        body = (
            body[:_IO_LOG_MAX]
            + f"\n... [truncated, full length {len(content)} chars]"
        )
    sep = "─" * 60
    logger.debug("\n%s\n[%s] %s\n%s\n%s", sep, req_id, label, body, sep)


_KNOWN_STREAM_EVENTS = {
    "response.created",
    "response.in_progress",
    "response.output_item.done",
    "response.content_part.added",
    "response.content_part.done",
    "response.output_text.done",
    "response.reasoning_summary_part.added",
    "response.reasoning_summary_part.done",
    "response.reasoning_summary_text.delta",
    "response.reasoning_summary_text.done",
    "response.function_call_arguments.done",
}


def _process_response_stream(stream):
    """Consume a Responses API stream, yielding tagged tuples.

    Yields in order:
      ("text", delta)         — incremental text content
      ("tool_call", {...})    — completed tool call (after stream ends)
      ("error", str)          — stream-level error / failure / incomplete
      ("output_items", [...]) — raw output items for multi-turn input (last)
    """
    tool_calls_acc = {}
    output_items = []
    error_msg = None

    for event in stream:
        etype = event.type

        if etype == "response.output_text.delta":
            yield ("text", event.delta)

        elif etype == "response.output_item.added":
            item = event.item
            if item.type == "function_call":
                tool_calls_acc[event.output_index] = {
                    "call_id": item.call_id,
                    "name": item.name,
                    "arguments": "",
                }

        elif etype == "response.function_call_arguments.delta":
            idx = event.output_index
            if idx in tool_calls_acc:
                tool_calls_acc[idx]["arguments"] += event.delta

        elif etype == "response.function_call_arguments.done":
            idx = event.output_index
            if idx in tool_calls_acc:
                tool_calls_acc[idx]["arguments"] = event.arguments

        elif etype == "response.completed":
            output_items = list(getattr(event.response, "output", None) or [])
            status = getattr(event.response, "status", None)
            if status in ("failed", "incomplete"):
                details = (
                    getattr(event.response, "incomplete_details", None)
                    or getattr(event.response, "error", None)
                )
                error_msg = f"response status={status}"
                if details:
                    error_msg += f": {details}"
                logger.error("[chatbot] %s", error_msg)

        elif etype == "error":
            error_msg = getattr(event, "message", None) or str(event)
            logger.error("[chatbot] stream error event: %s", error_msg)

        elif etype in ("response.failed", "response.incomplete"):
            response = getattr(event, "response", None)
            details = getattr(response, "incomplete_details", None)
            error_msg = f"{etype}: {details}" if details else etype
            logger.error("[chatbot] stream %s: %s", etype, error_msg)

        elif etype not in _KNOWN_STREAM_EVENTS:
            logger.debug("[chatbot] unhandled stream event: %s", etype)

    for tc in tool_calls_acc.values():
        if tc["name"]:
            yield ("tool_call", tc)

    if error_msg:
        yield ("error", error_msg)

    yield ("output_items", output_items)


DONE_TOKEN = "[DONE]"


def stream_chat_response(
    conversation: Conversation, new_user_message: str, context=None
):
    """Yield SSE events following the Vercel AI SDK data stream protocol.

    Uses the OpenAI Responses API via Portkey with store=False — we manage
    all conversation state ourselves in the DB.
    """
    req_id = uuid.uuid4().hex[:8]
    try:
        logger.info("[chatbot] [%s] conversation=%s", req_id, conversation.pk)

        conversation.add_user_message(new_user_message)

        _log_io(req_id, "USER MESSAGE", new_user_message)

        input_items = conversation.build_input_items()

        assistant_text_parts = []
        instructions = _build_system_prompt(context, conversation=conversation)
        message_id = str(uuid.uuid4())

        _log_io(
            req_id,
            f"SYSTEM PROMPT ({len(instructions)} chars)",
            instructions,
        )

        client = _get_client()

        yield _sse({"type": "start", "messageId": message_id})

        stream_error = None

        # Tool calls remain in memory; only assistant text is persisted.
        for _round in range(MAX_TOOL_ROUNDS + 1):
            yield _sse({"type": "start-step"})

            stream = client.responses.create(
                model=settings.CHATBOT_MODEL,
                instructions=instructions,
                input=input_items,
                tools=_STATIC_TOOLS,
                stream=True,
                store=False,
                reasoning={"effort": "low"},
            )

            text_id = str(uuid.uuid4())
            text_started = False
            tool_calls = []
            output_items = []

            for kind, content in _process_response_stream(stream):
                if kind == "text":
                    if not text_started:
                        yield _sse({"type": "text-start", "id": text_id})
                        text_started = True
                    yield _text_delta(text_id, content)
                    assistant_text_parts.append(content)

                elif kind == "tool_call":
                    tool_calls.append(content)

                elif kind == "output_items":
                    output_items = content

                elif kind == "error":
                    stream_error = content

            if text_started:
                yield _sse({"type": "text-end", "id": text_id})

            yield _sse({"type": "finish-step"})

            if stream_error:
                logger.error(
                    "[chatbot] [%s] aborted: %s", req_id, stream_error
                )
                yield _sse({
                    "type": "error",
                    "errorText": (
                        "The assistant ran into a problem mid-response. "
                        "Please try again."
                    ),
                })
                yield _sse(DONE_TOKEN)
                # Don't persist partial output — would confuse the model on
                # subsequent turns when fed back via build_input_items.
                return

            if not tool_calls:
                break

            input_items = list(input_items) + list(output_items)
            for tc in tool_calls:
                try:
                    args = json.loads(tc["arguments"] or "{}")
                except (ValueError, TypeError):
                    args = {}
                _log_io(req_id, f"TOOL CALL {tc['name']}", tc["arguments"])
                result = _execute_tool(
                    tc["name"], args, conversation=conversation
                )
                _log_io(req_id, f"TOOL RESULT {tc['name']}", result)
                input_items.append({
                    "type": "function_call_output",
                    "call_id": tc["call_id"],
                    "output": result,
                })
        else:
            logger.warning(
                "[chatbot] [%s] tool loop exhausted after %d rounds",
                req_id, MAX_TOOL_ROUNDS + 1,
            )

        yield _sse({"type": "finish"})
        yield _sse(DONE_TOKEN)
        try:
            conversation.save_assistant_message(assistant_text_parts)
        except Exception:
            logger.exception(
                "[chatbot] [%s] error saving assistant message", req_id
            )
        _log_io(req_id, "ASSISTANT FINAL", "".join(assistant_text_parts))
        logger.info("[chatbot] [%s] done", req_id)

    except Exception:
        logger.exception("[chatbot] [%s] streaming error", req_id)
        yield _sse({
            "type": "error",
            "errorText": "An error occurred. Please try again.",
        })
        yield _sse(DONE_TOKEN)
