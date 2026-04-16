#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import os
import logging
import time
import uuid
from collections import defaultdict

from portkey_ai import Portkey

logger = logging.getLogger(__name__)

_model_catalog = None


def _build_model_catalog():
    """Query library PK and PD models and return a compact text catalog.

    Cached after first call — library models are static for the lifetime
    of the server process.
    """
    global _model_catalog
    if _model_catalog is not None:
        return _model_catalog

    try:
        from pkpdapp.models.pharmacokinetic_model import PharmacokineticModel
        from pkpdapp.models.pharmacodynamic_model import PharmacodynamicModel

        groups = defaultdict(list)

        for Model, kind in [
            (PharmacokineticModel, "PK"),
            (PharmacodynamicModel, "PD"),
        ]:
            for m in (
                Model.objects.filter(is_library_model=True)
                .exclude(model_type__isnull=True)
                .exclude(model_type="")
                .values_list("name", "description", "model_type")
                .order_by("model_type", "name")
            ):
                name, desc, model_type = m
                label = model_type or kind
                entry = f"- {name}"
                if desc and desc != name:
                    entry += f": {desc}"
                groups[label].append(entry)

        lines = []
        for label, entries in sorted(groups.items()):
            lines.append(f"### {label}")
            lines.extend(entries)
            lines.append("")

        _model_catalog = "\n".join(lines).strip()
    except Exception:
        logger.exception("Failed to build model catalog")
        _model_catalog = ""

    return _model_catalog


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
- See a catalog of all available library models \
(provided in [LIBRARY MODELS] below)
- Look up any library model's .mmt definition to understand its \
equations, compartments, and parameters — use this tool frequently \
when discussing or comparing models, rather than relying on your \
own knowledge
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
- Look up the .mmt definition rather than guessing from memory
- When quoting equations or parameter definitions from the .mmt, \
put them in fenced code blocks so they stand out, for example:
```
dAe/dt = CLr * C_central
```
- Use these code blocks for any equation, ODE, or parameter definition \
you reference. Do not write equations inline in the middle of a paragraph
- When comparing models, look up both and show the relevant equations \
from each in separate code blocks

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
MODEL = os.getenv("CHATBOT_MODEL", "gpt-5-nano-2025-08-07")

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
    """Assemble the full system prompt with catalog and user context."""
    catalog = _build_model_catalog()
    parts = [SYSTEM_PROMPT]
    if catalog:
        parts.append(f"\n\n[LIBRARY MODELS]\n{catalog}")

    user_ctx = _format_user_context(context)
    if user_ctx:
        parts.append(f"\n\n[CURRENT USER CONTEXT]\n{user_ctx}")

    return "\n".join(parts)


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_library_model_definition",
            "description": (
                "Look up a library model's .mmt definition so you can \
                understand and explain its equations, compartments, \
                and parameters. Do not dump the raw .mmt text to the \
                user. Summarise or reference the relevant parts."
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
    }
]

MAX_TOOL_ROUNDS = 3


def _execute_tool(name, arguments):
    """Execute a tool call and return the result string."""
    if name == "get_library_model_definition":
        model_name = arguments.get("model_name", "")
        try:
            from pkpdapp.models.pharmacokinetic_model import (
                PharmacokineticModel,
            )
            from pkpdapp.models.pharmacodynamic_model import (
                PharmacodynamicModel,
            )

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
            logger.exception("Tool execution error")
            return "Error looking up model."

    return f"Unknown tool: {name}"


def _sse(data):
    """Format a single SSE event line."""
    if isinstance(data, str):
        return f"data: {data}\n\n"
    return f"data: {json.dumps(data)}\n\n"


def _collect_tool_calls(stream):
    """Consume an LLM stream, yielding (delta_content, None) for text
    and returning accumulated tool calls at the end.

    Returns a tuple (tool_calls_list, has_content).
    Caller must iterate the generator fully before reading the return value.
    """
    tool_calls_acc = {}
    has_content = False

    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta

        # Accumulate tool call fragments
        if delta.tool_calls:
            for tc in delta.tool_calls:
                idx = tc.index
                if idx not in tool_calls_acc:
                    tool_calls_acc[idx] = {
                        "id": tc.id or "",
                        "name": "",
                        "arguments": "",
                    }
                if tc.id:
                    tool_calls_acc[idx]["id"] = tc.id
                if tc.function:
                    if tc.function.name:
                        tool_calls_acc[idx]["name"] = tc.function.name
                    if tc.function.arguments:
                        tool_calls_acc[idx]["arguments"] += (
                            tc.function.arguments
                        )

        if delta.content:
            has_content = True
            yield delta.content

    _collect_tool_calls._tool_calls = (
        list(tool_calls_acc.values()) if tool_calls_acc and not has_content
        else []
    )


def stream_chat_response(messages, context=None):
    """Yield SSE events following the Vercel AI SDK data stream protocol.

    Handles tool-call loops: if the LLM requests a tool, execute it,
    emit tool call events, and call the LLM again with the result.
    """
    full_messages = [
        {"role": "system", "content": _build_system_prompt(context)},
        *messages,
    ]

    message_id = str(uuid.uuid4())

    try:
        client = _get_client()

        # Message start
        yield _sse({"type": "start", "messageId": message_id})

        for _round in range(MAX_TOOL_ROUNDS + 1):
            yield _sse({"type": "start-step"})

            stream = client.chat.completions.create(
                model=MODEL,
                messages=full_messages,
                tools=TOOLS,
                stream=True,
            )

            # Stream text content as text-delta events immediately
            text_id = str(uuid.uuid4())
            text_started = False

            for content in _collect_tool_calls(stream):
                if not text_started:
                    yield _sse({"type": "text-start", "id": text_id})
                    text_started = True
                yield _sse({
                    "type": "text-delta", "id": text_id,
                    "delta": content,
                })

            if text_started:
                yield _sse({"type": "text-end", "id": text_id})

            # Check if there were tool calls
            tool_calls = _collect_tool_calls._tool_calls
            if not tool_calls:
                yield _sse({"type": "finish-step"})
                yield _sse({"type": "finish"})
                yield _sse("[DONE]")
                return

            logger.info(
                "Tool round %d: LLM requested %d tool call(s): %s",
                _round + 1,
                len(tool_calls),
                ", ".join(
                    f"{tc['name']}({tc['arguments']})"
                    for tc in tool_calls
                ),
            )

            # Add assistant message with tool calls to conversation
            full_messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": tc["arguments"],
                        },
                    }
                    for tc in tool_calls
                ],
            })

            # Execute each tool and emit structured events
            for tc in tool_calls:
                args = json.loads(tc["arguments"])
                tool_call_id = tc["id"]
                tool_name = tc["name"]

                yield _sse({
                    "type": "tool-input-start",
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "dynamic": True,
                })
                yield _sse({
                    "type": "tool-input-available",
                    "toolCallId": tool_call_id,
                    "toolName": tool_name,
                    "input": args,
                    "dynamic": True,
                })

                result = _execute_tool(tool_name, args)
                logger.info(
                    "Tool %s(%s) returned %d chars:\n%s",
                    tool_name,
                    tc["arguments"],
                    len(result),
                    result[:500],
                )

                time.sleep(1)
                yield _sse({
                    "type": "tool-output-available",
                    "toolCallId": tool_call_id,
                    "output": result,
                })

                full_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result,
                })

            yield _sse({"type": "finish-step"})
            # Loop back to call the LLM again with tool results

        # If we exhausted MAX_TOOL_ROUNDS, finish gracefully
        yield _sse({"type": "finish"})
        yield _sse("[DONE]")

    except Exception:
        logger.exception("Portkey streaming error")
        yield _sse({
            "type": "error",
            "errorText": "An error occurred. Please try again.",
        })
        yield _sse("[DONE]")
