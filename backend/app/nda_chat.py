import re
from datetime import date

from litellm import completion
from pydantic import BaseModel

from app.models import ChatMessage, NdaFields, PartyFields

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DIGITS_RE = re.compile(r"^\d+$")

_FIELD_LABELS: list[tuple[str, str]] = [
    ("party_a_name", "Party A's legal name"),
    ("party_a_address", "Party A's address"),
    ("party_b_name", "Party B's legal name"),
    ("party_b_address", "Party B's address"),
    ("purpose", "Purpose of disclosure"),
    ("effective_date", "Effective date of the agreement, ISO format YYYY-MM-DD"),
    ("term_years", "Term of the agreement in years, digits only e.g. \"2\""),
    ("governing_state", "Governing state/jurisdiction name, e.g. \"Delaware\" (no \"State of\" prefix)"),
]


class NdaExtractedFields(BaseModel):
    """response_format target. Every field is optional: the model must leave
    a field null unless the user has explicitly stated that value."""

    party_a_name: str | None = None
    party_a_address: str | None = None
    party_b_name: str | None = None
    party_b_address: str | None = None
    effective_date: str | None = None
    purpose: str | None = None
    term_years: str | None = None
    governing_state: str | None = None


class NdaChatLLMResult(BaseModel):
    reply: str
    extracted: NdaExtractedFields


def _known_values(fields: NdaFields) -> dict[str, str]:
    return {
        "party_a_name": fields.party_a.name,
        "party_a_address": fields.party_a.address,
        "party_b_name": fields.party_b.name,
        "party_b_address": fields.party_b.address,
        "purpose": fields.purpose,
        "effective_date": fields.effective_date,
        "term_years": fields.term_years,
        "governing_state": fields.governing_state,
    }


def _build_system_prompt(known: NdaFields, today: date) -> str:
    values = _known_values(known)
    confirmed = [f'{key} ({label}) = "{values[key].strip()}"' for key, label in _FIELD_LABELS if values[key].strip()]
    missing = [f"{key} ({label})" for key, label in _FIELD_LABELS if not values[key].strip()]

    confirmed_block = "\n".join(f"- {line}" for line in confirmed) or "- none yet"
    missing_block = "\n".join(f"- {line}" for line in missing) or "- none, every field is known"

    return f"""You are a friendly legal-intake assistant helping a user fill out a Mutual \
Non-Disclosure Agreement (NDA) through natural conversation. There are exactly 8 fields to \
collect. Today's date is {today.isoformat()}.

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
3. term_years defaults to "2" and is treated as confirmed by default; if it is still showing as \
the default, mention that once so the user can confirm or change it, and update the field only \
if they do.
4. effective_date must be ISO format YYYY-MM-DD if extracted; resolve relative dates \
("next Friday", "in two weeks") only if unambiguous given today's date, otherwise ask the user \
to clarify instead of guessing.
5. term_years must be digits only (e.g. "2"), never words.
6. governing_state must be just the jurisdiction name (e.g. "Delaware"), never prefixed with \
"State of".
7. In `reply`, write a short, natural, conversational message: briefly acknowledge what the \
user just told you (if anything), then ask about exactly one still-needed field. Once every \
field is confirmed, tell the user the NDA is ready to review in the preview panel and can be \
downloaded, and ask if they'd like to change anything instead of asking a further question.
8. `reply` is shown to the user as plain text - never include markdown, JSON, or field names \
in it.
"""


def build_messages(history: list[ChatMessage], known: NdaFields, today: date) -> list[dict[str, str]]:
    system_message = {"role": "system", "content": _build_system_prompt(known, today)}
    return [system_message] + [{"role": m.role, "content": m.content} for m in history]


def get_nda_chat_reply(history: list[ChatMessage], known: NdaFields, *, today: date | None = None) -> NdaChatLLMResult:
    """The testable seam: no FastAPI, no HTTPException - a pure function from
    conversation state to an LLM result. Raises on network/parse failure; the
    route decides how to turn that into an HTTP error."""
    messages = build_messages(history, known, today or date.today())
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=NdaChatLLMResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return NdaChatLLMResult.model_validate_json(response.choices[0].message.content)


def _pick(new: str | None, old: str) -> str:
    return new.strip() if new and new.strip() else old


def _pick_effective_date(new: str | None, old: str) -> str:
    if new and _ISO_DATE_RE.match(new.strip()):
        return new.strip()
    return old


def _pick_term_years(new: str | None, old: str) -> str:
    if new and _DIGITS_RE.match(new.strip()):
        return new.strip()
    return old


def merge_fields(known: NdaFields, extracted: NdaExtractedFields) -> NdaFields:
    """Overlay only non-blank, validly-formatted extracted values onto the
    known fields. A None/blank/malformed extracted value means "not stated
    this turn (or invalid)" - the known value is kept, so a bad completion
    can never silently blank out or corrupt an already-confirmed field."""
    return NdaFields(
        party_a=PartyFields(
            name=_pick(extracted.party_a_name, known.party_a.name),
            address=_pick(extracted.party_a_address, known.party_a.address),
        ),
        party_b=PartyFields(
            name=_pick(extracted.party_b_name, known.party_b.name),
            address=_pick(extracted.party_b_address, known.party_b.address),
        ),
        purpose=_pick(extracted.purpose, known.purpose),
        effective_date=_pick_effective_date(extracted.effective_date, known.effective_date),
        term_years=_pick_term_years(extracted.term_years, known.term_years),
        governing_state=_pick(extracted.governing_state, known.governing_state),
    )
