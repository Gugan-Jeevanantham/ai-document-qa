import React, { useState } from "react";
import UploadTrigger from "./UploadTrigger";

function ChatInterface({ onAskQuestion, isDisabled, isAiLoading, onFileSelected, onValidationError, isUploading, placeholder = "Ask a question about the document...", onStopGeneration }) {
  const [questionInput, setQuestionInput] = useState("");
  const submitQuestion = () => {
    const trimmed = questionInput.trim();
    if (!trimmed || isDisabled) return;
    onAskQuestion(trimmed);
    setQuestionInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  };

  return (
    <div className="chat-interface">
      {isAiLoading && (
        <div className="chat-interface__typing" aria-live="polite">
          <span className="spinner" aria-hidden="true"></span>
          <span>AI is thinking...</span>
        </div>
      )}

      <div className="chat-interface__input-row">
        <UploadTrigger
          disabled={isUploading}
          onFileSelected={onFileSelected}
          onValidationError={onValidationError}
          trigger={(toggle, open) => (
            <button
              type="button"
              className={`chat-interface__plus ${open ? "chat-interface__plus--active" : ""}`}
              onClick={toggle}
              aria-label="Upload file or image"
              title="Upload file or image"
              disabled={isUploading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        />

        <input
          type="text"
          className="chat-interface__input"
          placeholder={placeholder}
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />

        {isAiLoading ? (
          <button
            type="button"
            className="chat-interface__send chat-interface__send--stop"
            onClick={onStopGeneration}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="chat-interface__send"
            onClick={submitQuestion}
            disabled={isDisabled || !questionInput.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;