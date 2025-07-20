import { useState, useCallback } from 'react'
import { PhotoUploadServiceR2, PhotoUploadProgress, PhotoUploadResult } from '../services/PhotoUploadServiceR2'

export interface UseFileUploadOptions {
  onProgress?: (progress: PhotoUploadProgress) => void
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export interface UseFileUploadReturn {
  uploadPhoto: (photo: { uri: string; type: string; name: string }, userId: string) => Promise<PhotoUploadResult>
  uploadPhotos: (photos: Array<{ uri: string; type: string; name: string }>, userId: string) => Promise<PhotoUploadResult[]>
  deletePhoto: (photoUrl: string) => Promise<{ success: boolean; error: string | null }>
  isUploading: boolean
  progress: PhotoUploadProgress | null
  error: string | null
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<PhotoUploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadPhoto = useCallback(async (
    photo: { uri: string; type: string; name: string },
    userId: string
  ): Promise<PhotoUploadResult> => {
    setIsUploading(true)
    setError(null)
    setProgress(null)

    try {
      const result = await PhotoUploadServiceR2.uploadPhoto(photo, userId, {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        onProgress: (progressData) => {
          setProgress(progressData)
          options.onProgress?.(progressData)
        },
      })

      if (result.data) {
        options.onSuccess?.(result.data)
      } else if (result.error) {
        setError(result.error)
        options.onError?.(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      options.onError?.(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }, [options])

  const uploadPhotos = useCallback(async (
    photos: Array<{ uri: string; type: string; name: string }>,
    userId: string
  ): Promise<PhotoUploadResult[]> => {
    setIsUploading(true)
    setError(null)
    setProgress(null)

    try {
      const results = await PhotoUploadServiceR2.uploadPhotoBatch(photos, userId, {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        onProgress: (progressData) => {
          setProgress(progressData)
          options.onProgress?.(progressData)
        },
      })

      // Check if any uploads succeeded
      const successfulUploads = results.filter(result => result.data)
      if (successfulUploads.length > 0) {
        options.onSuccess?.(successfulUploads[0].data!)
      }

      // Check if any uploads failed
      const failedUploads = results.filter(result => result.error)
      if (failedUploads.length > 0) {
        const errorMessage = `${failedUploads.length} of ${photos.length} uploads failed`
        setError(errorMessage)
        options.onError?.(errorMessage)
      }

      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch upload failed'
      setError(errorMessage)
      options.onError?.(errorMessage)
      return photos.map(() => ({ data: null, error: errorMessage }))
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }, [options])

  const deletePhoto = useCallback(async (photoUrl: string) => {
    try {
      return await PhotoUploadServiceR2.deletePhoto(photoUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed'
      setError(errorMessage)
      options.onError?.(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [options])

  return {
    uploadPhoto,
    uploadPhotos,
    deletePhoto,
    isUploading,
    progress,
    error,
  }
}