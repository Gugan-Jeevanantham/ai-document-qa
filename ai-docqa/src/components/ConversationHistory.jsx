import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  { icon: "📋", text: "What is this document about?" },
  { icon: "🧩", text: "Summarize the key points" },
  { icon: "📁", text: "What are the main sections?" },
  { icon: "📄", text: "List the most important details" },
  { icon: "⚙️", text: "Are there any important dates or numbers?" },
];

function ConversationHistory({ messages, isAiLoading, onSuggestionClick, hasDocument }) {
  const bottomRef = useRef(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiLoading]);

  const formatTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const AiAvatar = () => (
    <span className="message-avatar message-avatar--ai" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8.01" y2="16" />
        <line x1="16" y1="16" x2="16.01" y2="16" />
      </svg>
    </span>
  );

  const UserAvatar = () => (
    <span className="message-avatar message-avatar--user" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );

  if (messages.length === 0) {
  return (
    <div className="conversation-history conversation-history--empty">
      <div className="ready-card">
        <div className="ready-card__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L14.5 8.5 L21 11 L14.5 13.5 L12 20 L9.5 13.5 L3 11 L9.5 8.5 Z" />
          </svg>
        </div>
        <p className="ready-card__title">Ready when you are</p>
        <p className="ready-card__subtitle">Ask anything about this document, or try one of these:</p>
        {hasDocument && (
          <div className="ready-card__suggestions">
            {SUGGESTIONS.map((s, i) => (
              <button
                type="button"
                key={i}
                className={`suggestion-chip ${i === 0 ? "suggestion-chip--primary" : ""}`}
                onClick={() => onSuggestionClick?.(s.text)}
              >
                <span className="suggestion-chip__icon">{s.icon}</span>
                <span className="suggestion-chip__text">{s.text}</span>
                <svg className="suggestion-chip__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="conversation-history">
     {messages.map((msg, idx) => (
  <div key={idx} className={`message-row message-row--${msg.role === "user" ? "user" : "ai"}`}>
    <div className={`chat-bubble chat-bubble--${msg.role === "user" ? "user" : "ai"}`}>
      {msg.role === "ai" ? (
        <div className="chat-bubble__markdown">
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
      ) : (
        <p className="chat-bubble__text">{msg.text}</p>
      )}
    </div>
  </div>
))}
      <div ref={bottomRef} />
    </div>
  );
}

export default ConversationHistory;