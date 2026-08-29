from litellm import completion
from pydantic import BaseModel, create_model

from app.document_templates import (
    DocumentField,
    FieldRun,
    LinkRun,
    ParsedTemplate,
    TextRun,
    get_template,
    load_templates,
)
from app.models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    DocumentBlockOut,
    FieldRunOut,
    LinkRunOut,
    RenderedDocumentOut,
    TextRunOut,
)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# Every template assumes a separate Cover Page names the parties - the
# Standard Terms body itself never does. These two fields are asked for on
# every document type, on top of whatever fields that document's own
# template contributes, so the rendered document can still say who it's
# between and carry a signature block.
PARTY_A_FIELD = DocumentField(key="party_a_name", label="Your organization's name")
PARTY_B_FIELD = DocumentField(key="party_b_name", label="The other party's name")


class ClassificationResult(BaseModel):
    reply: str
    document_type: str | None = None


class FieldExtractionResult(BaseModel):
    reply: str
    extracted: dict[str, str | None]


def _catalog_listing() -> str:
    templates = load_templates()
    return "\n".join(f'- slug "{t.slug}": {t.name} - {t.description}' for t in templates.values())


def _build_classification_messages(history: list[ChatMessage]) -> list[dict[str, str]]:
    system_content = f"""You are a friendly legal-intake assistant for a tool that drafts legal \
agreements from a fixed set of templates. Figure out which of the following document types the \
user wants, from their messages so far:

{_catalog_listing()}

Rules:
1. If the user's request clearly matches one of the document types above (even if they used \
different words than the name), set `document_type` to its exact slug.
2. If the user's request does not match any of the document types above, leave `document_type` \
null. In `reply`, briefly explain we can't generate that, then suggest whichever listed document \
type is the closest fit and ask if they'd like to proceed with that one instead.
3. If the user's request is too vague to tell yet (e.g. they haven't said what they need), leave \
`document_type` null and ask a clarifying question about what they're trying to accomplish.
4. `reply` is shown to the user as plain text - never include markdown, JSON, or slugs in it. \
Never mention the word "slug".
5. `reply` must always end by asking the user a question, unless `document_type` is set, in \
which case briefly confirm what you'll help them create instead of asking a question.
"""
    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    return messages


def classify_document_type(history: list[ChatMessage]) -> ClassificationResult:
    response = completion(
        model=MODEL,
        messages=_build_classification_messages(history),
        response_format=ClassificationResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = ClassificationResult.model_validate_json(response.choices[0].message.content)
    if result.document_type is not None and result.document_type not in load_templates():
        result.document_type = None
    if result.document_type is None and "?" not in result.reply:
        result.reply = f"{result.reply.rstrip()} What kind of document are you looking to create?"
    return result


def _all_fields(template: ParsedTemplate) -> list[DocumentField]:
    return [PARTY_A_FIELD, PARTY_B_FIELD, *template.fields]


def _extraction_result_model(template: ParsedTemplate) -> type[BaseModel]:
    field_definitions: dict[str, tuple[type, None]] = {f.key: (str | None, None) for f in _all_fields(template)}
    extracted_model = create_model(f"{template.slug}_extracted_fields", **field_definitions)  # type: ignore[call-overload]
    return create_model(
        f"{template.slug}_chat_result",
        reply=(str, ...),
        extracted=(extracted_model, ...),
    )


def _build_extraction_messages(
    template: ParsedTemplate, history: list[ChatMessage], known: dict[str, str]
) -> list[dict[str, str]]:
    fields = _all_fields(template)
    confirmed = [f'{f.key} ({f.label}) = "{known[f.key].strip()}"' for f in fields if known.get(f.key, "").strip()]
    missing = [f"{f.key} ({f.label})" for f in fields if not known.get(f.key, "").strip()]

    confirmed_block = "\n".join(f"- {line}" for line in confirmed) or "- none yet"
    missing_block = "\n".join(f"- {line}" for line in missing) or "- none, every field is known"

    system_content = f"""You are a friendly legal-intake assistant helping a user fill out a \
{template.name} through natural conversation. There are exactly {len(fields)} fields to collect.

Already confirmed (do not ask about these again unless the user is explicitly changing one):
{confirmed_block}

Still needed:
{missing_block}

Rules:
1. Only set a field in `extracted` if the user has explicitly stated it, directly or \
unambiguously, somewhere in this conversation. If a field is still needed and the user has not \
told you its value, leave that field null in `extracted` - never guess, infer a plausible \
default, or invent a value.
2. Do not re-emit a value for a field that is already confirmed above unless the user is \
explicitly correcting it in their latest message; in that case output only the new value.
3. In `reply`, write a short, natural, conversational message: briefly acknowledge what the user \
just told you (if anything), then ask about exactly one still-needed field. If every field is \
confirmed, tell the user the document is ready to review in the preview panel and can be \
downloaded, and ask if they'd like to change anything instead of asking a further question. The \
user may also say they're done early even with fields still missing - if so, confirm the \
document is available to preview/download as-is and don't press further.
4. `reply` is shown to the user as plain text - never include markdown, JSON, or field names in \
it.
"""
    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    return messages


def _missing_labels(template: ParsedTemplate, known: dict[str, str]) -> list[str]:
    return [f.label for f in _all_fields(template) if not known.get(f.key, "").strip()]


def get_field_extraction_reply(slug: str, history: list[ChatMessage], known: dict[str, str]) -> FieldExtractionResult:
    template = get_template(slug)
    if template is None:
        raise ValueError(f"Unknown document type: {slug}")

    result_model = _extraction_result_model(template)
    response = completion(
        model=MODEL,
        messages=_build_extraction_messages(template, history, known),
        response_format=result_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    parsed = result_model.model_validate_json(response.choices[0].message.content)
    result = FieldExtractionResult(reply=parsed.reply, extracted=parsed.extracted.model_dump())

    merged = merge_fields(known, result.extracted)
    missing = _missing_labels(template, merged)
    if missing and "?" not in result.reply:
        result.reply = f"{result.reply.rstrip()} What's the {missing[0].lower()}?"
    return result


def merge_fields(known: dict[str, str], extracted: dict[str, str | None]) -> dict[str, str]:
    """Overlay only non-blank extracted values onto the known fields, so a
    bad completion can never silently blank out or overwrite an
    already-confirmed field with nothing."""
    merged = dict(known)
    for key, value in extracted.items():
        if value and value.strip():
            merged[key] = value.strip()
    return merged


def render_document(slug: str, known: dict[str, str]) -> RenderedDocumentOut:
    template = get_template(slug)
    if template is None:
        raise ValueError(f"Unknown document type: {slug}")

    def render_run(run):
        if isinstance(run, TextRun):
            return TextRunOut(text=run.text, bold=run.bold)
        if isinstance(run, LinkRun):
            return LinkRunOut(text=run.text, href=run.href, bold=run.bold)
        if isinstance(run, FieldRun):
            return FieldRunOut(key=run.key, label=run.label, possessive=run.possessive, value=known.get(run.key, ""))
        raise TypeError(f"Unknown run type: {type(run)!r}")

    parties_block = DocumentBlockOut(
        level=0,
        marker="",
        heading="Parties",
        runs=[
            TextRunOut(text="This Agreement is entered into by and between "),
            FieldRunOut(key=PARTY_A_FIELD.key, label=PARTY_A_FIELD.label, value=known.get(PARTY_A_FIELD.key, "")),
            TextRunOut(text=" and "),
            FieldRunOut(key=PARTY_B_FIELD.key, label=PARTY_B_FIELD.label, value=known.get(PARTY_B_FIELD.key, "")),
            TextRunOut(text="."),
        ],
    )
    body_blocks = [
        DocumentBlockOut(level=b.level, marker=b.marker, heading=b.heading, runs=[render_run(r) for r in b.runs])
        for b in template.blocks
    ]
    return RenderedDocumentOut(slug=template.slug, name=template.name, blocks=[parties_block, *body_blocks])


def get_chat_reply(request: ChatRequest) -> ChatResponse:
    """The testable seam: no FastAPI, no HTTPException - a pure function from
    request state to a response. Raises on network/parse failure; the route
    decides how to turn that into an HTTP error."""
    if request.document_type is None:
        classification = classify_document_type(request.messages)
        if classification.document_type is None:
            return ChatResponse(
                document_type=None,
                document_name=None,
                reply=classification.reply,
                fields=request.known_fields,
                document=None,
            )
        # The document type was just confirmed - run field extraction against
        # the same history immediately so anything the user already
        # mentioned (e.g. "an NDA between Acme and Widget Co") isn't lost.
        slug = classification.document_type
    else:
        slug = request.document_type

    extraction = get_field_extraction_reply(slug, request.messages, request.known_fields)
    fields = merge_fields(request.known_fields, extraction.extracted)
    template = get_template(slug)
    assert template is not None
    return ChatResponse(
        document_type=slug,
        document_name=template.name,
        reply=extraction.reply,
        fields=fields,
        document=render_document(slug, fields),
    )
