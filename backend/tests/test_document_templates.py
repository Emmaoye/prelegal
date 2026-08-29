from app.document_templates import (
    FieldRun,
    LinkRun,
    TextRun,
    _collect_fields,
    _parse_block,
    _parse_markdown,
    _slugify,
    _tokenize,
    get_template,
    load_catalog,
    load_templates,
)


def test_slugify_normalizes_punctuation_and_case():
    assert _slugify("Mutual-NDA") == "mutual_nda"
    assert _slugify("Governing Law") == "governing_law"


def test_tokenize_plain_text_single_run():
    runs = _tokenize("Hello world")
    assert runs == [TextRun(text="Hello world")]


def test_tokenize_bold_toggle_wraps_enclosed_text():
    runs = _tokenize("before **bold** after")
    assert runs == [
        TextRun(text="before "),
        TextRun(text="bold", bold=True),
        TextRun(text=" after"),
    ]


def test_tokenize_field_span_produces_field_run():
    runs = _tokenize('the <span class="coverpage_link">Purpose</span> of this')
    assert runs == [
        TextRun(text="the "),
        FieldRun(key="purpose", label="Purpose"),
        TextRun(text=" of this"),
    ]


def test_tokenize_field_span_strips_possessive_but_flags_it():
    runs = _tokenize('<span class="coverpage_link">Customer’s</span> account')
    assert runs[0] == FieldRun(key="customer", label="Customer", possessive=True)


def test_tokenize_dedupes_possessive_and_bare_form_to_same_key():
    bare = _tokenize('<span class="coverpage_link">Customer</span>')[0]
    possessive = _tokenize('<span class="coverpage_link">Customer\'s</span>')[0]
    assert bare.key == possessive.key == "customer"


def test_tokenize_id_only_span_is_unwrapped_to_plain_text():
    runs = _tokenize('<span id="5.3.a">if</span> the party breaches')
    assert runs == [TextRun(text="if"), TextRun(text=" the party breaches")]


def test_tokenize_link_produces_link_run():
    runs = _tokenize("see [the standard](https://example.com/terms)")
    assert runs == [
        TextRun(text="see "),
        LinkRun(text="the standard", href="https://example.com/terms"),
    ]


def test_tokenize_field_span_inside_bold_keeps_bold_state():
    runs = _tokenize('**<span id="8.1.a">Except</span> as provided, the <span class="keyterms_link">Cap</span>.**')
    assert runs[0] == TextRun(text="Except", bold=True)
    field_runs = [r for r in runs if isinstance(r, FieldRun)]
    assert field_runs == [FieldRun(key="cap", label="Cap")]


def test_tokenize_id_span_wrapping_bold_defined_term_renders_bold_not_literal_asterisks():
    # Common Paper's Definitions sections wrap a bold defined term in an
    # id-only anchor span, e.g. `<span id="11.3">**"Agreement"**</span>` -
    # the id-span's content must itself be tokenized, not unwrapped verbatim.
    runs = _tokenize('<span id="11.3">**"Agreement"**</span> means this contract.')
    assert runs[0] == TextRun(text='"Agreement"', bold=True)
    assert not any("**" in r.text for r in runs if isinstance(r, TextRun))


def test_parse_block_bold_clause_wrapping_field_spans_is_not_swallowed_as_heading():
    # CSA.md/Partnership-Agreement.md's Limitation of Liability clauses wrap
    # an entire sentence (including embedded field spans) in one `**...**`
    # pair with no preceding header span - _BOLD_HEADING_RE must not treat
    # that whole sentence as a short heading, or the field spans inside it
    # are lost entirely (never collected as fields, never rendered).
    block = _parse_block(
        "        ",
        "a.",
        '**<span id="8.1.a">Except</span> as provided, liability is capped at the '
        '<span class="keyterms_link">General Cap Amount</span>.**',
    )
    assert block.heading is None
    field_runs = [r for r in block.runs if isinstance(r, FieldRun)]
    assert field_runs == [FieldRun(key="general_cap_amount", label="General Cap Amount")]
    assert all(r.bold for r in block.runs if isinstance(r, TextRun))


def test_parse_block_extracts_header_span_heading():
    block = _parse_block("    ", "1.", '<span class="header_3" id="1.1">Access and Use.</span>  During the term.')
    assert block.level == 1
    assert block.heading == "Access and Use"
    assert block.runs == [TextRun(text="During the term.")]


def test_parse_block_extracts_bold_heading_when_no_header_span():
    block = _parse_block("", "1.", "**Introduction**. This Agreement begins now.")
    assert block.heading == "Introduction"
    assert block.runs == [TextRun(text="This Agreement begins now.")]


def test_parse_block_leaves_heading_none_for_plain_subitem():
    block = _parse_block("        ", "a.", "Except as expressly permitted, Customer will not.")
    assert block.level == 2
    assert block.heading is None
    assert block.runs[0] == TextRun(text="Except as expressly permitted, Customer will not.")


def test_parse_markdown_skips_title_line_and_non_list_lines():
    raw = (
        "# My Document\n\n"
        "1. **Intro**. First clause.\n\n"
        "Common Paper footer text, not a list item.\n"
    )
    blocks = _parse_markdown(raw)
    assert len(blocks) == 1
    assert blocks[0].heading == "Intro"


def test_parse_markdown_matches_multi_letter_roman_numeral_markers():
    # DPA.md numbers a run of sub-items i./ii./iii./iv./v./vi./vii. - the
    # marker pattern must accept more than one lowercase letter or every
    # marker past "i." and "v." is silently dropped (and its EEA SCCs content
    # with it, including a `Governing Member State` field reference).
    raw = (
        "1. <span class=\"header_2\">Top</span>\n"
        "    a. First sub-item.\n"
        "    ii. Second sub-item mentions <span class=\"keyterms_link\">Governing Member State</span>.\n"
        "    vii. Last sub-item.\n"
    )
    blocks = _parse_markdown(raw)
    assert [b.marker for b in blocks] == ["1.", "a.", "ii.", "vii."]
    fields = _collect_fields(blocks)
    assert [f.key for f in fields] == ["governing_member_state"]


def test_parse_markdown_tracks_nested_indentation_levels():
    raw = "1. <span class=\"header_2\">Top</span>\n    1. <span class=\"header_3\">Mid</span> body text.\n        a. Leaf text.\n"
    blocks = _parse_markdown(raw)
    assert [b.level for b in blocks] == [0, 1, 2]


def test_collect_fields_dedupes_across_blocks_preserving_first_seen_order():
    blocks = [
        _parse_block("", "1.", 'Uses <span class="coverpage_link">Customer</span> here.'),
        _parse_block("", "2.", 'Uses <span class="coverpage_link">Customer\'s</span> data and <span class="coverpage_link">Provider</span>.'),
    ]
    fields = _collect_fields(blocks)
    assert [f.key for f in fields] == ["customer", "provider"]


def test_load_catalog_returns_eleven_entries():
    assert len(load_catalog()) == 11


def test_load_templates_parses_every_catalog_entry_with_at_least_one_field():
    templates = load_templates()
    assert len(templates) == 11
    for template in templates.values():
        assert template.blocks
        assert template.fields


def test_get_template_unknown_slug_returns_none():
    assert get_template("not-a-real-document") is None


def test_get_template_known_slug_returns_parsed_template():
    template = get_template("mutual_nda")
    assert template is not None
    assert template.name == "Mutual Non-Disclosure Agreement"


def test_dpa_template_parses_roman_numeral_sub_items_with_no_leaked_markup():
    dpa = get_template("dpa")
    assert dpa is not None
    all_text = " ".join(r.text for b in dpa.blocks for r in b.runs if isinstance(r, TextRun))
    assert "docking clause" in all_text
    assert "square brackets" in all_text
    assert "Annex I" in all_text
    assert "governing_member_state" in {f.key for f in dpa.fields}


def test_csa_and_software_license_templates_have_no_leaked_bold_markup_or_swallowed_fields():
    for slug in ("csa", "software_license_agreement", "sla"):
        template = get_template(slug)
        assert template is not None
        for block in template.blocks:
            for run in block.runs:
                if isinstance(run, TextRun):
                    assert "**" not in run.text, f"{slug}: leaked bold markup in {run!r}"
    csa = get_template("csa")
    assert csa is not None
    assert "general_cap_amount" in {f.key for f in csa.fields}
