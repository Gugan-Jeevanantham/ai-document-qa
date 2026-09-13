# Document Q&A — AI-Powered PDF Question Answering App

A full-stack web application that lets users upload a PDF document and ask
questions about its content. Answers are generated strictly from the
uploaded document — the AI is explicitly instructed not to use outside
knowledge, and returns a fixed fallback message when an answer isn't
present in the document.

---

## 1. Project Setup Instructions

The project has two parts that must run at the same time: a **frontend**
(React + Vite) and a **backend** (Node.js + Express).

### Prerequisites
- Node.js v18 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Backend setup

```bash
cd ai-docqa-backend
npm install
```

Create a `.env` file in `ai-docqa-backend/` with:

```
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

Start the backend:

```bash
npm start
```

The server runs at `http://localhost:5000`.

### Frontend setup

Open a **second terminal**:

```bash
cd ai-docqa
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Open this in your browser.

> Both the backend and frontend must be running simultaneously for the
> app to work — the frontend calls the backend, which calls Groq.

---

## 2. Architecture / Application Flow

```
┌─────────────┐        1. Upload PDF        ┌──────────────────┐
│             │  ───────────────────────►   │                  │
│   React     │                              │  Express Backend │
│  Frontend   │  ◄───────────────────────   │   (Node.js)      │
│             │   documentId + fileName      │                  │
└─────────────┘                              └────────┬─────────┘
      │                                                │
      │  2. Ask question                                │ pdf-parse
      │  { documentId, question }                       │ extracts text,
      ▼                                                │ stored in memory
┌─────────────┐   3. Stream answer (SSE) ────────────────┘
│   React     │  ◄───────────────────────
│  Frontend   │      token-by-token
└─────────────┘
```

**Flow summary:**
1. User selects a PDF in the browser → validated as `.pdf` client-side
   (only PDFs are accepted; other file types are rejected with an inline
   error).
2. Frontend sends the file to the backend's `POST /upload` endpoint.
3. Backend extracts the PDF's text (`pdf-parse`) and stores it in memory,
   keyed by a generated `documentId`. This ID is returned to the frontend.
4. User types a question (or picks a suggested question) → frontend opens
   a streaming connection to `POST /ask-stream` with `{ documentId,
   question }`.
5. Backend retrieves the stored document text, builds a strict system
   prompt around it, and streams the model's response back token-by-token
   via Server-Sent Events.
6. The answer renders live in the chat as it streams, and is added to the
   conversation history. Generation can be stopped mid-stream.

---

## 3. AI Model(s) Used

**Groq API — `openai/gpt-oss-120b`**

Chosen because:
- Free tier with generous limits and **no credit card required**.
- Very fast inference (Groq's LPU hardware), which keeps the chat feeling
  responsive, especially with streaming.
- OpenAI-compatible chat completion API, straightforward to integrate.

---

## 4. Prompt Design

The backend builds this system prompt for every question, injecting the
full extracted document text:

```
You are a document Q&A assistant. Answer the user's question using ONLY
the information in the following document text. Do not use outside
knowledge or make assumptions. If the answer is not present in the
document, respond with exactly this text and nothing else:
"Not available in document."

Document content:
{extracted_pdf_text}
```

The user's typed question is sent as a separate `user` role message. This
system/user separation, combined with the explicit "ONLY... do not use
outside knowledge" instruction and an exact fallback string, is what
grounds every answer in the uploaded document.

---

## 5. Libraries Used

**Frontend**
- `react` — UI library
- `vite` — dev server / build tool
- `react-markdown` — renders formatted AI responses (bold, lists, code)
- `plain CSS` — custom design system via CSS variables, no framework

**Backend**
- `express` — HTTP server and routing
- `multer` — handles multipart PDF file uploads (in-memory storage)
- `pdf-parse` — extracts raw text from the uploaded PDF buffer
- `groq-sdk` — official Groq API client
- `cors` — allows the frontend (different port) to call the backend
- `dotenv` — loads the Groq API key from `.env`

---

## 6. How Hallucinations Were Prevented

1. **Strict system prompt** — the model is explicitly told to answer
   *only* from the supplied document text and never use outside
   knowledge or infer unstated information.
2. **Exact fallback string** — when information isn't in the document,
   the model is instructed to return precisely `"Not available in
   document."`, rather than guessing or partially answering.
3. **Document text is always re-supplied per question** — there's no
   reliance on the model "remembering" the document from earlier in a
   conversation, which reduces drift.
4. **Server-side grounding** — the document text is injected on the
   backend, not editable by the client, so the grounding context can't
   be tampered with from the browser.

Verified manually: a question outside the resume's content (e.g. asking
for a detail the document doesn't contain) correctly returned "Not
available in document." instead of a guessed answer.

---

## 7. AI Coding Tools Used

**Claude (Anthropic)** was used throughout development to:
- Scaffold the initial React component structure (ChatInterface,
  ConversationHistory, UploadTrigger, PreviewPanel) and state flow in
  `App.jsx`.
- Design and iterate on the Express backend (`server.js`) — the
  `/upload` and `/ask-stream` endpoints, PDF text extraction, and the
  Groq streaming integration.
- Redesign the UI end-to-end: dark theme with a document sidebar,
  centered hero screen with floating background icons, suggested-question
  chips, and a full-screen mobile PDF preview with pinch-zoom support.
- Debug integration and deployment issues (e.g. Vite `base` path
  conflicts between Vercel and GitHub Pages, missing production
  dependencies, cold-start/network error handling, CORS/API-key
  exposure concerns that led to moving the AI call server-side).
- Write and refine the grounding system prompt used for hallucination
  prevention.
- Review the codebase for duplicate/dead code and remove unused files.

All AI-suggested code was reviewed, tested, and adjusted manually before
being included in the final app.

---

## 8. Limitations

- **In-memory document storage** — uploaded document text is stored in a
  plain JavaScript object on the server, not a database. Restarting the
  backend clears all uploaded documents (no persistence).
- **PDF only** — the app currently accepts `.pdf` files only; other
  formats (Word, Excel, images, text) are rejected at upload.
- **No PDF OCR** — scanned/image-based PDFs (no embedded text layer)
  will fail text extraction, since `pdf-parse` only reads existing text.
- **No authentication** — anyone with access to the running app can
  upload documents and ask questions; there's no per-user isolation.
- **Single-server deployment** — Groq's rate limits are shared across
  all users of the deployed instance.
- **Free-tier cold starts** — the Render backend spins down after
  inactivity, so the first request after idle time can take 30–50
  seconds.

---

## 9. Possible Future Improvements

- Add a persistent database (e.g. PostgreSQL/MongoDB) so uploaded
  documents survive server restarts.
- Re-introduce support for additional file types (Word, Excel, images,
  text) with per-type preview.
- Display page number references alongside answers, and highlight the
  supporting text directly within the in-app PDF preview.
- Add OCR (e.g. Tesseract.js) to support scanned PDFs.
- Add basic authentication so each user's uploaded documents are
  private.
- Code-split the frontend bundle to reduce initial load size.

---

## Tech Stack Summary

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Frontend    | React, Vite, plain CSS               |
| Backend     | Node.js, Express                     |
| PDF Parsing | pdf-parse                            |
| AI Model    | Groq API — openai/gpt-oss-120b       |
| File Upload | Multer                               |

## Live Demo
- Frontend: https://ai-document-qa-orpin.vercel.app
- Backend: https://ai-document-qa-backend.onrender.com

## UI Design Notes

The interface uses a dark-only theme built on CSS variables, with a
cyan-teal accent gradient throughout. Key screens:

- **Hero screen** — a centered card with a divider-and-spark header,
  gradient-accented title, a single circular upload button, and subtle
  floating document icons drifting in the background.
- **Chat view** — a left-hand document sidebar (pill-shaped, switchable
  between multiple uploaded files), a center conversation pane with
  avatar-tagged message bubbles, markdown rendering, per-message copy
  buttons, and a suggested-questions card on first load.
- **PDF preview** — opens alongside the chat on desktop; on mobile it
  becomes a full-screen sheet with native pinch-to-zoom.
- **Upload feedback** — a blurred center overlay shows a spinner while
  uploading, then a round animated tick or cross icon for success/failure
  instead of a text banner.