import React from 'react';

export default function FlashBanner({ success, error, onDismiss }) {
  if (!success && !error) return null;
  const isError = Boolean(error);
  const text = error || success;
  return (
    <div
      className={`alert ${isError ? 'alert-error' : 'alert-success'} flash-banner`}
      style={{ marginBottom: 16 }}
      role="alert"
    >
      <span>{isError ? '⚠️' : '✓'} {text}</span>
      {onDismiss && (
        <button type="button" className="flash-banner-dismiss" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}
