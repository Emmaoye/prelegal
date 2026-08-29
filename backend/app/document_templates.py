"""Parses the Common Paper markdown templates in templates/ into a structured,
render-ready form: a title, a nested list of clause blocks, and the ordered
list of distinct fill-in-the-blank fields the template references.

Every template is a "Standard Terms" body that assumes a separate Cover
Page/Order Form/Key Terms document (not present in this repo) supplies the
placeholder values referenced via `<span class="..._link">Label</span>` -
so parsing only recovers the template's own placeholders (e.g. "Purpose",
"Customer"), not the parties' actual names. `document_chat.py` adds two
universal party-name fields on top of these so every generated document can
still identify who is signing it.
"""

import html
import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = REPO_ROOT / "templates"
CATALOG_PATH = REPO_ROOT / "catalog.json"

_FIELD_SPAN_CLASSES = {"coverpage_link", "orderform_link", "keyterms_link", "businessterms_link", "sow_link"}

# The letter marker is `[a-z]+\.` (not `[a-z]\.`) because DPA.md's EEA SCCs
# section numbers its sub-items with roman numerals (i., ii., ..., vii.), not
# single letters.
_LINE_RE = re.compile(r"^(?P<indent> *)(?P<marker>\d+\.|[a-z]+\.)\s+(?P<text>.*)$")
_HEADER_SPAN_RE = re.compile(r'^<span class="header_[23]"(?: id="[^"]*")?>(?P<heading>.*?)</span>\s*')
# Only treat a leading `**...**` as a short heading (Mutual-NDA.md's only
# heading convention) when its content has no markup of its own - CSA.md and
# Partnership-Agreement.md's Limitation of Liability clauses are themselves
# wrapped in one `**...**` pair around embedded `<span>` field references, and
# must be tokenized as body text, not swallowed whole as a heading string.
_BOLD_HEADING_RE = re.compile(r"^\*\*(?P<heading>[^*<]+)\*\*\.?\s*")
_POSSESSIVE_RE = re.compile(r"(’s|'s)$")

_TOKEN_RE = re.compile(
    r"(?P<bold>\*\*)"
    r'|<span class="(?P<fcls>' + "|".join(_FIELD_SPAN_CLASSES) + r')"(?: id="[^"]*")?>(?P<flabel>.*?)</span>'
    r'|<span id="[^"]*">(?P<idspan>.*?)</span>'
    r"|\[(?P<linktext>[^\]]+)\]\((?P<linkhref>[^)]+)\)"
)


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")


@dataclass
class TextRun:
    text: str
    bold: bool = False
    type: str = "text"


@dataclass
class LinkRun:
    text: str
    href: str
    bold: bool = False
    type: str = "link"


@dataclass
class FieldRun:
    key: str
    label: str
    possessive: bool = False
    type: str = "field"


Run = TextRun | LinkRun | FieldRun


@dataclass
class Block:
    level: int
    marker: str
    heading: str | None
    runs: list[Run] = field(default_factory=list)


@dataclass
class DocumentField:
    key: str
    label: str


@dataclass
class ParsedTemplate:
    slug: str
    name: str
    description: str
    blocks: list[Block]
    fields: list[DocumentField]


def _tokenize(text: str, initial_bold: bool = False) -> list[Run]:
    runs: list[Run] = []
    bold = initial_bold
    pos = 0
    for m in _TOKEN_RE.finditer(text):
        if m.start() > pos:
            literal = html.unescape(text[pos : m.start()])
            if literal:
                runs.append(TextRun(text=literal, bold=bold))
        if m.group("bold") is not None:
            bold = not bold
        elif m.group("fcls") is not None:
            raw = html.unescape(m.group("flabel"))
            possessive = bool(_POSSESSIVE_RE.search(raw))
            base = _POSSESSIVE_RE.sub("", raw).strip()
            runs.append(FieldRun(key=_slugify(base), label=base, possessive=possessive))
        elif m.group("idspan") is not None:
            # id-only spans are just anchors (e.g. `<span id="11.3">**"Term"**</span>`
            # or `<span id="8.1.a">Except</span>`) - their content can itself contain
            # markdown (bold defined terms, nested field spans), so it must be
            # tokenized recursively rather than unwrapped as opaque plain text.
            runs.extend(_tokenize(m.group("idspan"), initial_bold=bold))
        elif m.group("linktext") is not None:
            runs.append(LinkRun(text=html.unescape(m.group("linktext")), href=m.group("linkhref"), bold=bold))
        pos = m.end()
    tail = html.unescape(text[pos:])
    if tail:
        runs.append(TextRun(text=tail, bold=bold))
    return runs


def _parse_block(indent: str, marker: str, text: str) -> Block:
    level = len(indent) // 4
    heading: str | None = None

    header_match = _HEADER_SPAN_RE.match(text)
    if header_match:
        heading = html.unescape(header_match.group("heading")).rstrip(".").strip()
        text = text[header_match.end() :]
    else:
        bold_match = _BOLD_HEADING_RE.match(text)
        if bold_match:
            heading = html.unescape(bold_match.group("heading")).strip()
            text = text[bold_match.end() :]

    return Block(level=level, marker=marker, heading=heading, runs=_tokenize(text))


def _parse_markdown(raw: str) -> list[Block]:
    blocks: list[Block] = []

    for line in raw.splitlines():
        stripped = line.rstrip()
        match = _LINE_RE.match(stripped)
        if not match:
            continue
        blocks.append(_parse_block(match.group("indent"), match.group("marker"), match.group("text")))

    return blocks


def _collect_fields(blocks: list[Block]) -> list[DocumentField]:
    seen: dict[str, DocumentField] = {}
    for block in blocks:
        for run in block.runs:
            if isinstance(run, FieldRun) and run.key not in seen:
                seen[run.key] = DocumentField(key=run.key, label=run.label)
    return list(seen.values())


@lru_cache
def load_catalog() -> list[dict[str, str]]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def _parse_template(entry: dict[str, str]) -> ParsedTemplate:
    raw = (TEMPLATES_DIR / entry["filename"]).read_text(encoding="utf-8")
    blocks = _parse_markdown(raw)
    fields = _collect_fields(blocks)
    slug = _slugify(Path(entry["filename"]).stem)
    return ParsedTemplate(
        slug=slug,
        name=entry["name"],
        description=entry["description"],
        blocks=blocks,
        fields=fields,
    )


@lru_cache
def load_templates() -> dict[str, ParsedTemplate]:
    return {t.slug: t for t in (_parse_template(entry) for entry in load_catalog())}


def get_template(slug: str) -> ParsedTemplate | None:
    return load_templates().get(slug)
