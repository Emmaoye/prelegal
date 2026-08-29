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
- V1 technical foundation (PL-9): `backend/` as a `uv` + FastAPI project; SQLite `users` table dropped and recreated on every container start, with `/api/auth/signup` and `/api/auth/signin` endpoints; frontend gated behind a login screen; whole app packaged into a single Docker image; `scripts/start-*` / `stop-*` for Mac, Linux, and Windows.
- AI chat for all 11 catalog document types (PL-11, current implementation — supersedes PL-8's manual NDA-only form and PL-10's NDA-only chat, neither of which still exists): a single `POST /api/chat/message` endpoint drives every document type. `backend/app/document_templates.py` parses each `templates/*.md` file into a block tree and an ordered field list at import time (no per-document-type field list is hand-maintained). `backend/app/document_chat.py` first classifies the user's freeform request against `catalog.json`'s descriptions (asking a clarifying question, or explaining we can't generate an unsupported request and suggesting the closest catalog match, until a type is confirmed), then runs field extraction against a dynamically-built Structured Outputs schema for that document type; both steps enforce in code (not just via prompt) that the reply asks a follow-up question whenever the type is still unresolved or fields remain missing. Two universal fields (the two parties' names) are collected for every document type, since the Standard Terms templates all assume an external Cover Page supplies party identity. The frontend (`DocumentChat`/`DocumentPreview`/`DocumentPdfDocument`/`useDocumentChat`) renders whatever `document` tree comes back generically, substituting known field values inline and bracketing unknown ones (e.g. `[Purpose]`) rather than gating the download on every field being filled, and returns keyboard focus to the message input after each assistant reply. Conversation state lives client-side; the backend is stateless per request.
- Field-level format validation (e.g. requiring the old NDA-only implementation's effective date to be ISO-formatted) was dropped when generalizing to arbitrary fields across 11 templates - the merge step now only guards against blank/whitespace overwrites, not per-field format.
- Multi-user support and polish (PL-12): signin now verifies the password with `bcrypt.checkpw`, and both signup and signin issue a random opaque token stored in a new `sessions` table (dropped/recreated on every start, like `users`), set as an httpOnly `session_token` cookie; `GET /api/auth/me` and `POST /api/auth/logout` back a new `app/auth_dependency.py` `get_current_user` FastAPI dependency, which now gates `/api/chat/message` and the new `/api/documents` endpoints - the frontend no longer keeps a client-side "logged in" marker at all, `useAuthGate` instead asks `/api/auth/me` on every protected page load. Every chat turn that produces a document is upserted into a new `documents` table (keyed by a client-generated `conversationId`, scoped to `user_id` on both read and write so a colliding id from a different user can't overwrite another user's row) via `backend/app/documents_store.py`; `GET /api/documents` / `GET /api/documents/{id}` back a new `/history` page (`frontend/app/(app)/history/`) that lists a user's past documents and re-renders one read-only (via the existing `render_document`) with its own PDF download, reusing `DocumentPreview`/`DownloadDocumentButton`. `frontend/app/(app)/layout.tsx` now centralizes the auth gate and a new `AppHeader` (product nav + sign-out) for both authenticated pages. The document disclaimer (`lib/document-render.ts`'s `DOCUMENT_DISCLAIMER`) was reworded to lead with "Draft document" and promoted from small footer text to a bordered banner at the top of both the on-screen preview and the PDF. The brand palette from this file's "Color Scheme" section is now registered as Tailwind `@theme` tokens (`bg-brand-purple`, `text-brand-navy`, etc.) in `frontend/app/globals.css` instead of being repeated as arbitrary hex classes.

**Not yet built:**
- Full-fidelity field collection for the more complex templates (CSA, PSA, Software License Agreement, etc. have 20-27 distinct placeholder concepts each) - the chat will happily finish (and the document remains downloadable) with many of those left as bracketed placeholders rather than pressing the user through every one.
- Mid-conversation document-type switching — once a type is confirmed for a conversation there's no way to change it; the user has to start a new chat.
- Editing or deleting a saved document from History, or resuming its conversation — History is view/re-download only.