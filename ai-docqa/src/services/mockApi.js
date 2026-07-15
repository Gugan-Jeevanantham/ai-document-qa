/**
 * mockApi.js
 * ----------------------------------------------------------------------
 * Simulated backend calls for local frontend development.
 *
 * WHY THIS FILE EXISTS:
 * The real backend (Node.js + Express + Claude API) isn't built yet.
 * These two functions mimic what the real API will do — same function
 * signatures, same return shape, same async/Promise behavior — so that
 * later, swapping to real fetch() calls requires ZERO changes in any
 * component. Only this file gets rewritten.
 *
 * WHEN BACKEND IS READY:
 * Replace the internals of mockUploadPdf() and mockAskQuestion() with
 * real fetch() calls to your Express endpoints (e.g. POST /upload and
 * POST /ask). Keep the function names and return shapes identical.
 */

// Sample AI answers used to simulate variety in responses.
// One of them intentionally simulates the "not found" case so the UI
// state for that scenario can be tested without a real backend.
const SAMPLE_ANSWERS = [
  "Based on the document, the key point discussed in this section relates directly to your question. The relevant clause appears in the second paragraph of the uploaded file.",
  "The document states this explicitly in its introduction — the requirement is clearly outlined and does not require external context to understand.",
  "Not available in document.",
];

let answerRotationIndex = 0;

/**
 * Simulates uploading a PDF to the backend for text extraction.
 * @param {File} file - The PDF file object selected by the user.
 * @returns {Promise<{documentId: string, fileName: string, success: boolean}>}
 */
export function mockUploadPdf(file) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate an occasional upload failure (roughly 1 in 12) so the
      // error + retry UI path can be exercised during development.
      const shouldFail = Math.random() < 0.08;

      if (shouldFail) {
        reject(new Error("Upload failed. The server could not process this file."));
        return;
      }

      resolve({
        documentId: "doc_" + Math.random().toString(36).slice(2, 9),
        fileName: file.name,
        success: true,
      });
    }, 1500); // simulated network + PDF processing delay
  });
}

/**
 * Simulates asking a question about a previously uploaded document.
 * @param {string} documentId - The ID returned from mockUploadPdf().
 * @param {string} question - The user's typed question.
 * @returns {Promise<{answer: string}>}
 */
export function mockAskQuestion(documentId, question) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const shouldFail = Math.random() < 0.05;

      if (shouldFail) {
        reject(new Error("Could not reach the AI service. Please try again."));
        return;
      }

      // Rotate through sample answers so repeated questions show
      // different response types, including the "not found" case.
      const answer = SAMPLE_ANSWERS[answerRotationIndex % SAMPLE_ANSWERS.length];
      answerRotationIndex += 1;

      resolve({ answer });
    }, 1500);
  });
}
