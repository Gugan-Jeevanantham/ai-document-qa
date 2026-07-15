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
┌─────────────┐        3. Forward Q + doc text ─────────┘
│   React     │  ◄───────────────────────
│  Frontend   │      { answer }
└─────────────┘

Backend, on receiving a question:
  - Looks up the stored document text for that documentId
  - Sends [system prompt + document text + question] to Groq
  - Returns the model's answer to the frontend
```

**Flow summary:**
1. User selects a PDF in the browser → validated as `.pdf` client-side.
2. Frontend sends the file to the backend's `POST /upload` endpoint.
3. Backend extracts the PDF's text (`pdf-parse`) and stores it in memory,
   keyed by a generated `documentId`. This ID is returned to the frontend.
4. User types a question → frontend sends `{ documentId, question }` to
   `POST /ask`.
5. Backend retrieves the stored document text, builds a strict system
   prompt around it, and calls the Groq API (Llama 3.3 70B).
6. The model's answer is returned to the frontend and rendered in the
   chat interface, added to the conversation history.

---

## 3. AI Model(s) Used

**Groq API — `llama-3.3-70b-versatile`**

Chosen because:
- Free tier with generous limits and **no credit card required** — meets
  the assignment's "or any suitable alternative" allowance.
- Very fast inference (Groq's LPU hardware), which keeps the chat feeling
  responsive.
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
- `pdfjs-dist` *(if client-side preview is added)* — PDF rendering

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
- Scaffold the initial React component structure (FileUpload,
  ChatInterface, ConversationHistory) and state flow in `App.jsx`.
- Design and iterate on the Express backend (`server.js`) — the
  `/upload` and `/ask` endpoints, PDF text extraction, and the Groq
  integration.
- Debug integration issues during development (e.g. deprecated model
  names, environment variable misconfiguration, CORS/API-key exposure
  concerns that led to moving the AI call server-side).
- Write and refine the grounding system prompt used for hallucination
  prevention.

All AI-suggested code was reviewed, tested, and adjusted manually before
being included in the final app.

---

## 8. Limitations

- **In-memory document storage** — uploaded document text is stored in a
  plain JavaScript object on the server, not a database. Restarting the
  backend clears all uploaded documents (no persistence).
- **No PDF OCR** — scanned/image-based PDFs (no embedded text layer)
  will fail text extraction, since `pdf-parse` only reads existing text.
- **No authentication** — anyone with access to the running app can
  upload documents and ask questions; there's no per-user isolation.
- **Single-server deployment** — Groq's rate limits are shared across
  all users of the deployed instance.
- **No streaming responses** — answers are returned in a single response
  once complete, rather than streamed token-by-token.

---

## 9. Possible Future Improvements

- Add a persistent database (e.g. PostgreSQL/MongoDB) so uploaded
  documents survive server restarts.
- Support multiple PDF uploads with the ability to switch between
  documents in the same session.
- Stream AI responses token-by-token for a more responsive feel.
- Display page number references alongside answers, and highlight the
  supporting text directly within an in-app PDF preview.
- Add OCR (e.g. Tesseract.js) to support scanned PDFs.
- Add basic authentication so each user's uploaded documents are
  private.

---

## Tech Stack Summary

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React, Vite, plain CSS               |
| Backend   | Node.js, Express                     |
| PDF Parsing | pdf-parse                          |
| AI Model  | Groq API — Llama 3.3 70B Versatile   |
| File Upload | Multer                             |


## Live Demo
- Frontend: https://ai-document-qa-orpin.vercel.app
- Backend: https://ai-document-qa-backend.onrender.com