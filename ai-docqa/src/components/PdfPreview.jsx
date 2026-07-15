import React, { useEffect, useState } from "react";

/**
 * PdfPreview.jsx
 * ----------------------------------------------------------------------
 * Nice-to-have: "PDF preview."
 *
 * Props:
 * - file: File | null  -- the raw File object selected by the user
 *
 * Uses the browser's built-in PDF renderer via an object URL — no extra
 * library needed. Automatically revokes the previous URL when the file
 * changes or the component unmounts, to avoid memory leaks.
 */
function PdfPreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return null;

  return (
    <div className="pdf-preview">
      <button
        type="button"
        className="pdf-preview__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "▲ Hide PDF preview" : "▼ Show PDF preview"}
      </button>

      {isOpen && (
        <div className="pdf-preview__frame-wrap">
          <embed
            src={previewUrl}
            type="application/pdf"
            className="pdf-preview__frame"
            title="PDF preview"
          />
        </div>
      )}
    </div>
  );
}

export default PdfPreview;