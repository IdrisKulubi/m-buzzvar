import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
  url: string;
  key: string;
  success: boolean;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class CloudflareR2Service {
  private r2Client: S3Client;
  private bucketName: string;
  private accountId: string;
  private publicDomain: string;

  constructor() {
    if (
      !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
      !process.env.CLOUDFLARE_R2_BUCKET ||
      !process.env.CLOUDFLARE_ACCOUNT_ID
    ) {
      throw new Error("Missing required Cloudflare R2 environment variables");
    }

    this.r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.publicDomain =
      process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
      `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Upload a file to Cloudflare R2
   * @param file File buffer or blob
   * @param key Object key (path) in R2
   * @param contentType MIME type of the file
   * @param metadata Optional metadata
   * @returns Upload result with public URL
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
        // Set cache control for images
        CacheControl: contentType.startsWith("image/")
          ? "public, max-age=31536000"
          : "public, max-age=86400",
      });

      await this.r2Client.send(command);

      const publicUrl = `${this.publicDomain}/${key}`;

      return {
        url: publicUrl,
        key,
        success: true,
      };
    } catch (error) {
      console.error("R2 upload error:", error);
      return {
        url: "",
        key,
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Delete a file from Cloudflare R2
   * @param key Object key to delete
   * @returns Success status
   */
  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.r2Client.send(command);

      return { success: true };
    } catch (error) {
      console.error("R2 deletion error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Deletion failed",
      };
    }
  }

  /**
   * Generate a signed URL for direct upload
   * @param key Object key
   * @param contentType MIME type
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Signed upload URL
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.r2Client, command, { expiresIn });
    } catch (error) {
      console.error("Signed URL generation error:", error);
      throw new Error("Failed to generate signed URL");
    }
  }

  /**
   * Generate a signed URL for file download
   * @param key Object key
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Signed download URL
   */
  async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.r2Client, command, { expiresIn });
    } catch (error) {
      console.error("Signed download URL generation error:", error);
      throw new Error("Failed to generate signed download URL");
    }
  }

  /**
   * Get public URL for a file (if bucket allows public access)
   * @param key Object key
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    return `${this.publicDomain}/${key}`;
  }

  /**
   * Extract key from R2 URL
   * @param url R2 URL
   * @returns Object key or null if invalid
   */
  static extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error("URL parsing error:", error);
      return null;
    }
  }

  /**
   * Generate a unique key for file storage
   * @param userId User ID
   * @param originalName Original filename
   * @param prefix Optional prefix (e.g., 'vibe-checks', 'venues')
   * @returns Generated key
   */
  static generateFileKey(
    userId: string,
    originalName: string,
    prefix?: string
  ): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = originalName.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${timestamp}_${randomSuffix}.${fileExtension}`;

    if (prefix) {
      return `${prefix}/${userId}/${fileName}`;
    }

    return `${userId}/${fileName}`;
  }

  /**
   * Validate file type and size
   * @param file File to validate
   * @param allowedTypes Allowed MIME types
   * @param maxSizeMB Maximum size in MB
   * @returns Validation result
   */
  static validateFile(
    file: { size: number; type: string },
    allowedTypes: string[] = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
    ],
    maxSizeMB: number = 10
  ): { isValid: boolean; error?: string } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${
          file.type
        } is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(
          1
        )}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }

    return { isValid: true };
  }
}
