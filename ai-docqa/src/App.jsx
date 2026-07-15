import React, { useState } from "react";
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
 * Dark mode only — no theme toggle (removed per design requirement).
 */
function App() {
  // --- Multi-document state ---
  const [documents, setDocuments] = useState([]); // [{ documentId, fileName, pageCount }]
  const [activeDocumentId, setActiveDocumentId] = useState(null);

  // --- Per-document conversation history ---
  const [messagesByDoc, setMessagesByDoc] = useState({}); // { [docId]: [{role, text, timestamp}] }

  // --- Upload UI state ---
  const [uploadStatus, setUploadStatus] = useState({ name: null, status: "none" });

  // --- Chat state ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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

  const handleAskQuestion = async (question) => {
    if (!activeDocumentId) return;

    const docId = activeDocumentId;
    const userMessage = { role: "user", text: question, timestamp: new Date().toISOString() };

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
    <div className="app-frame">
      {/* Navbar-style top strip — title only, no nav links */}
      <div className="app-topbar">
        <h1 className="app-topbar__title">DOCUMENT QA</h1>
      </div>

      <div className="app-shell">
        <p className="app-subtitle">Upload a PDF, then ask questions about its content.</p>

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
    </div>
  );
}

export default App;