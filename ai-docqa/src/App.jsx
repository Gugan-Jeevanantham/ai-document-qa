import React, { useState, useEffect, useRef } from "react";
import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";
import ConversationHistory from "./components/ConversationHistory";
import DocumentTabs from "./components/DocumentTabs";
import { mockUploadPdf, askGeminiStream } from "./services/groq";
import "./App.css";

/**
 * App.jsx
 * ----------------------------------------------------------------------
 * Root component. Owns all shared state and passes it down as props.
 *
 * NICE-TO-HAVE FEATURES IMPLEMENTED HERE:
 * - Multiple PDF uploads: `documents` is an array, not a single file.
 *   Each has its own documentId and its own conversation history
 *   (`messagesByDoc`), switchable via DocumentTabs.
 * - Streaming AI responses: `handleAskQuestion` uses askGeminiStream,
 *   which calls back with the growing answer text as tokens arrive;
 *   the in-progress AI message is updated in place rather than
 *   appended all at once.
 * - Dark mode: theme state + toggle, persisted in localStorage.
 * - Page number references: the backend annotates the document with
 *   "[Page N]" markers and the model is instructed to cite them; no
 *   extra frontend state is needed for this one — it just shows up in
 *   the answer text.
 */
function App() {
  // --- Multi-document state ---
  const [documents, setDocuments] = useState([]); // [{ documentId, fileName, pageCount }]
  const [activeDocumentId, setActiveDocumentId] = useState(null);

  // --- Per-document conversation history ---
  const [messagesByDoc, setMessagesByDoc] = useState({}); // { [docId]: [{role, text, timestamp}] }

  // --- Upload UI state (for the FileUpload component's own status display) ---
  const [uploadStatus, setUploadStatus] = useState({ name: null, status: "none" });

  // --- Chat state ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // --- Theme state (dark mode) ---
  const [theme, setTheme] = useState(() => localStorage.getItem("docqa-theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("docqa-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  /**
   * Handles uploading a new PDF. Adds it to the `documents` list and
   * makes it the active document with a fresh, empty conversation.
   */
  const handleUpload = async (file) => {
    setErrorMessage(null);
    setUploadStatus({ name: file.name, status: "uploading" });

    try {
      const result = await mockUploadPdf(file);
      const newDoc = {
        documentId: result.documentId,
        fileName: result.fileName,
        pageCount: result.pageCount,
      };

      setDocuments((prev) => [...prev, newDoc]);
      setActiveDocumentId(newDoc.documentId);
      setMessagesByDoc((prev) => ({ ...prev, [newDoc.documentId]: [] }));
      setUploadStatus({ name: result.fileName, status: "success" });
    } catch (err) {
      setUploadStatus({ name: file.name, status: "error" });
      setErrorMessage(err.message || "Something went wrong while uploading.");
    }
  };

  /**
   * Asks a question about the currently active document, streaming the
   * answer token-by-token into the conversation history.
   */
  const handleAskQuestion = async (question) => {
    if (!activeDocumentId) return;

    const docId = activeDocumentId;
    const userMessage = { role: "user", text: question, timestamp: new Date().toISOString() };

    // Push the user's message, then a placeholder AI message we'll fill in as tokens stream.
    setMessagesByDoc((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), userMessage, { role: "ai", text: "", timestamp: new Date().toISOString() }],
    }));
    setIsAiLoading(true);
    setErrorMessage(null);

    try {
      await askGeminiStream(docId, question, (partialText) => {
        setMessagesByDoc((prev) => {
          const docMessages = [...(prev[docId] || [])];
          docMessages[docMessages.length - 1] = {
            ...docMessages[docMessages.length - 1],
            text: partialText,
          };
          return { ...prev, [docId]: docMessages };
        });
      });
    } catch (err) {
      setErrorMessage(err.message || "The AI could not respond. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const hasDocument = Boolean(activeDocumentId);
  const activeMessages = activeDocumentId ? messagesByDoc[activeDocumentId] || [] : [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__text">
          <h1>Document Q&amp;A</h1>
          <p className="app-subtitle">Upload a PDF, then ask questions about its content.</p>
        </div>
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <FileUpload
            uploadedFile={uploadStatus}
            onUpload={handleUpload}
            errorMessage={uploadStatus.status === "error" ? errorMessage : null}
          />
          <DocumentTabs
            documents={documents}
            activeDocumentId={activeDocumentId}
            onSelect={setActiveDocumentId}
          />
        </section>

        <section className="chat-section">
          {!hasDocument ? (
            <div className="empty-state">
              <p>Upload a PDF to start asking questions.</p>
            </div>
          ) : (
            <>
              <ConversationHistory messages={activeMessages} isAiLoading={isAiLoading} />
              <ChatInterface
                onAskQuestion={handleAskQuestion}
                isDisabled={!hasDocument || isAiLoading}
                isAiLoading={isAiLoading}
              />
              {errorMessage && uploadStatus.status !== "error" && (
                <div className="inline-error">
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;