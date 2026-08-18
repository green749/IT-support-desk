import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Icon } from '../components/Icon'

const ToastContext = createContext(null)

const typeConfig = {
  success: {
    icon: 'check',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-950',
    defaultTitle: 'Success'
  },
  error: {
    icon: 'alert',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-950',
    defaultTitle: 'Error'
  },
  warning: {
    icon: 'alert',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-950',
    defaultTitle: 'Warning'
  },
  info: {
    icon: 'info',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
    titleColor: 'text-indigo-950',
    defaultTitle: 'Notification'
  }
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    const id = nextIdRef.current++
    const config = typeConfig[type] || typeConfig.info
    const toastTitle = title || config.defaultTitle
    
    setToasts((prev) => [...prev, { id, type, title: toastTitle, message, duration }])

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }
    return id
  }, [dismiss])

  const success = useCallback((message, title) => show({ type: 'success', title, message }), [show])
  const error = useCallback((message, title) => show({ type: 'error', title, message }), [show])
  const info = useCallback((message, title) => show({ type: 'info', title, message }), [show])
  const warning = useCallback((message, title) => show({ type: 'warning', title, message }), [show])

  return (
    <ToastContext.Provider value={{ show, dismiss, success, error, info, warning }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const config = typeConfig[toast.type] || typeConfig.info
          return (
            <div
              key={toast.id}
              className="pointer-events-auto w-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
              role="alert"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} ${config.iconColor} ${config.border} border`}>
                <Icon name={config.icon} size={16} />
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                  <p className={`text-xs font-bold ${config.titleColor} leading-tight`}>
                    {toast.title}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words font-medium">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => dismiss(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100/60"
                aria-label="Close"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
