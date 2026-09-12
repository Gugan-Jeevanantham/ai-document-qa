import React from "react";

export default function CenterOverlay({ banner }) {
  if (!banner) return null;

  if (banner.type === "loading") {
    return (
      <div className="center-overlay">
        <div className="center-overlay__blur" aria-hidden="true" />
        <div className="center-overlay__spinner-wrap">
          <span className="center-overlay__spinner" aria-hidden="true"></span>
          <p className="center-overlay__text">{banner.text}</p>
        </div>
      </div>
    );
  }

  if (banner.type === "success") {
    return (
      <div className="center-overlay">
        <div className="center-overlay__blur" aria-hidden="true" />
        <div className="center-overlay__result-wrap">
          <span className="result-icon result-icon--success">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p className="center-overlay__text">{banner.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="center-overlay">
      <div className="center-overlay__blur" aria-hidden="true" />
      <div className="center-overlay__result-wrap">
        <span className="result-icon result-icon--error">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
        <p className="center-overlay__text">{banner.text}</p>
      </div>
    </div>
  );
}