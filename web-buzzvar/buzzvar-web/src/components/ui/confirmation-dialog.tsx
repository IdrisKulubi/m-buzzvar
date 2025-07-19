"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: "default" | "destructive" | "warning" | "info"
  loading?: boolean
  disabled?: boolean
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <XCircle className="h-6 w-6 text-destructive" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />
      default:
        return <CheckCircle className="h-6 w-6 text-green-600" />
    }
  }

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Error handling should be done by the parent component
      console.error("Confirmation action failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            {getIcon()}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading || loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disabled || isLoading || loading}
            className={cn(
              variant === "destructive" && "bg-destructive hover:bg-destructive/90",
              variant === "warning" && "bg-yellow-600 hover:bg-yellow-700"
            )}
          >
            {(isLoading || loading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for easier confirmation dialog usage
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive" | "warning" | "info"
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  const showConfirmation = (config: Omit<typeof dialogState, "open">) => {
    setDialogState({ ...config, open: true })
  }

  const hideConfirmation = () => {
    setDialogState(prev => ({ ...prev, open: false }))
  }

  const ConfirmationDialogComponent = () => (
    <ConfirmationDialog
      open={dialogState.open}
      onOpenChange={hideConfirmation}
      title={dialogState.title}
      description={dialogState.description}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      onConfirm={dialogState.onConfirm}
      onCancel={dialogState.onCancel}
    />
  )

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent,
  }
}

// Predefined confirmation dialogs for common actions
export const useDeleteConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  const showDeleteConfirmation = (
    itemName: string,
    onConfirm: () => void | Promise<void>
  ) => {
    showConfirmation({
      title: "Delete Confirmation",
      description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm,
    })
  }

  return { showDeleteConfirmation, ConfirmationDialog }
}

export const useSaveConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  const showSaveConfirmation = (
    message: string,
    onConfirm: () => void | Promise<void>
  ) => {
    showConfirmation({
      title: "Save Changes",
      description: message,
      confirmText: "Save",
      cancelText: "Cancel",
      variant: "default",
      onConfirm,
    })
  }

  return { showSaveConfirmation, ConfirmationDialog }
}

export const useDiscardConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  const showDiscardConfirmation = (
    onConfirm: () => void | Promise<void>
  ) => {
    showConfirmation({
      title: "Discard Changes",
      description: "You have unsaved changes. Are you sure you want to discard them?",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      variant: "warning",
      onConfirm,
    })
  }

  return { showDiscardConfirmation, ConfirmationDialog }
}