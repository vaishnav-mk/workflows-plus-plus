import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { ToastType, Toast } from '@/types/ui';
import type { ToastProps } from '@/types/components';

export type { ToastType, Toast };

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration ?? 2500);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-700'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`w-80 max-w-sm ${styles.bg} border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform`}
      style={{
        animation: 'toastSlideIn 0.3s ease-out',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${styles.titleColor}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`mt-1 text-sm ${styles.messageColor} break-words`}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          onClick={() => onRemove(toast.id)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ToastComponent;
