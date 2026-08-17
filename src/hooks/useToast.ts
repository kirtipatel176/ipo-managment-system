/**
 * useToast — Global toast notification system
 *
 * Provides a context-based toast queue.
 * Usage:
 *   const { toast } = useToast();
 *   toast.success("Done!");
 *   toast.error("Something went wrong.");
 *   toast.warning("Check your input.");
 *   toast.info("This action is not reversible.");
 */

import { createContext, useContext, useReducer, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number; // ms, default 4000
}

type ToastAction =
  | { type: 'ADD'; payload: Toast }
  | { type: 'REMOVE'; id: string };

// ── Reducer ───────────────────────────────────────────────────────────────────

const MAX_TOASTS = 5;

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Keep max 5 toasts; newest on top
      return [action.payload, ...state].slice(0, MAX_TOASTS);
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  dispatch: React.Dispatch<ToastAction>;
}

import React from 'react';

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  dispatch: () => undefined,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  return React.createElement(
    ToastContext.Provider,
    { value: { toasts, dispatch } },
    children
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns a `toast` helper with 4 typed methods.
 * Also returns `toasts` list and `dismiss` for the container to consume.
 */
export function useToast() {
  const { toasts, dispatch } = useContext(ToastContext);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, [dispatch]);

  const show = useCallback(
    (variant: ToastVariant, message: string, title?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload: Toast = { id, variant, message, title, duration };
      dispatch({ type: 'ADD', payload });
      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
      }
    },
    [dispatch]
  );

  const toast = {
    success: (message: string, title?: string) => show('success', message, title),
    error:   (message: string, title?: string) => show('error',   message, title),
    warning: (message: string, title?: string) => show('warning', message, title),
    info:    (message: string, title?: string) => show('info',    message, title),
  };

  return { toast, toasts, dismiss };
}
