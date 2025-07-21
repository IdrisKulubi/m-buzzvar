import * as ImageManipulator from 'expo-image-manipulator';

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

export class PhotoUploadService {
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly DEFAULT_MAX_WIDTH = 1200;
  private static readonly DEFAULT_MAX_HEIGHT = 1200;
  private static readonly MAX_FILE_SIZE_MB = 5;

  /**
   * Upload a photo with compression and progress tracking
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

      onProgress?.({ loaded: 25, total: 100, percentage: 25 });

      // Step 2: Validate file size
      const fileSizeResult = await this.validateFileSize(compressedImage.uri);
      if (!fileSizeResult.isValid) {
        return {
          data: null,
          error: fileSizeResult.error || 'File size validation failed',
        };
      }

      onProgress?.({ loaded: 30, total: 100, percentage: 30 });

      // Step 3: Generate unique filename
      const fileName = this.generateFileName(userId, photo.name);

      // Step 4: Convert to blob and upload
      const blob = await this.uriToBlob(compressedImage.uri);
      
      onProgress?.({ loaded: 50, total: 100, percentage: 50 });

      // Step 5: Upload to Supabase Storage with progress tracking
      const uploadResult = await this.uploadToStorage(fileName, blob, photo.type, onProgress);
      
      if (uploadResult.error) {
        return { data: null, error: uploadResult.error };
      }

      // Step 6: Get public URL
      const publicUrl = this.getPublicUrl(fileName);
      
      onProgress?.({ loaded: 100, total: 100, percentage: 100 });

      return { data: publicUrl, error: null };
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
   * Generate unique filename for photo
   * @param userId User ID
   * @param originalName Original filename
   * @returns Generated filename
   */
  private static generateFileName(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    return `vibe-checks/${userId}/${timestamp}_${randomSuffix}.${fileExtension}`;
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
   * Upload blob to Supabase Storage
   * @param fileName Target filename
   * @param blob File blob
   * @param contentType Content type
   * @param onProgress Progress callback
   * @returns Upload result
   */
  private static async uploadToStorage(
    fileName: string,
    blob: Blob,
    contentType: string,
    onProgress?: (progress: PhotoUploadProgress) => void
  ): Promise<{ data: any; error: string | null }> {
    try {
      // Note: Supabase client doesn't support progress tracking directly
      // We simulate progress for better UX
      onProgress?.({ loaded: 60, total: 100, percentage: 60 });

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType,
          upsert: false,
        });

      onProgress?.({ loaded: 90, total: 100, percentage: 90 });

      if (error) {
        console.error('Supabase upload error:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Storage upload error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get public URL for uploaded file
   * @param fileName Filename in storage
   * @returns Public URL
   */
  private static getPublicUrl(fileName: string): string {
    const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
    return data.publicUrl;
  }

  /**
   * Delete a photo from storage
   * @param fileName Filename to delete
   * @returns Promise with deletion result
   */
  static async deletePhoto(fileName: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (error) {
        console.error('Photo deletion error:', error);
        return { success: false, error: error.message };
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
   * Extract filename from public URL
   * @param publicUrl Public URL from Supabase
   * @returns Filename or null if extraction fails
   */
  static extractFileNameFromUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      const pathParts = url.pathname.split('/');
      // URL format: /storage/v1/object/public/photos/vibe-checks/userId/filename
      const photoIndex = pathParts.indexOf('photos');
      if (photoIndex !== -1 && photoIndex < pathParts.length - 1) {
        // Return the path after 'photos/'
        return pathParts.slice(photoIndex + 1).join('/');
      }
      return null;
    } catch (error) {
      console.error('URL parsing error:', error);
      return null;
    }
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
}