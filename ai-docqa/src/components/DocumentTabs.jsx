import React from "react";

/**
 * DocumentTabs.jsx
 * ----------------------------------------------------------------------
 * Nice-to-have: "Support multiple PDF uploads."
 *
 * Props:
 * - documents: [{ documentId, fileName, pageCount }]
 * - activeDocumentId: string | null
 * - onSelect: (documentId) => void
 *
 * Renders a horizontal row of pill tabs, one per uploaded document.
 * Clicking a tab switches the active document (and its own separate
 * conversation history, managed in App.jsx).
 */
function DocumentTabs({ documents, activeDocumentId, onSelect }) {
  if (documents.length === 0) return null;

  return (
    <div className="document-tabs">
      {documents.map((doc) => (
        <button
          key={doc.documentId}
          type="button"
          className={`document-tab ${doc.documentId === activeDocumentId ? "document-tab--active" : ""}`}
          onClick={() => onSelect(doc.documentId)}
          title={doc.fileName}
        >
          📄 {doc.fileName.length > 22 ? doc.fileName.slice(0, 19) + "..." : doc.fileName}
        </button>
      ))}
    </div>
  );
}

export default DocumentTabs;