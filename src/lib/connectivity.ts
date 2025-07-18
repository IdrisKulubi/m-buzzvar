/**
 * Connectivity Manager for checking network status
 * Provides utilities for network connectivity detection
 */

import NetInfo from '@react-native-community/netinfo';

export class ConnectivityManager {
  private static isConnectedCache: boolean | null = null;
  private static lastCheckTime: number = 0;
  private static readonly CACHE_DURATION = 5000; // 5 seconds

  /**
   * Check if device is connected to the internet
   * Uses caching to avoid frequent network checks
   * @returns Promise<boolean> - true if connected, false otherwise
   */
  static async isConnected(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if it's still fresh
    if (
      this.isConnectedCache !== null && 
      now - this.lastCheckTime < this.CACHE_DURATION
    ) {
      return this.isConnectedCache;
    }

    try {
      const netInfoState = await NetInfo.fetch();
      const connected = netInfoState.isConnected && netInfoState.isInternetReachable;
      
      // Update cache
      this.isConnectedCache = connected ?? false;
      this.lastCheckTime = now;
      
      return this.isConnectedCache;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      // If check fails, assume connected (fail open)
      return true;
    }
  }

  /**
   * Get detailed network information
   * @returns Promise with network state details
   */
  static async getNetworkState() {
    try {
      return await NetInfo.fetch();
    } catch (error) {
      console.warn('Failed to get network state:', error);
      return null;
    }
  }

  /**
   * Subscribe to network state changes
   * @param callback Function to call when network state changes
   * @returns Unsubscribe function
   */
  static subscribeToNetworkState(
    callback: (isConnected: boolean) => void
  ): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      
      // Update cache
      this.isConnectedCache = connected ?? false;
      this.lastCheckTime = Date.now();
      
      callback(this.isConnectedCache);
    });

    return unsubscribe;
  }

  /**
   * Clear the connectivity cache
   * Useful when you want to force a fresh network check
   */
  static clearCache(): void {
    this.isConnectedCache = null;
    this.lastCheckTime = 0;
  }

  /**
   * Check if device is on WiFi
   * @returns Promise<boolean>
   */
  static async isOnWiFi(): Promise<boolean> {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.type === 'wifi' && netInfoState.isConnected === true;
    } catch (error) {
      console.warn('WiFi check failed:', error);
      return false;
    }
  }

  /**
   * Check if device is on cellular/mobile data
   * @returns Promise<boolean>
   */
  static async isOnCellular(): Promise<boolean> {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.type === 'cellular' && netInfoState.isConnected === true;
    } catch (error) {
      console.warn('Cellular check failed:', error);
      return false;
    }
  }

  /**
   * Get connection type as string
   * @returns Promise<string>
   */
  static async getConnectionType(): Promise<string> {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.type || 'unknown';
    } catch (error) {
      console.warn('Connection type check failed:', error);
      return 'unknown';
    }
  }
}