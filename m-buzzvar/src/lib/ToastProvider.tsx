import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import Toast, { ToastData } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (options: ToastData) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((options: ToastData) => {
    setToast(options);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const contextValue = useMemo(() => ({
    showToast
  }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <Toast
          {...toast}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}; 