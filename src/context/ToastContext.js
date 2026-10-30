'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'success', title, message, duration = 4000 }) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      show: showToast,
      success: (message, title = 'Sikeres művelet') =>
        showToast({ type: 'success', title, message }),
      error: (message, title = 'Hiba történt') =>
        showToast({ type: 'error', title, message, duration: 6000 }),
      warning: (message, title = 'Figyelmeztetés') =>
        showToast({ type: 'warning', title, message, duration: 5000 }),
      info: (message, title = 'Tájékoztatás') =>
        showToast({ type: 'info', title, message }),
      dismiss: removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isInfo = toast.type === 'info';
  const isSuccess = toast.type === 'success' || (!isError && !isWarning && !isInfo);

  const colorStyles = isError
    ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-950/10'
    : isWarning
    ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-950/10'
    : isInfo
    ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-sky-950/10'
    : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-950/10';

  const iconColor = isError
    ? 'text-rose-600'
    : isWarning
    ? 'text-amber-600'
    : isInfo
    ? 'text-sky-600'
    : 'text-emerald-600';

  return (
    <div
      role={isError || isWarning ? 'alert' : 'status'}
      className={`pointer-events-auto rounded-xl border p-4 shadow-lg flex items-start gap-3 transition-all duration-200 transform translate-y-0 ${colorStyles}`}
    >
      <div className={`shrink-0 mt-0.5 ${iconColor}`}>
        {isSuccess && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {isError && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {isWarning && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {isInfo && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-bold text-sm leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs leading-relaxed opacity-90 break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
        aria-label="Értesítés bezárása"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
