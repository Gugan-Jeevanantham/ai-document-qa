import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

export default function PreviewPanel({ doc, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [excelHtml, setExcelHtml] = useState(null);
  const [wordHtml, setWordHtml] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  // ---- track mobile/desktop breakpoint so the PDF <embed> remounts on crossover ----
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setExcelHtml(null);
    setWordHtml(null);
    setTextContent(null);
    setParseError(null);
    setObjectUrl(null);

    if (!doc?.file) return;

    if (doc.fileType === "pdf" || doc.fileType === "image") {
      const url = URL.createObjectURL(doc.file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (doc.fileType === "excel") {
      setIsParsing(true);
      doc.file
        .arrayBuffer()
        .then((buffer) => {
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(sheet, { id: "excel-preview-table" });
          setExcelHtml(html);
        })
        .catch(() => setParseError("Couldn't render a preview for this spreadsheet."))
        .finally(() => setIsParsing(false));
      return;
    }

    if (doc.fileType === "word") {
      setIsParsing(true);
      doc.file
        .arrayBuffer()
        .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then((result) => setWordHtml(result.value))
        .catch(() => setParseError("Couldn't render a preview for this document."))
        .finally(() => setIsParsing(false));
      return;
    }

    if (doc.fileType === "text") {
      setIsParsing(true);
      doc.file
        .text()
        .then((text) => setTextContent(text))
        .catch(() => setParseError("Couldn't read this text file."))
        .finally(() => setIsParsing(false));
      return;
    }
  }, [doc]);

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <span className="preview-panel__title" title={doc.fileName}>
          {doc.fileName}
        </span>
        <button type="button" className="preview-panel__close" onClick={onClose} aria-label="Close preview">
          ×
        </button>
      </div>

  <div className="preview-panel__body">
  {doc.fileType?.toLowerCase() === "pdf" && objectUrl && (
    isMobile ? (
      <div className="preview-panel__mobile-pdf">
        <span className="preview-panel__mobile-pdf-icon" aria-hidden="true">📄</span>
        <p className="preview-panel__mobile-pdf-text">
          PDF preview isn't supported inline on this device.
        </p>
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-panel__mobile-pdf-btn"
        >
          Open PDF
        </a>
      </div>
    ) : (
      <iframe
        key="pdf-desktop"
        src={`${objectUrl}#toolbar=0&navpanes=0`}
        className="preview-panel__pdf"
        title="PDF preview"
      />
    )
  )}

  {doc.fileType?.toLowerCase() === "image" && objectUrl && (
    <img src={objectUrl} alt={doc.fileName} className="preview-panel__image" />
  )}

  {isParsing && (
    <div className="preview-panel__loading">
      <span className="spinner" aria-hidden="true"></span>
      <p>Preparing preview...</p>
    </div>
  )}

  {parseError && (
    <div className="preview-panel__fallback">
      <span className="preview-panel__fallback-icon">⚠️</span>
      <p>{parseError}</p>
    </div>
  )}

  {excelHtml && !isParsing && (
    <div className="preview-panel__excel" dangerouslySetInnerHTML={{ __html: excelHtml }} />
  )}

  {wordHtml && !isParsing && (
    <div className="preview-panel__word" dangerouslySetInnerHTML={{ __html: wordHtml }} />
  )}

  {textContent !== null && !isParsing && (
    <pre className="preview-panel__text">{textContent}</pre>
  )}

  {/* Fallback: nothing matched at all */}
  {!isParsing && !parseError && !excelHtml && !wordHtml && textContent === null &&
    doc.fileType?.toLowerCase() !== "pdf" && doc.fileType?.toLowerCase() !== "image" && (
    <div className="preview-panel__fallback">
      <span className="preview-panel__fallback-icon">⚠️</span>
      <p>Preview not available for this file type ({doc.fileType || "unknown"}).</p>
    </div>
  )}
</div>
    </div>
  );
}