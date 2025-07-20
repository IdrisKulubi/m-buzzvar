# Cloudflare R2 Migration Guide

This guide covers the migration from Supabase Storage to Cloudflare R2 for the Buzzvar platform.

## Overview

The migration replaces Supabase Storage with Cloudflare R2 for better performance, cost efficiency, and more control over file storage operations.

## Architecture Changes

### Before (Supabase Storage)
```
Mobile App → Supabase Client → Supabase Storage
Web Portal → Supabase Client → Supabase Storage
```

### After (Cloudflare R2)
```
Mobile App → API Endpoints → Cloudflare R2
Web Portal → Direct R2 Client → Cloudflare R2
```

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to both applications:

**Web Portal (.env.local):**
```bash
# Cloudflare R2 Storage Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key_here
CLOUDFLARE_R2_BUCKET=buzzvar-storage
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://storage.buzzvar.com
```

**Mobile App (.env.local):**
```bash
# Cloudflare R2 Storage Configuration (accessed via API)
EXPO_PUBLIC_R2_PUBLIC_DOMAIN=https://storage.buzzvar.com
```

### 2. Cloudflare R2 Setup

1. **Create R2 Bucket:**
   ```bash
   # Using Wrangler CLI
   wrangler r2 bucket create buzzvar-storage
   ```

2. **Configure CORS:**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Create API Token:**
   - Go to Cloudflare Dashboard → R2 → Manage R2 API tokens
   - Create token with R2:Edit permissions
   - Note the Access Key ID and Secret Access Key

4. **Set up Custom Domain (Optional):**
   - Configure a custom domain for public access
   - Update `CLOUDFLARE_R2_PUBLIC_DOMAIN` accordingly

## Migration Process

### 1. File Migration Script

Run the migration script to transfer existing files:

```bash
cd apps/web-buzzvar/buzzvar-web
npm run migrate:files-to-r2
```

This script will:
- Export files from Supabase Storage
- Upload them to Cloudflare R2
- Update database records with new URLs
- Validate the migration

### 2. Database URL Updates

Update existing URLs in the database:

```bash
npm run migrate:update-urls-to-r2
```

### 3. Code Updates

The following services have been updated:

**Web Portal:**
- `CloudflareR2Service` - Direct R2 operations
- `FileUploadService` - High-level file upload API
- `ImageOptimizer` - Image compression and optimization
- API endpoints for mobile app integration

**Mobile App:**
- `PhotoUploadServiceR2` - R2-compatible photo upload
- `CloudflareR2Service` - API-based R2 operations
- `useFileUpload` - React hook for file uploads

## API Endpoints

### Upload File
```
POST /api/storage/upload
Content-Type: multipart/form-data

Body:
- file: File to upload
- key: Storage key/path
- contentType: MIME type
```

### Delete File
```
DELETE /api/storage/delete
Content-Type: application/json

Body:
{
  "key": "path/to/file.jpg"
}
```

### Get Signed URL
```
POST /api/storage/signed-url
Content-Type: application/json

Body:
{
  "key": "path/to/file.jpg",
  "contentType": "image/jpeg",
  "type": "upload" | "download"
}
```

### Public File Access
```
GET /api/storage/public/[...key]
```

## Usage Examples

### Web Portal File Upload

```typescript
import { FileUploadService } from '@/lib/services/file-upload-service'

const uploadFile = async (file: File, userId: string) => {
  const result = await FileUploadService.uploadFile(
    file,
    userId,
    'venues', // prefix
    {
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress.percentage}%`)
      },
      maxSizeMB: 10,
      quality: 0.8,
    }
  )

  if (result.success) {
    console.log('File uploaded:', result.url)
  } else {
    console.error('Upload failed:', result.error)
  }
}
```

### Mobile App Photo Upload

```typescript
import { useFileUpload } from '../hooks/useFileUpload'

const MyComponent = () => {
  const { uploadPhoto, isUploading, progress } = useFileUpload({
    onProgress: (progress) => {
      console.log(`Upload: ${progress.percentage}%`)
    },
    onSuccess: (url) => {
      console.log('Photo uploaded:', url)
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    },
  })

  const handleUpload = async (photo: any, userId: string) => {
    await uploadPhoto(photo, userId)
  }

  return (
    // Your component JSX
  )
}
```

### Direct R2 Service Usage

```typescript
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

const r2Service = new CloudflareR2Service()

// Upload file
const buffer = Buffer.from('file content')
const result = await r2Service.uploadFile(
  buffer,
  'path/to/file.txt',
  'text/plain'
)

// Delete file
await r2Service.deleteFile('path/to/file.txt')

// Get signed URL
const signedUrl = await r2Service.getSignedUploadUrl(
  'path/to/file.txt',
  'text/plain'
)
```

## Testing

### Unit Tests

Run the test suite:

```bash
# Web portal tests
npm test

# Mobile app tests
cd ../../../m-buzzvar
npm test
```

### Integration Tests

Test R2 connectivity:

```bash
npm run test:r2-integration
```

This will test:
- File upload/download operations
- Signed URL generation
- File deletion
- Error handling
- Validation logic

## Performance Optimizations

### Image Optimization

The system automatically optimizes images:

- **Compression:** Adjustable quality (default: 0.8)
- **Resizing:** Max dimensions 1200x1200px
- **Format Conversion:** Converts to WebP for better compression
- **Progressive Loading:** Generates multiple sizes for responsive images

### Caching

- **Browser Caching:** Files served with appropriate cache headers
- **CDN Integration:** R2 integrates with Cloudflare CDN
- **Edge Caching:** Files cached at edge locations globally

## Monitoring and Maintenance

### Health Checks

Monitor R2 service health:

```typescript
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

const checkR2Health = async () => {
  try {
    const testKey = `health-check-${Date.now()}.txt`
    const buffer = Buffer.from('health check')
    
    const uploadResult = await r2Service.uploadFile(buffer, testKey, 'text/plain')
    if (uploadResult.success) {
      await r2Service.deleteFile(testKey)
      return { status: 'healthy' }
    }
    
    return { status: 'unhealthy', error: uploadResult.error }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}
```

### Cost Monitoring

Track R2 usage and costs:

- **Storage:** Monitor total storage usage
- **Operations:** Track API calls (PUT, GET, DELETE)
- **Bandwidth:** Monitor data transfer
- **Requests:** Track request patterns

### Backup Strategy

Implement backup procedures:

1. **Regular Backups:** Schedule periodic backups of critical files
2. **Cross-Region Replication:** Consider replicating to multiple regions
3. **Database Backup:** Ensure file URLs are included in database backups

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Verify CORS configuration in R2 bucket
   - Check allowed origins and methods

2. **Authentication Errors:**
   - Verify API credentials
   - Check token permissions

3. **Upload Failures:**
   - Check file size limits
   - Verify content type restrictions
   - Monitor network connectivity

4. **URL Access Issues:**
   - Verify public domain configuration
   - Check signed URL expiration
   - Validate file permissions

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.R2_DEBUG = 'true'

// Or enable in code
const r2Service = new CloudflareR2Service()
r2Service.enableDebug(true)
```

## Migration Rollback

If rollback is needed:

1. **Stop New Uploads:** Temporarily disable R2 uploads
2. **Restore Supabase:** Re-enable Supabase Storage
3. **Update URLs:** Run rollback script to restore original URLs
4. **Verify Functionality:** Test all file operations

```bash
npm run migrate:rollback-to-supabase
```

## Security Considerations

### Access Control

- **Signed URLs:** Use signed URLs for temporary access
- **API Authentication:** Secure API endpoints with proper auth
- **File Validation:** Validate file types and sizes
- **Rate Limiting:** Implement upload rate limiting

### Data Protection

- **Encryption:** Files encrypted at rest in R2
- **Access Logs:** Monitor file access patterns
- **Audit Trail:** Log all file operations
- **Compliance:** Ensure GDPR/privacy compliance

## Performance Metrics

Expected improvements with R2:

- **Upload Speed:** 2-3x faster uploads
- **Global Access:** Reduced latency via CDN
- **Cost Reduction:** 50-70% lower storage costs
- **Reliability:** 99.9% uptime SLA

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Cloudflare R2 documentation
3. Contact the development team
4. File issues in the project repository

## Changelog

### v1.0.0 - Initial R2 Migration
- Implemented CloudflareR2Service
- Created file upload APIs
- Added image optimization
- Migrated existing files
- Updated mobile and web apps
- Added comprehensive testing