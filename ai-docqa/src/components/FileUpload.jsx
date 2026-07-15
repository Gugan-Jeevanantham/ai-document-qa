import React, { useState, useRef } from "react";
import PdfPreview from "./PdfPreview";

/**
 * FileUpload.jsx
 * ----------------------------------------------------------------------
 * Props:
 * - uploadedFile: { name: string|null, status: 'none'|'uploading'|'success'|'error' }
 * - onUpload: (file: File) => void
 * - errorMessage: string|null
 *
 * Note: with multi-PDF support, this component can be used repeatedly —
 * each successful upload adds a new tab in DocumentTabs (see App.jsx).
 * After a successful upload, the file input resets so another PDF can
 * be selected immediately.
 */
function FileUpload({ uploadedFile, onUpload, errorMessage }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setValidationError("Please select a PDF file. Other file types aren't supported.");
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;
    onUpload(selectedFile);
  };

  const isUploading = uploadedFile.status === "uploading";
  const isSuccess = uploadedFile.status === "success";

  return (
    <div className="file-upload">
      <label className="file-upload__label" htmlFor="pdf-input">
        Upload document
      </label>

      <div className="file-upload__controls">
        <input
          id="pdf-input"
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUploadClick}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {selectedFile && !isUploading && (
        <p className="file-upload__filename">Selected: {selectedFile.name}</p>
      )}

      {isUploading && (
        <div className="file-upload__status file-upload__status--loading">
          <span className="spinner" aria-hidden="true"></span>
          <span>Processing {uploadedFile.name}...</span>
        </div>
      )}

      {isSuccess && uploadedFile.name === selectedFile?.name && (
        <div className="file-upload__status file-upload__status--success">
          <span>✓ {uploadedFile.name} uploaded — ready for questions.</span>
        </div>
      )}

      {validationError && (
        <div className="file-upload__status file-upload__status--error">
          <span>{validationError}</span>
        </div>
      )}

      {errorMessage && (
        <div className="file-upload__status file-upload__status--error">
          <span>{errorMessage}</span>
          {selectedFile && (
            <button type="button" className="btn btn-retry" onClick={handleUploadClick}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Nice-to-have: PDF preview, rendered via browser's native PDF viewer */}
      <PdfPreview file={selectedFile} />
    </div>
  );
}

export default FileUpload;