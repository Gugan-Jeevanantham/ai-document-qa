/**
 * server.js
 * ----------------------------------------------------------------------
 * Express backend for the Document Q&A assignment.
 *
 * Endpoints:
 * - POST /upload      : accepts a PDF, extracts per-page text, stores it,
 *                        returns a documentId. Supports MULTIPLE PDFs —
 *                        each upload gets its own documentId and is kept
 *                        in the store independently (nice-to-have:
 *                        "Support multiple PDF uploads").
 * - POST /ask-stream   : accepts { documentId, question }, streams the
 *                        AI's answer back as Server-Sent Events so the
 *                        frontend can render it token-by-token
 *                        (nice-to-have: "Streaming AI responses").
 *
 * Page-number references (nice-to-have): PDF text is extracted per page
 * and the combined document text sent to the model is annotated with
 * "[Page N]" markers, and the system prompt asks the model to cite the
 * page number when it can identify one.
 */

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory store: documentId -> { fileName, text }
// `text` already contains "[Page N]" markers between pages.
const documentStore = {};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
});

/**
 * Custom pdf-parse page renderer that inserts a marker between pages so
 * we can split the extracted text back into per-page chunks afterward.
 */
function renderPageWithMarker(pageData) {
  return pageData.getTextContent().then((textContent) => {
    const pageText = textContent.items.map((item) => item.str).join(" ");
    return pageText + "\n\n---PAGE_BREAK---\n\n";
  });
}

/**
 * POST /upload
 * Accepts multipart/form-data with a "file" field. Extracts per-page
 * text and stores it (annotated with page markers) against a new
 * documentId. Each call creates an independent, separately addressable
 * document — this is what enables multiple PDFs to coexist.
 */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const parsed = await pdfParse(req.file.buffer, { pagerender: renderPageWithMarker });
    const rawPages = parsed.text
      .split("---PAGE_BREAK---")
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawPages.length === 0) {
      return res.status(422).json({
        error: "Could not extract any text from this PDF. It may be scanned/image-based.",
      });
    }

    const annotatedText = rawPages
      .map((pageText, idx) => `[Page ${idx + 1}]\n${pageText}`)
      .join("\n\n");

    const documentId = "doc_" + Math.random().toString(36).slice(2, 9);
    documentStore[documentId] = {
      fileName: req.file.originalname,
      text: annotatedText,
      pageCount: rawPages.length,
    };

    res.json({
      documentId,
      fileName: req.file.originalname,
      pageCount: rawPages.length,
      success: true,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process the PDF." });
  }
});

/**
 * POST /ask-stream
 * Body: { documentId, question }
 * Streams the answer back as Server-Sent Events. Each chunk is sent as
 * `data: {"delta": "..."}\n\n`, and the stream ends with `data: [DONE]\n\n`.
 */
app.post("/ask-stream", async (req, res) => {
  const { documentId, question } = req.body;

  if (!documentId || !question) {
    return res.status(400).json({ error: "documentId and question are required." });
  }

  const doc = documentStore[documentId];
  if (!doc) {
    return res.status(404).json({ error: "Document not found. Please re-upload the PDF." });
  }

  const systemPrompt = `You are a document Q&A assistant. Answer the user's question using ONLY the information in the following document text. Do not use outside knowledge or make assumptions. The document text is divided into pages marked like "[Page 1]", "[Page 2]", etc. — when your answer draws on a specific page, mention it in the form "(Page N)" at the end of the relevant sentence. If the answer is not present in the document, respond with exactly this text and nothing else: "Not available in document."

Document content:
${doc.text}`;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Ask-stream error:", err);
    // If headers are already sent (streaming started), send an SSE error event.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message || "Stream failed." })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message || "Failed to get an answer." });
    }
  }
});

app.get("/", (req, res) => {
  res.send("Document Q&A backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});