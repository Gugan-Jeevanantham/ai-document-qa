/**
 * services/groq.js
 * ----------------------------------------------------------------------
 * Talks to YOUR Node.js backend (never calls Groq directly from the
 * browser — the API key stays server-side).
 *
 * mockUploadPdf(file)              -> uploads a PDF, returns { documentId, fileName, pageCount }
 * askGeminiStream(documentId, q, onChunk) -> streams the answer, calling
 *                                             onChunk(partialTextSoFar) as
 *                                             tokens arrive. Resolves with
 *                                             the final full answer string.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/** Uploads a PDF to the backend for text extraction. */
export async function mockUploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Upload failed.");
  }

  return data;
}

/**
 * Streams an answer for a question about a given document.
 * @param {string} documentId
 * @param {string} question
 * @param {(partialText: string) => void} onChunk - called with the
 *        accumulated text so far, every time new tokens arrive.
 * @returns {Promise<string>} the final complete answer text.
 */
export async function askGeminiStream(documentId, question, onChunk) {
  const response = await fetch(`${BASE_URL}/ask-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, question }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The AI could not respond.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop(); // keep any incomplete trailing chunk for next read

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();

      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.delta) {
          fullText += parsed.delta;
          onChunk(fullText);
        }
      } catch (e) {
        if (e.message && e.message !== "Unexpected end of JSON input") {
          throw e;
        }
      }
    }
  }

  return fullText;
}