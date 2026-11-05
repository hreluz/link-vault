'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastVariant = 'default' | 'destructive'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  onClick?: () => void
}

interface ToastOptions {
  duration?: number
  onClick?: () => void
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, options?: ToastOptions) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => '', dismissToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, variant: ToastVariant = 'default', options?: ToastOptions): string => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, variant, onClick: options?.onClick }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), options?.duration ?? 2500)
    return id
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, dismissToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end"
      >
        {toasts.map(toast => {
          const className = `pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.variant === 'destructive'
              ? 'bg-red-600 text-white'
              : 'bg-surface-900 text-white'
          }`
          // A clickable toast (e.g. "tap to undo") is a real button so keyboard
          // users can reach and activate it.
          return toast.onClick ? (
            <button
              key={toast.id}
              type="button"
              onClick={toast.onClick}
              className={`${className} focus-ring cursor-pointer text-left active:opacity-80`}
            >
              {toast.message}
            </button>
          ) : (
            <div key={toast.id} className={className}>
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
