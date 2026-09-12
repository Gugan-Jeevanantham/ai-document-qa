import React, { useRef } from "react";

const DOC_ACCEPT = ".pdf";

function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * UploadTrigger — "+ button -> native file picker" (PDF only, direct — no popup
 * since there's only one file type supported now).
 */
export default function UploadTrigger({
  trigger,
  onFileSelected,
  onValidationError,
  disabled,
  wrapClassName,
}) {
  const docInputRef = useRef(null);

  const openDocPicker = () => {
    docInputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!isPdfFile(file)) {
      onValidationError("Only PDF files are supported. Please select a .pdf file.");
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className={`upload-trigger ${wrapClassName || ""}`}>
      {trigger(openDocPicker, false)}

      <input
        ref={docInputRef}
        type="file"
        accept={DOC_ACCEPT}
        className="upload-trigger__hidden-input"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}