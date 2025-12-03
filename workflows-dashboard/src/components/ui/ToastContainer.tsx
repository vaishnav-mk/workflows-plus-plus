import React from 'react';
import ToastComponent from './Toast';
import type { ToastContainerProps } from '@/types/components';

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent
            toast={toast}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
