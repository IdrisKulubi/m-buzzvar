"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  X, 
  File, 
  Image, 
  Video, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  maxFiles?: number
  onFilesChange?: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<string[]>
  className?: string
  disabled?: boolean
  showPreview?: boolean
  dragAndDrop?: boolean
  label?: string
  description?: string
  error?: string
}

interface UploadedFile {
  file: File
  id: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  url?: string
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  onFilesChange,
  onUpload,
  className,
  disabled = false,
  showPreview = true,
  dragAndDrop = true,
  label = "Upload files",
  description,
  error,
}) => {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-4 w-4" />
    if (file.type.startsWith("video/")) return <Video className="h-4 w-4" />
    if (file.type.includes("text") || file.type.includes("document")) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`
    }
    return null
  }

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []
    const validFiles: File[] = []

    Array.from(selectedFiles).forEach((file) => {
      if (files.length + newFiles.length >= maxFiles) return

      const error = validateFile(file)
      const uploadedFile: UploadedFile = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: error ? "error" : "pending",
        error,
      }

      newFiles.push(uploadedFile)
      if (!error) validFiles.push(file)
    })

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    onFilesChange?.(validFiles)
  }

  const handleUpload = async () => {
    if (!onUpload) return

    const pendingFiles = files.filter(f => f.status === "pending")
    if (pendingFiles.length === 0) return

    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.status === "pending" ? { ...f, status: "uploading" as const } : f
    ))

    try {
      // Simulate progress for demo - in real implementation, you'd track actual upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.status === "uploading" 
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ))
      }, 200)

      const urls = await onUpload(pendingFiles.map(f => f.file))
      
      clearInterval(progressInterval)

      // Update with success status and URLs
      setFiles(prev => prev.map((f, index) => {
        if (f.status === "uploading") {
          const urlIndex = pendingFiles.findIndex(pf => pf.id === f.id)
          return {
            ...f,
            status: "success" as const,
            progress: 100,
            url: urls[urlIndex]
          }
        }
        return f
      }))
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.status === "uploading" 
          ? { ...f, status: "error" as const, error: "Upload failed" }
          : f
      ))
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    const remainingFiles = files.filter(f => f.id !== id && f.status === "success").map(f => f.file)
    onFilesChange?.(remainingFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && dragAndDrop) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!disabled && dragAndDrop) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {dragAndDrop ? "Drag and drop files here or click to browse" : "Click to browse files"}
          </p>
          <p className="text-xs text-muted-foreground">
            Max size: {formatFileSize(maxSize)} • Max files: {maxFiles}
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && showPreview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Files ({files.length})</h4>
            {onUpload && files.some(f => f.status === "pending") && (
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={disabled || files.every(f => f.status !== "pending")}
              >
                Upload Files
              </Button>
            )}
          </div>
          
          {files.map((uploadedFile) => (
            <Card key={uploadedFile.id} className="p-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getFileIcon(uploadedFile.file)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  
                  {uploadedFile.status === "uploading" && (
                    <div className="mt-2">
                      <Progress value={uploadedFile.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading... {uploadedFile.progress}%
                      </p>
                    </div>
                  )}
                  
                  {uploadedFile.error && (
                    <p className="text-xs text-destructive mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {uploadedFile.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {uploadedFile.status === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {uploadedFile.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(uploadedFile.id)
                    }}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Simplified version for single file upload
interface SingleFileUploadProps {
  accept?: string
  maxSize?: number
  onFileChange?: (file: File | null) => void
  onUpload?: (file: File) => Promise<string>
  className?: string
  disabled?: boolean
  label?: string
  error?: string
  currentFile?: File | null
}

export const SingleFileUpload: React.FC<SingleFileUploadProps> = ({
  accept,
  maxSize = 10 * 1024 * 1024,
  onFileChange,
  onUpload,
  className,
  disabled = false,
  label = "Upload file",
  error,
  currentFile,
}) => {
  return (
    <FileUpload
      accept={accept}
      multiple={false}
      maxSize={maxSize}
      maxFiles={1}
      onFilesChange={(files) => onFileChange?.(files[0] || null)}
      onUpload={onUpload ? async (files) => {
        const url = await onUpload(files[0])
        return [url]
      } : undefined}
      className={className}
      disabled={disabled}
      label={label}
      error={error}
      dragAndDrop={true}
      showPreview={true}
    />
  )
}