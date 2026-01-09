import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
          bg: 'bg-white border-green-200',
          headerBg: 'bg-green-50',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700'
        };
      case 'error':
        return {
          bg: 'bg-white border-red-200',
          headerBg: 'bg-red-50',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-white border-yellow-200',
          headerBg: 'bg-yellow-50',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-white border-blue-200',
          headerBg: 'bg-blue-50',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
      default:
        return {
          bg: 'bg-white border-gray-200',
          headerBg: 'bg-gray-50',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-700'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`w-80 max-w-sm ${styles.bg} border rounded-2xl overflow-hidden transition-all duration-300 ease-in-out transform`}
      style={{
        animation: 'toastSlideIn 0.3s ease-out',
      }}
    >
      <div className={`px-4 py-3 ${styles.headerBg} border-b border-gray-200 flex items-center justify-between rounded-t-2xl`}>
        <p className={`text-sm font-semibold ${styles.titleColor}`}>
          {toast.title}
        </p>
        <button
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          onClick={() => onRemove(toast.id)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {toast.message && (
        <div className="px-4 py-3 rounded-b-2xl">
          <p className={`text-sm ${styles.messageColor} break-words`}>
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToastComponent;
