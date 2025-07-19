"use client"

import * as React from "react"
import { toast as sonnerToast, Toaster } from "sonner"
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react"

// Enhanced toast functions with icons and better styling
export const toast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <CheckCircle className="h-4 w-4" />,
    })
  },

  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 6000,
      icon: <XCircle className="h-4 w-4" />,
    })
  },

  warning: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <AlertCircle className="h-4 w-4" />,
    })
  },

  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info className="h-4 w-4" />,
    })
  },

  loading: (message: string, options?: { description?: string }) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: {
        title: loading,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      },
      success: (data) => ({
        title: typeof success === "function" ? success(data) : success,
        icon: <CheckCircle className="h-4 w-4" />,
      }),
      error: (err) => ({
        title: typeof error === "function" ? error(err) : error,
        icon: <XCircle className="h-4 w-4" />,
      }),
    })
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },

  // Custom toast with action button
  custom: (
    message: string,
    options?: {
      description?: string
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
      variant?: "default" | "success" | "error" | "warning" | "info"
    }
  ) => {
    const getIcon = () => {
      switch (options?.variant) {
        case "success":
          return <CheckCircle className="h-4 w-4" />
        case "error":
          return <XCircle className="h-4 w-4" />
        case "warning":
          return <AlertCircle className="h-4 w-4" />
        case "info":
          return <Info className="h-4 w-4" />
        default:
          return undefined
      }
    }

    return sonnerToast(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: getIcon(),
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    })
  },
}

// Toast provider component
interface ToastProviderProps {
  children: React.ReactNode
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center"
  theme?: "light" | "dark" | "system"
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = "bottom-right",
  theme = "system",
}) => {
  return (
    <>
      {children}
      <Toaster
        position={position}
        theme={theme}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
    </>
  )
}

// Hook for toast notifications with common patterns
export const useToast = () => {
  const showSuccess = (message: string, description?: string) => {
    toast.success(message, { description })
  }

  const showError = (message: string, description?: string) => {
    toast.error(message, { description })
  }

  const showWarning = (message: string, description?: string) => {
    toast.warning(message, { description })
  }

  const showInfo = (message: string, description?: string) => {
    toast.info(message, { description })
  }

  const showLoading = (message: string, description?: string) => {
    return toast.loading(message, { description })
  }

  const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  }

  // Common toast patterns
  const showSaveSuccess = (itemName?: string) => {
    showSuccess(
      "Saved successfully",
      itemName ? `${itemName} has been saved` : undefined
    )
  }

  const showDeleteSuccess = (itemName?: string) => {
    showSuccess(
      "Deleted successfully",
      itemName ? `${itemName} has been deleted` : undefined
    )
  }

  const showUpdateSuccess = (itemName?: string) => {
    showSuccess(
      "Updated successfully",
      itemName ? `${itemName} has been updated` : undefined
    )
  }

  const showCreateSuccess = (itemName?: string) => {
    showSuccess(
      "Created successfully",
      itemName ? `${itemName} has been created` : undefined
    )
  }

  const showNetworkError = () => {
    showError(
      "Network error",
      "Please check your connection and try again"
    )
  }

  const showValidationError = (message?: string) => {
    showError(
      "Validation error",
      message || "Please check your input and try again"
    )
  }

  const showPermissionError = () => {
    showError(
      "Permission denied",
      "You don't have permission to perform this action"
    )
  }

  const showUnsavedChanges = (onSave: () => void, onDiscard: () => void) => {
    toast.custom("You have unsaved changes", {
      description: "Would you like to save them?",
      duration: 10000,
      action: {
        label: "Save",
        onClick: onSave,
      },
      variant: "warning",
    })
  }

  return {
    toast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showPromise,
    showSaveSuccess,
    showDeleteSuccess,
    showUpdateSuccess,
    showCreateSuccess,
    showNetworkError,
    showValidationError,
    showPermissionError,
    showUnsavedChanges,
  }
}