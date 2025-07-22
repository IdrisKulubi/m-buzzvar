import * as ImageManipulator from 'expo-image-manipulator';
import { CloudflareR2Service } from '../lib/storage/cloudflare-r2-service';

export interface PhotoUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PhotoUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: PhotoUploadProgress) => void;
}

export interface PhotoUploadResult {
  data: string | null;
  error: string | null;
}

export class PhotoUploadServiceR2 {
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly DEFAULT_MAX_WIDTH = 1200;
  private static readonly DEFAULT_MAX_HEIGHT = 1200;
  private static readonly MAX_FILE_SIZE_MB = 5;
  private static r2Service = new CloudflareR2Service();

  /**
   * Upload a photo with compression and progress tracking to Cloudflare R2
   * @param photo Photo data from image picker
   * @param userId User ID for file organization
   * @param options Upload options including compression settings and progress callback
   * @returns Promise with upload result
   */
  static async uploadPhoto(
    photo: { uri: string; type: string; name: string },
    userId: string,
    options: PhotoUploadOptions = {}
  ): Promise<PhotoUploadResult> {
    try {
      const {
        quality = this.DEFAULT_QUALITY,
        maxWidth = this.DEFAULT_MAX_WIDTH,
        maxHeight = this.DEFAULT_MAX_HEIGHT,
        onProgress,
      } = options;

      // Step 1: Compress the image
      onProgress?.({ loaded: 0, total: 100, percentage: 0 });
      
      const compressedImage = await this.compressImage(photo.uri, {
        quality,
        maxWidth,
        maxHeight,
      });

      onProgress?.({ loaded: 20, total: 100, percentage: 20 });

      // Step 2: Validate file size
      const fileSizeResult = await this.validateFileSize(compressedImage.uri);
      if (!fileSizeResult.isValid) {
        return {
          data: null,
          error: fileSizeResult.error || 'File size validation failed',
        };
      }

      onProgress?.({ loaded: 25, total: 100, percentage: 25 });

      // Step 3: Generate unique filename
      const fileName = CloudflareR2Service.generateFileKey(userId, photo.name, 'vibe-checks');

      // Step 4: Convert to blob
      const blob = await this.uriToBlob(compressedImage.uri);
      
      onProgress?.({ loaded: 40, total: 100, percentage: 40 });

      // Step 5: Upload to Cloudflare R2 with progress tracking
      const uploadResult = await this.r2Service.uploadFile(
        blob, 
        fileName, 
        photo.type || 'image/jpeg',
        (progress) => {
          // Map R2 progress to our progress (40-100%)
          const mappedProgress = 40 + (progress.percentage * 0.6);
          onProgress?.({ 
            loaded: mappedProgress, 
            total: 100, 
            percentage: mappedProgress 
          });
        }
      );
      
      if (!uploadResult.success) {
        return { data: null, error: uploadResult.error || 'Upload failed' };
      }

      onProgress?.({ loaded: 100, total: 100, percentage: 100 });

      return { data: uploadResult.url, error: null };
    } catch (error) {
      console.error('Photo upload error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to upload photo. Please try again.',
      };
    }
  }

  /**
   * Compress an image using expo-image-manipulator
   * @param uri Image URI
   * @param options Compression options
   * @returns Promise with compressed image result
   */
  private static async compressImage(
    uri: string,
    options: {
      quality: number;
      maxWidth: number;
      maxHeight: number;
    }
  ): Promise<ImageManipulator.ImageResult> {
    try {
      // Get image info first to determine if resizing is needed
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      const actions: ImageManipulator.Action[] = [];

      // Add resize action if image is larger than max dimensions
      if (imageInfo.width > options.maxWidth || imageInfo.height > options.maxHeight) {
        actions.push({
          resize: {
            width: Math.min(imageInfo.width, options.maxWidth),
            height: Math.min(imageInfo.height, options.maxHeight),
          },
        });
      }

      // Compress the image
      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        {
          compress: options.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result;
    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Validate file size
   * @param uri File URI
   * @returns Validation result
   */
  private static async validateFileSize(uri: string): Promise<{
    isValid: boolean;
    error?: string;
    sizeInMB?: number;
  }> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const sizeInMB = blob.size / (1024 * 1024);

      if (sizeInMB > this.MAX_FILE_SIZE_MB) {
        return {
          isValid: false,
          error: `File size (${sizeInMB.toFixed(1)}MB) exceeds maximum allowed size of ${this.MAX_FILE_SIZE_MB}MB`,
          sizeInMB,
        };
      }

      return { isValid: true, sizeInMB };
    } catch (error) {
      console.error('File size validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate file size',
      };
    }
  }

  /**
   * Convert URI to Blob
   * @param uri File URI
   * @returns Promise with Blob
   */
  private static async uriToBlob(uri: string): Promise<Blob> {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('URI to blob conversion error:', error);
      throw new Error('Failed to process image file');
    }
  }

  /**
   * Delete a photo from R2 storage
   * @param photoUrl Photo URL to delete
   * @returns Promise with deletion result
   */
  static async deletePhoto(photoUrl: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const key = CloudflareR2Service.extractKeyFromUrl(photoUrl);
      if (!key) {
        return { success: false, error: 'Invalid photo URL' };
      }

      const result = await this.r2Service.deleteFile(key);
      
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to delete photo' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Photo deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete photo',
      };
    }
  }

  /**
   * Extract filename from R2 URL
   * @param publicUrl Public URL from R2
   * @returns Filename or null if extraction fails
   */
  static extractFileNameFromUrl(publicUrl: string): string | null {
    return CloudflareR2Service.extractKeyFromUrl(publicUrl);
  }

  /**
   * Get image dimensions from URI
   * @param uri Image URI
   * @returns Promise with dimensions
   */
  static async getImageDimensions(uri: string): Promise<{
    width: number;
    height: number;
  } | null> {
    try {
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return {
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Get image dimensions error:', error);
      return null;
    }
  }

  /**
   * Upload multiple photos in batch
   * @param photos Array of photo data
   * @param userId User ID
   * @param options Upload options
   * @returns Promise with batch upload results
   */
  static async uploadPhotoBatch(
    photos: { uri: string; type: string; name: string }[],
    userId: string,
    options: PhotoUploadOptions = {}
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const batchProgress = (progress: PhotoUploadProgress) => {
        const overallProgress = ((i / photos.length) * 100) + (progress.percentage / photos.length);
        options.onProgress?.({
          loaded: overallProgress,
          total: 100,
          percentage: overallProgress,
        });
      };

      const result = await this.uploadPhoto(photo, userId, {
        ...options,
        onProgress: batchProgress,
      });
      
      results.push(result);
      
      // Stop on first error if desired
      if (!result.data && options.onProgress) {
        break;
      }
    }
    
    return results;
  }
}