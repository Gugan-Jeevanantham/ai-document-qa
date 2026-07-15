import React, { useEffect, useRef } from "react";

/**
 * ConversationHistory.jsx
 * ----------------------------------------------------------------------
 * Props:
 * - messages: [{ role: 'user'|'ai', text: string, timestamp: string }]
 * - isAiLoading: boolean -- shown as a temporary "typing" bubble
 *
 * Responsibilities:
 * - Render every message as a chat bubble (user right-aligned, AI left).
 * - Auto-scroll to the latest message whenever `messages` changes.
 * - Purely presentational — receives everything via props.
 */
function ConversationHistory({ messages, isAiLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiLoading]);

  const formatTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  if (messages.length === 0) {
    return (
      <div className="conversation-history conversation-history--empty">
        <p>No questions yet. Ask something about the uploaded document.</p>
      </div>
    );
  }

  return (
    <div className="conversation-history">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`chat-bubble chat-bubble--${msg.role === "user" ? "user" : "ai"}`}
        >
          <p className="chat-bubble__text">{msg.text}</p>
          {msg.timestamp && (
            <span className="chat-bubble__time">{formatTime(msg.timestamp)}</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default ConversationHistory;
