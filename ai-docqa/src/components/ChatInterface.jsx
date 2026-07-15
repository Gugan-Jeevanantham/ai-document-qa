import React, { useState } from "react";

/**
 * ChatInterface.jsx
 * ----------------------------------------------------------------------
 * Props:
 * - onAskQuestion: (question: string) => void
 * - isDisabled: boolean -- true when no document uploaded or AI is busy
 * - isAiLoading: boolean -- true while waiting for an AI response
 *
 * Responsibilities:
 * - Own only the local text-input value (not the conversation history —
 *   that lives in App.jsx and is rendered by ConversationHistory).
 * - Submit on button click or Enter key.
 * - Show "AI is thinking..." indicator while isAiLoading is true.
 */
function ChatInterface({ onAskQuestion, isDisabled, isAiLoading }) {
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
        <input
          type="text"
          className="chat-interface__input"
          placeholder="Ask a question about the document..."
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={submitQuestion}
          disabled={isDisabled || !questionInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
