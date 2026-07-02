#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import logging
import uuid

from django.conf import settings

from pkpdapp.models import Conversation, Message as ConvMessage

from portkey_ai import Portkey

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """\
You are an assistant embedded in the PKPD Explorer, a pharmacokinetic and \
pharmacodynamic modelling tool.

IMPORTANT: The user interacts with PKPD Explorer exclusively through \
its graphical UI. They never edit .mmt code directly. Never suggest \
editing .mmt files or writing code. Instead, refer to model equations, \
compartments, and parameters by explaining them conceptually or quoting \
the relevant equations.

What you CAN do:
- Answer questions about PKPD concepts, model structure, equations, \
compartments, and parameters
- Help the user understand pharmacokinetic and pharmacodynamic modelling

What you CANNOT do:
- You cannot perform actions in the app (upload data, run simulations, \
change settings, create projects)
- You cannot see simulation results, fitted parameters, or dataset \
contents
- Do not suggest you can do these things

When referencing model internals:
- When quoting equations or parameter definitions, put them in fenced \
code blocks so they stand out, for example:
```
dAe/dt = CLr * C_central
```
- Use these code blocks for any equation, ODE, or parameter definition \
you reference. Do not write equations inline in the middle of a paragraph

Formatting:
- Always use Markdown formatting: ## headings to organise sections, bullet \
lists for steps or options, and fenced code blocks for equations. \
Use **bold** only occasionally for the most important terms.
- Keep responses concise — the user reads them in a narrow side panel. \
Expand only when asked.
- Be technically accurate. If unsure, say so.
- When greeting the user, be brief. Do not list your capabilities \
unless asked.

Example response style:

## Elimination

This model uses **first-order renal elimination** from the central \
compartment:

```
dAe/dt = CLr * C1
```

where `CLr` is renal clearance and `C1` is the central concentration.

## Distribution

Drug distributes into a peripheral compartment:

```
dA2/dt = Q * (C1 - C2)
```"""

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


def _build_system_prompt(context=None, conversation=None):
    """Assemble the system prompt for a chat turn.

    The signature accepts ``context`` (the user's current app state) and
    ``conversation`` so that later features can enrich the prompt without
    changing call sites. In this base version neither is used yet — the
    prompt is the static :data:`SYSTEM_PROMPT`.
    """
    prompt = SYSTEM_PROMPT
    logger.debug("[chatbot] system prompt: %d chars", len(prompt))
    return prompt


def _sse(data):
    """Format a single SSE event line."""
    if isinstance(data, str):
        return f"data: {data}\n\n"
    return f"data: {json.dumps(data)}\n\n"


def _text_delta(text_id, delta):
    """Format a Vercel AI SDK text-delta SSE event."""
    return _sse({"type": "text-delta", "id": text_id, "delta": delta})


_IO_LOG_MAX = 3000


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
    "response.output_item.added",
    "response.output_item.done",
    "response.content_part.added",
    "response.content_part.done",
    "response.output_text.done",
    "response.reasoning_summary_part.added",
    "response.reasoning_summary_part.done",
    "response.reasoning_summary_text.delta",
    "response.reasoning_summary_text.done",
}


def _process_response_stream(stream):
    """Consume a Responses API stream, yielding tagged tuples.

    Yields in order:
      ("text", delta)         — incremental text content
      ("error", str)          — stream-level error / failure / incomplete
    """
    error_msg = None

    for event in stream:
        etype = event.type

        if etype == "response.output_text.delta":
            yield ("text", event.delta)

        elif etype == "response.completed":
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

    if error_msg:
        yield ("error", error_msg)


def _build_input_items(conversation, max_messages=40):
    """Reconstruct the Responses API input array from DB messages.

    Returns a list suitable for passing to client.responses.create(input=...).
    Only user and assistant messages are replayed.
    """
    db_messages = list(
        conversation.messages.order_by("id")
    )
    if len(db_messages) > max_messages:
        db_messages = db_messages[-max_messages:]

    input_items = []
    for m in db_messages:
        if m.role == "user":
            input_items.append({"role": "user", "content": m.content})
        elif m.role == "assistant":
            input_items.append({"role": "assistant", "content": m.content})
    return input_items


def stream_chat_response(
    conversation: Conversation, new_user_message: str, context=None
):
    """Yield SSE events following the Vercel AI SDK data stream protocol.

    Uses the OpenAI Responses API via Portkey with store=False — we manage
    all conversation state ourselves in the DB.
    """
    req_id = uuid.uuid4().hex[:8]
    logger.info("[chatbot] [%s] conversation=%s", req_id, conversation.pk)

    ConvMessage.objects.create(
        conversation=conversation,
        role="user",
        content=new_user_message,
    )

    _log_io(req_id, "USER MESSAGE", new_user_message)

    input_items = _build_input_items(conversation)

    assistant_text_parts = []
    instructions = _build_system_prompt(context, conversation=conversation)
    message_id = str(uuid.uuid4())

    _log_io(req_id, f"SYSTEM PROMPT ({len(instructions)} chars)", instructions)

    try:
        client = _get_client()

        yield _sse({"type": "start", "messageId": message_id})
        yield _sse({"type": "start-step"})

        stream = client.responses.create(
            model=settings.CHATBOT_MODEL,
            instructions=instructions,
            input=input_items,
            stream=True,
            store=False,
            reasoning={"effort": "low"},
        )

        text_id = str(uuid.uuid4())
        text_started = False
        stream_error = None

        for kind, content in _process_response_stream(stream):
            if kind == "text":
                if not text_started:
                    yield _sse({"type": "text-start", "id": text_id})
                    text_started = True
                yield _text_delta(text_id, content)
                assistant_text_parts.append(content)

            elif kind == "error":
                stream_error = content

        if text_started:
            yield _sse({"type": "text-end", "id": text_id})

        if stream_error:
            logger.error("[chatbot] [%s] aborted: %s", req_id, stream_error)
            yield _sse({"type": "finish-step"})
            yield _sse({
                "type": "error",
                "errorText": (
                    "The assistant ran into a problem mid-response. "
                    "Please try again."
                ),
            })
            yield _sse("[DONE]")
            # Don't persist partial output — would confuse the model on
            # subsequent turns when fed back via _build_input_items.
            return

        yield _sse({"type": "finish-step"})
        yield _sse({"type": "finish"})
        yield _sse("[DONE]")
        try:
            conversation.save_assistant_message(assistant_text_parts)
        except Exception:
            logger.exception("[chatbot] [%s] error saving assistant message", req_id)
        _log_io(req_id, "ASSISTANT FINAL", "".join(assistant_text_parts))
        logger.info("[chatbot] [%s] done", req_id)

    except Exception:
        logger.exception("[chatbot] [%s] streaming error", req_id)
        yield _sse({
            "type": "error",
            "errorText": "An error occurred. Please try again.",
        })
        yield _sse("[DONE]")
