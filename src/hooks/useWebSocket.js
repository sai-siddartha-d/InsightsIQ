// src/hooks/useWebSocket.js
import { useEffect, useRef } from 'react';
import { subscribe } from '../mocks/store';


/**
 * Subscribe to plan-change events.
 *
 * The real app opened a WebSocket to the backend so every open tab refreshed
 * when someone edited the plan. Here the mock store plays that role: it emits
 * the same event types (`entries_changed`, `periods_changed`) after each
 * mutation, and mirrors them to other browser tabs through `localStorage`.
 * Open the demo twice side by side and the live-refresh behaviour still works.
 *
 * @param {Object} handlers - { event_type: (payload) => void }
 */
export function useWebSocket(handlers) {
  const handlersRef = useRef(handlers);

  // Keep the ref current without re-subscribing on every render.
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    return subscribe((type, payload) => {
      handlersRef.current?.[type]?.(payload);
    });
  }, []);
}
