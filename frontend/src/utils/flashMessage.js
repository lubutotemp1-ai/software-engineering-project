import { useRef, useCallback } from 'react';

const DEFAULT_MS = 8000;

/** Clears only the field that was set; avoids wiping a new message with an old timer. */
export function useFlashMessage(setSuccess, setError, durationMs = DEFAULT_MS) {
  const timerRef = useRef(null);

  const show = useCallback((msg, isErr = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isErr) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    timerRef.current = setTimeout(() => {
      if (isErr) setError('');
      else setSuccess('');
      timerRef.current = null;
    }, durationMs);
  }, [setSuccess, setError, durationMs]);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuccess('');
    setError('');
  }, [setSuccess, setError]);

  return { show, dismiss };
}
