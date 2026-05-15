'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastVariant = 'default' | 'destructive'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.variant === 'destructive'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
