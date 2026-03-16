#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import os
import logging
import uuid

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
- See the user's current page, project, model configuration, \
and parameter values (provided in [CURRENT USER CONTEXT] below)
- See the user's current model definition in Myokit .mmt format
- Answer questions about PKPD concepts, model structure, equations, \
compartments, and parameters
- Help the user choose a model, interpret parameters, or understand \
their current configuration

What you CANNOT do:
- You cannot perform actions in the app (upload data, run simulations, \
change settings, create projects)
- You cannot see simulation results, fitted parameters, or dataset \
contents — only the current model configuration
- Do not suggest you can do these things

When referencing model internals:
- When quoting equations or parameter definitions from the .mmt, \
put them in fenced code blocks so they stand out, for example:
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

BASE_URL = os.getenv(
    "CHATBOT_BASE_URL"
)
MODEL = os.getenv("CHATBOT_MODEL", "gpt-5.2-2025-12-11")

_client = None


def _get_client():
    """Return a cached Portkey client, creating it on first call."""
    global _client
    if _client is None:
        _client = Portkey(
            api_key=os.getenv("PORTKEY_API_KEY"),
            base_url=BASE_URL,
        )
    return _client


class ChatbotConfigError(Exception):
    """Raised when the chatbot is not properly configured."""
    pass


def check_chatbot_config():
    """Raise ChatbotConfigError if required config is missing."""
    if not os.getenv("PORTKEY_API_KEY"):
        raise ChatbotConfigError("PORTKEY_API_KEY is not configured.")


def _format_user_context(context):
    """Format the user context dict into a text block for the system prompt."""
    if not context:
        return ""

    lines = []

    page = context.get("page")
    sub_page = context.get("subPage")
    if page:
        loc = page
        if sub_page:
            loc += f" > {sub_page}"
        lines.append(f"Current page: {loc}")

    project = context.get("project")
    if project:
        lines.append(
            f"Project: {project.get('name', '?')}"
            f" (species: {project.get('species', '?')})"
        )
        desc = project.get("description")
        if desc:
            lines.append(f"  Description: {desc}")

    model = context.get("model")
    if model:
        lines.append(f"Model: {model.get('name', '?')}")
        flags = []
        for flag in [
            "has_saturation", "has_extravascular", "has_effect",
            "has_lag", "has_hill_coefficient",
        ]:
            if model.get(flag):
                flags.append(flag.replace("has_", ""))
        if flags:
            lines.append(f"  Features: {', '.join(flags)}")

        pk_name = model.get("pk_model_name")
        pd_name = model.get("pd_model_name")
        lines.append(f"  PK model: {pk_name or 'not specified'}")
        lines.append(f"  PD model: {pd_name or 'not specified'}")

        mmt = model.get("mmt")
        if mmt:
            lines.append("")
            lines.append("Model definition (Myokit .mmt format):")
            lines.append(f"```\n{mmt.strip()}\n```")

    variables = context.get("variables")
    if variables:
        lines.append("Parameters:")
        for v in variables:
            if not v.get("constant", True):
                continue
            unit = v.get("unit") or ""
            lines.append(
                f"  {v.get('name', '?')} = {v.get('value', '?')} {unit}"
                .rstrip()
            )

    return "\n".join(lines)


def _build_system_prompt(context=None):
    """Assemble the full system prompt with user context."""
    parts = [SYSTEM_PROMPT]

    user_ctx = _format_user_context(context)
    if user_ctx:
        parts.append(f"\n\n[CURRENT USER CONTEXT]\n{user_ctx}")

    return "\n".join(parts)


def _sse(data):
    """Format a single SSE event line."""
    if isinstance(data, str):
        return f"data: {data}\n\n"
    return f"data: {json.dumps(data)}\n\n"


def stream_chat_response(messages, context=None):
    """Yield SSE events following the Vercel AI SDK data stream protocol."""
    full_messages = [
        {"role": "system", "content": _build_system_prompt(context)},
        *messages,
    ]

    message_id = str(uuid.uuid4())

    try:
        client = _get_client()

        yield _sse({"type": "start", "messageId": message_id})
        yield _sse({"type": "start-step"})

        stream = client.chat.completions.create(
            model=MODEL,
            messages=full_messages,
            stream=True,
        )

        text_id = str(uuid.uuid4())
        text_started = False

        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta.content:
                if not text_started:
                    yield _sse({"type": "text-start", "id": text_id})
                    text_started = True
                yield _sse({
                    "type": "text-delta", "id": text_id,
                    "delta": delta.content,
                })

        if text_started:
            yield _sse({"type": "text-end", "id": text_id})

        yield _sse({"type": "finish-step"})
        yield _sse({"type": "finish"})
        yield _sse("[DONE]")

    except Exception:
        logger.exception("Portkey streaming error")
        yield _sse({
            "type": "error",
            "errorText": "An error occurred. Please try again.",
        })
        yield _sse("[DONE]")
