import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export interface ImageCacheOptions {
  maxCacheSize?: number; // in MB
  maxAge?: number; // in milliseconds
  quality?: number; // 0-1
  priority?: 'low' | 'normal' | 'high';
}

export interface CachedImageInfo {
  uri: string;
  localPath: string;
  size: number;
  timestamp: number;
  lastAccessed: number;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Optimized image caching service with lazy loading and memory management
 */
export class ImageCacheService {
  private static readonly CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
  private static readonly CACHE_INDEX_KEY = 'image_cache_index';
  private static readonly DEFAULT_MAX_CACHE_SIZE = 100; // 100MB
  private static readonly DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly CLEANUP_THRESHOLD = 0.8; // Clean up when 80% full

  private static cacheIndex: Map<string, CachedImageInfo> = new Map();
  private static downloadQueue: Map<string, Promise<string>> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the image cache service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Load cache index
      await this.loadCacheIndex();

      // Perform initial cleanup
      await this.performCleanup();

      this.isInitialized = true;
      console.log('Image cache service initialized');
    } catch (error) {
      console.error('Failed to initialize image cache service:', error);
    }
  }

  /**
   * Get cached image URI or download and cache if not available
   * @param imageUrl Original image URL
   * @param options Caching options
   * @returns Promise with local cached image URI
   */
  static async getCachedImage(
    imageUrl: string,
    options: ImageCacheOptions = {}
  ): Promise<string> {
    if (!imageUrl) {
      return imageUrl;
    }

    await this.initialize();

    const cacheKey = this.generateCacheKey(imageUrl);
    const cachedInfo = this.cacheIndex.get(cacheKey);

    // Check if we have a valid cached version
    if (cachedInfo && await this.isCacheValid(cachedInfo, options)) {
      // Update last accessed time
      cachedInfo.lastAccessed = Date.now();
      await this.saveCacheIndex();
      return cachedInfo.localPath;
    }

    // Check if download is already in progress
    const existingDownload = this.downloadQueue.get(cacheKey);
    if (existingDownload) {
      return await existingDownload;
    }

    // Start new download
    const downloadPromise = this.downloadAndCache(imageUrl, cacheKey, options);
    this.downloadQueue.set(cacheKey, downloadPromise);

    try {
      const localPath = await downloadPromise;
      return localPath;
    } finally {
      this.downloadQueue.delete(cacheKey);
    }
  }

  /**
   * Preload images for better performance
   * @param imageUrls Array of image URLs to preload
   * @param options Caching options
   */
  static async preloadImages(
    imageUrls: string[],
    options: ImageCacheOptions = {}
  ): Promise<void> {
    const preloadPromises = imageUrls
      .filter(url => url && url.trim() !== '')
      .map(url => this.getCachedImage(url, { ...options, priority: 'low' }));

    try {
      await Promise.allSettled(preloadPromises);
      console.log(`Preloaded ${imageUrls.length} images`);
    } catch (error) {
      console.warn('Error preloading images:', error);
    }
  }

  /**
   * Clear specific image from cache
   * @param imageUrl Image URL to remove from cache
   */
  static async clearImage(imageUrl: string): Promise<void> {
    const cacheKey = this.generateCacheKey(imageUrl);
    const cachedInfo = this.cacheIndex.get(cacheKey);

    if (cachedInfo) {
      try {
        // Remove file
        const fileInfo = await FileSystem.getInfoAsync(cachedInfo.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cachedInfo.localPath);
        }

        // Remove from index
        this.cacheIndex.delete(cacheKey);
        await this.saveCacheIndex();
      } catch (error) {
        console.warn('Error clearing cached image:', error);
      }
    }
  }

  /**
   * Clear all cached images
   */
  static async clearAll(): Promise<void> {
    try {
      // Remove cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR);
      }

      // Clear index
      this.cacheIndex.clear();
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);

      // Recreate cache directory
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });

      console.log('Image cache cleared');
    } catch (error) {
      console.error('Error clearing image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalSize: number;
    totalFiles: number;
    oldestFile: number;
    newestFile: number;
    hitRate: number;
  }> {
    await this.initialize();

    let totalSize = 0;
    let oldestFile = Date.now();
    let newestFile = 0;

    for (const info of this.cacheIndex.values()) {
      totalSize += info.size;
      oldestFile = Math.min(oldestFile, info.timestamp);
      newestFile = Math.max(newestFile, info.timestamp);
    }

    return {
      totalSize: totalSize / (1024 * 1024), // Convert to MB
      totalFiles: this.cacheIndex.size,
      oldestFile,
      newestFile,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }

  /**
   * Perform cache cleanup based on size and age
   */
  static async performCleanup(force: boolean = false): Promise<void> {
    const stats = await this.getCacheStats();
    const maxSize = this.DEFAULT_MAX_CACHE_SIZE;

    if (!force && stats.totalSize < maxSize * this.CLEANUP_THRESHOLD) {
      return;
    }

    console.log(`Performing cache cleanup. Current size: ${stats.totalSize.toFixed(2)}MB`);

    // Sort by priority and last accessed time
    const sortedEntries = Array.from(this.cacheIndex.entries()).sort((a, b) => {
      const [, infoA] = a;
      const [, infoB] = b;

      // Priority order: low < normal < high
      const priorityOrder = { low: 0, normal: 1, high: 2 };
      const priorityDiff = priorityOrder[infoA.priority] - priorityOrder[infoB.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by last accessed time (older first)
      return infoA.lastAccessed - infoB.lastAccessed;
    });

    let currentSize = stats.totalSize;
    const targetSize = maxSize * 0.7; // Clean up to 70% of max size

    for (const [cacheKey, info] of sortedEntries) {
      if (currentSize <= targetSize) {
        break;
      }

      try {
        // Check if file still exists
        const fileInfo = await FileSystem.getInfoAsync(info.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(info.localPath);
        }

        currentSize -= info.size / (1024 * 1024);
        this.cacheIndex.delete(cacheKey);
      } catch (error) {
        console.warn('Error removing cached file during cleanup:', error);
      }
    }

    await this.saveCacheIndex();
    console.log(`Cache cleanup completed. New size: ${currentSize.toFixed(2)}MB`);
  }

  /**
   * Download and cache an image
   */
  private static async downloadAndCache(
    imageUrl: string,
    cacheKey: string,
    options: ImageCacheOptions
  ): Promise<string> {
    try {
      const localPath = `${this.CACHE_DIR}${cacheKey}`;
      
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }

      // Add to cache index
      const cachedInfo: CachedImageInfo = {
        uri: imageUrl,
        localPath,
        size: fileInfo.size || 0,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        priority: options.priority || 'normal',
      };

      this.cacheIndex.set(cacheKey, cachedInfo);
      await this.saveCacheIndex();

      // Check if cleanup is needed
      const stats = await this.getCacheStats();
      if (stats.totalSize > this.DEFAULT_MAX_CACHE_SIZE * this.CLEANUP_THRESHOLD) {
        // Perform cleanup in background
        this.performCleanup().catch(error => {
          console.warn('Background cleanup failed:', error);
        });
      }

      return localPath;
    } catch (error) {
      console.error('Error downloading and caching image:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Check if cached image is still valid
   */
  private static async isCacheValid(
    cachedInfo: CachedImageInfo,
    options: ImageCacheOptions
  ): Promise<boolean> {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(cachedInfo.localPath);
    if (!fileInfo.exists) {
      this.cacheIndex.delete(this.generateCacheKey(cachedInfo.uri));
      return false;
    }

    // Check age
    const maxAge = options.maxAge || this.DEFAULT_MAX_AGE;
    const age = Date.now() - cachedInfo.timestamp;
    
    if (age > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key from image URL
   */
  private static generateCacheKey(imageUrl: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < imageUrl.length; i++) {
      const char = imageUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Get file extension
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    
    return `${Math.abs(hash)}.${extension}`;
  }

  /**
   * Load cache index from AsyncStorage
   */
  private static async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexData) {
        const indexArray: [string, CachedImageInfo][] = JSON.parse(indexData);
        this.cacheIndex = new Map(indexArray);
      }
    } catch (error) {
      console.warn('Error loading cache index:', error);
      this.cacheIndex = new Map();
    }
  }

  /**
   * Save cache index to AsyncStorage
   */
  private static async saveCacheIndex(): Promise<void> {
    try {
      const indexArray = Array.from(this.cacheIndex.entries());
      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(indexArray));
    } catch (error) {
      console.warn('Error saving cache index:', error);
    }
  }
}

/**
 * React Native component for optimized image loading with caching
 */
export interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  cacheOptions?: ImageCacheOptions;
  lazy?: boolean;
  threshold?: number; // For lazy loading
}

/**
 * Hook for using cached images
 */
export const useCachedImage = (
  imageUrl: string,
  options: ImageCacheOptions = {}
): {
  cachedUri: string | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [cachedUri, setCachedUri] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const uri = await ImageCacheService.getCachedImage(imageUrl, options);
        
        if (isMounted) {
          setCachedUri(uri);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
          setCachedUri(imageUrl); // Fallback to original URL
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, options]);

  return { cachedUri, isLoading, error };
};

