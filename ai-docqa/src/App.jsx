import React, { useState, useEffect, useRef } from "react";
import ChatInterface from "./components/ChatInterface";
import ConversationHistory from "./components/ConversationHistory";
import UploadTrigger from "./components/UploadTrigger";
import PreviewPanel from "./components/PreviewPanel";
import { mockUploadPdf, askGeminiStream } from "./services/groq";
import CenterOverlay from "./components/CenterOverlay";
import "./App.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

const FILE_ICONS = { pdf: "📄", image: "🖼️", excel: "📊", word: "📝", text: "📃" };

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  const [messagesByDoc, setMessagesByDoc] = useState({});
  const [uploadStatus, setUploadStatus] = useState({ name: null, status: "none" });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [banner, setBanner] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("docqa-theme") || "dark");
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!banner || banner.type === "loading") return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const handleUpload = async (file) => {
    setBanner({ type: "loading", text: `Uploading ${file.name}...` });
    setUploadStatus({ name: file.name, status: "uploading" });

    const minDelay = new Promise((resolve) => setTimeout(resolve, 3500));

    try {
      const [result] = await Promise.all([mockUploadPdf(file), minDelay]);
      const newDoc = {
        documentId: result.documentId,
        fileName: result.fileName,
        pageCount: result.pageCount,
        fileType: result.fileType,
        file,
      };

      setDocuments((prev) => [...prev, newDoc]);
      setActiveDocumentId(newDoc.documentId);
      setMessagesByDoc((prev) => ({ ...prev, [newDoc.documentId]: [] }));
      setUploadStatus({ name: result.fileName, status: "success" });
      setBanner({ type: "success", text: `${result.fileName} uploaded — ready for questions.` });
    } catch (err) {
      setUploadStatus({ name: file.name, status: "error" });
      setBanner({ type: "error", text: err.message || "Something went wrong while uploading." });
    }
  };

  const handleValidationError = (msg) => setBanner({ type: "error", text: msg });

  const handleRemoveDocument = (docId) => {
    setDocuments((prev) => prev.filter((d) => d.documentId !== docId));
    setMessagesByDoc((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    if (previewDocumentId === docId) setPreviewDocumentId(null);
    if (activeDocumentId === docId) {
      setDocuments((prev) => {
        const remaining = prev.filter((d) => d.documentId !== docId);
        setActiveDocumentId(remaining.length > 0 ? remaining[remaining.length - 1].documentId : null);
        return remaining;
      });
    }
  };

  const handleAskQuestion = async (question) => {
    if (!activeDocumentId || isAiLoading) return;
    const docId = activeDocumentId;
    const userMessage = { role: "user", text: question, timestamp: new Date().toISOString() };

    setMessagesByDoc((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), userMessage, { role: "ai", text: "", timestamp: new Date().toISOString() }],
    }));
    setIsAiLoading(true);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await askGeminiStream(
        docId,
        question,
        (partialText) => {
          setMessagesByDoc((prev) => {
            const docMessages = [...(prev[docId] || [])];
            docMessages[docMessages.length - 1] = { ...docMessages[docMessages.length - 1], text: partialText };
            return { ...prev, [docId]: docMessages };
          });
        },
        controller.signal
      );
    } catch (err) {
      if (err.name === "AbortError") {
        // user intentionally stopped generation — not an error state
      } else {
        setErrorMessage(err.message || "The AI could not respond. Please try again.");
      }
    } finally {
      setIsAiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const hasDocument = documents.length > 0;
  const activeMessages = activeDocumentId ? messagesByDoc[activeDocumentId] || [] : [];
  const isUploading = uploadStatus.status === "uploading";
  const previewDoc = documents.find((d) => d.documentId === previewDocumentId) || null;

  const togglePreview = (docId) => {
    setPreviewDocumentId((prev) => (prev === docId ? null : docId));
  };

  return (
    <div className="app-frame">
      <div className="app-topbar">
        <div className="app-topbar__brand">
          <span className="app-topbar__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          <div className="app-topbar__text">
            <h1 className="app-topbar__title">RAG <span className="app-topbar__title-accent">QA</span></h1>
            <p className="app-topbar__subtitle">Ask Questions. Get Instant Answers From Your Document.</p>
          </div>
        </div>

        <div className="app-topbar__actions">
          <span className="app-topbar__badge">
            <span className="app-topbar__badge-dot" aria-hidden="true" />
            RAG AI
          </span>
        </div>
      </div>

   <div className="chat-shell">
  <CenterOverlay banner={banner} />
  {!hasDocument ? (
          <div className="hero">
            <div className="hero__glow" aria-hidden="true" />
            <div className="hero__floaters" aria-hidden="true">
              <span className="hero__floater hero__floater--1">📄</span>
              <span className="hero__floater hero__floater--2">🖼️</span>
              <span className="hero__floater hero__floater--3">📝</span>
              <span className="hero__floater hero__floater--4">✦</span>
            </div>

            <div className="hero__card">
              <div className="hero__card-header">
                <span className="hero__divider-line" aria-hidden="true" />
                <span className="hero__spark" aria-hidden="true">✦</span>
                <span className="hero__divider-line" aria-hidden="true" />
              </div>

              <p className="hero__greeting">Hey, {getGreeting()}</p>
              <h2 className="hero__title">
              WELCOME <span className="hero__title-accent">RAG</span>
              </h2>
              <p className="hero__subtitle">
                Upload a "Files" and ask questions about it. The AI will provide answers strictly based on the content of your document.
              </p>

              <UploadTrigger
                disabled={isUploading}
                onFileSelected={handleUpload}
                onValidationError={handleValidationError}
                wrapClassName="hero__prompt-wrap"
                trigger={(toggle, open) => (
                  <button type="button" className="hero__prompt-bar" onClick={toggle} aria-label="Upload a file">
                    <span className={`hero__prompt-plus ${open ? "hero__prompt-plus--active" : ""}`} aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </button>
                )}
              />

              <div className="hero__filetypes">
                <span className="hero__filetype-chip">
                  <span className="hero__filetype-chip-icon">PDF</span>
                  PDF ONLY
                </span>
              </div>
            </div>

            <p className="hero__footer">
              <span className="hero__footer-icon" aria-hidden="true">ⓘ</span>
              <b>Note : Answers Come Strictly From Your Document</b>
            </p>
          </div>
        ) : (
          <div className="chatpane">
  <div className="document-sidebar">
    {documents.map((doc) => (
      <div
        key={doc.documentId}
        className={`document-sidebar-item ${doc.documentId === activeDocumentId ? "document-sidebar-item--active" : ""}`}
        onClick={() => setActiveDocumentId(doc.documentId)}
        title={doc.fileName}
      >
        <span className="document-sidebar-item__icon">{FILE_ICONS[doc.fileType] || "📄"}</span>
        <span className="document-sidebar-item__name">{doc.fileName}</span>

        <div className="document-sidebar-item__actions">
          <button
            type="button"
            className={`document-sidebar-item__preview ${doc.documentId === previewDocumentId ? "document-sidebar-item__preview--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              togglePreview(doc.documentId);
            }}
            aria-label="Preview file"
            title="Preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          <button
            type="button"
            className="document-sidebar-item__remove"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveDocument(doc.documentId);
            }}
            aria-label="Remove file"
            title="Remove"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    ))}
  </div>

  <div className="chatpane__main">
    <div className="chat-shell__messages">
      <ConversationHistory
        messages={activeMessages}
        isAiLoading={isAiLoading}
        hasDocument={hasDocument}
        onSuggestionClick={handleAskQuestion}
      />
    </div>

    {errorMessage && (
      <div className="inline-error">
        <span>{errorMessage}</span>
      </div>
    )}

    <div className="chat-shell__composer">
      <ChatInterface
        onAskQuestion={handleAskQuestion}
        isDisabled={!activeDocumentId || isAiLoading}
        isAiLoading={isAiLoading}
        onFileSelected={handleUpload}
        onValidationError={handleValidationError}
        isUploading={isUploading}
        placeholder="Ask a question about the document..."
        onStopGeneration={handleStopGeneration}
      />
    </div>
  </div>

  {previewDoc && <PreviewPanel doc={previewDoc} onClose={() => setPreviewDocumentId(null)} />}
</div>
        )}
      </div>
    </div>
  );
}

export default App;