# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

See "Implementation status" at the end of this file for what's actually built so far vs. still planned.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically exported (`next build` with `output: "export"`) and served by FastAPI's `StaticFiles`, alongside the `/api/*` routes, all from the same port 8000 process — no separate frontend server.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

**Built:**
- Legal document template dataset (`templates/`, `catalog.json`) — CommonPaper templates for all 11 document types (PL-7).
- Mutual NDA Creator — live preview + client-side PDF download for the Mutual NDA document only (PL-8).
- V1 technical foundation (PL-9): `backend/` as a `uv` + FastAPI project; SQLite `users` table dropped and recreated on every container start, with `/api/auth/signup` and `/api/auth/signin` endpoints; frontend gated behind a login screen; whole app packaged into a single Docker image; `scripts/start-*` / `stop-*` for Mac, Linux, and Windows.
- AI chat for the Mutual NDA (PL-10): the manual form was replaced with a freeform chat that asks about the NDA fields conversationally and extracts them via the "AI design" section's LiteLLM/OpenRouter/Cerebras setup with Structured Outputs. Superseded by PL-11 below - the dedicated `/api/nda-chat/message` endpoint and NDA-only frontend it introduced no longer exist.
- AI chat for all 11 catalog document types (PL-11): a single `POST /api/chat/message` endpoint now drives every document type. `backend/app/document_templates.py` parses each `templates/*.md` file into a block tree and an ordered field list at import time (no per-document-type field list is hand-maintained). `backend/app/document_chat.py` first classifies the user's freeform request against `catalog.json`'s descriptions (asking a clarifying question, or explaining we can't generate an unsupported request and suggesting the closest catalog match, until a type is confirmed), then runs field extraction against a dynamically-built Structured Outputs schema for that document type; both steps enforce in code (not just via prompt) that the reply asks a follow-up question whenever the type is still unresolved or fields remain missing. Two universal fields (the two parties' names) are collected for every document type, since the Standard Terms templates all assume an external Cover Page supplies party identity. The frontend renders whatever `document` tree comes back generically (`DocumentPreview`/`DocumentPdfDocument`), substituting known field values inline and bracketing unknown ones (e.g. `[Purpose]`) rather than gating the download on every field being filled. Conversation state lives client-side; the backend is stateless per request.
- Field-level format validation (e.g. requiring the NDA's effective date to be ISO-formatted) was dropped when generalizing to arbitrary fields across 11 templates - the merge step now only guards against blank/whitespace overwrites, not per-field format.

**Not yet built:**
- Real authentication — signup/signin exist but signin does not verify the password; there's no session/token beyond a client-side "logged in" marker.
- Document persistence — generated documents aren't saved anywhere, and chat history isn't persisted across page reloads; documents are only downloaded as a PDF client-side.
- Full-fidelity field collection for the more complex templates (CSA, PSA, Software License Agreement, etc. have 20-27 distinct placeholder concepts each) - the chat will happily finish (and the document remains downloadable) with many of those left as bracketed placeholders rather than pressing the user through every one.