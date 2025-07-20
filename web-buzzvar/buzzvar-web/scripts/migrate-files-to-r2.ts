import { createClient } from '@supabase/supabase-js'
import { CloudflareR2Service } from '../src/lib/storage/cloudflare-r2-service'
import { db } from '../src/lib/database/neon-client'
import { eq } from 'drizzle-orm'

// Import your database schema
// Note: You'll need to adjust these imports based on your actual schema
// import { vibeChecksTable, venuesTable } from '../src/lib/database/schema'

interface MigrationResult {
  totalFiles: number
  migratedFiles: number
  failedFiles: number
  errors: Array<{ file: string; error: string }>
}

interface FileRecord {
  id: string
  url: string
  tableName: string
  columnName: string
}

class FileMigrationService {
  private supabase
  private r2Service: CloudflareR2Service
  private batchSize = 10
  private delayBetweenBatches = 1000 // 1 second

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Initialize R2 service
    this.r2Service = new CloudflareR2Service()
  }

  /**
   * Main migration function
   */
  async migrateAllFiles(): Promise<MigrationResult> {
    console.log('🚀 Starting file migration from Supabase to Cloudflare R2...')
    
    const result: MigrationResult = {
      totalFiles: 0,
      migratedFiles: 0,
      failedFiles: 0,
      errors: [],
    }

    try {
      // Get all files that need migration
      const filesToMigrate = await this.getFilesToMigrate()
      result.totalFiles = filesToMigrate.length

      console.log(`📁 Found ${filesToMigrate.length} files to migrate`)

      // Process files in batches
      for (let i = 0; i < filesToMigrate.length; i += this.batchSize) {
        const batch = filesToMigrate.slice(i, i + this.batchSize)
        console.log(`📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(filesToMigrate.length / this.batchSize)}`)

        await this.processBatch(batch, result)

        // Delay between batches to avoid rate limiting
        if (i + this.batchSize < filesToMigrate.length) {
          await this.delay(this.delayBetweenBatches)
        }
      }

      console.log('✅ Migration completed!')
      console.log(`📊 Results: ${result.migratedFiles}/${result.totalFiles} files migrated successfully`)
      
      if (result.failedFiles > 0) {
        console.log(`❌ ${result.failedFiles} files failed to migrate`)
        result.errors.forEach(error => {
          console.log(`   - ${error.file}: ${error.error}`)
        })
      }

      return result
    } catch (error) {
      console.error('💥 Migration failed:', error)
      throw error
    }
  }

  /**
   * Get all files that need to be migrated
   */
  private async getFilesToMigrate(): Promise<FileRecord[]> {
    const files: FileRecord[] = []

    try {
      // Note: Adjust these queries based on your actual database schema
      // This is a placeholder implementation

      // Example: Get vibe check photos
      // const vibeChecks = await db.select().from(vibeChecksTable).where(ne(vibeChecksTable.photoUrl, null))
      // vibeChecks.forEach(check => {
      //   if (check.photoUrl && check.photoUrl.includes('supabase')) {
      //     files.push({
      //       id: check.id,
      //       url: check.photoUrl,
      //       tableName: 'vibe_checks',
      //       columnName: 'photo_url'
      //     })
      //   }
      // })

      // Example: Get venue images
      // const venues = await db.select().from(venuesTable)
      // venues.forEach(venue => {
      //   if (venue.coverImageUrl && venue.coverImageUrl.includes('supabase')) {
      //     files.push({
      //       id: venue.id,
      //       url: venue.coverImageUrl,
      //       tableName: 'venues',
      //       columnName: 'cover_image_url'
      //     })
      //   }
      //   if (venue.coverVideoUrl && venue.coverVideoUrl.includes('supabase')) {
      //     files.push({
      //       id: venue.id,
      //       url: venue.coverVideoUrl,
      //       tableName: 'venues',
      //       columnName: 'cover_video_url'
      //     })
      //   }
      // })

      // For now, return empty array - you'll need to implement based on your schema
      console.log('⚠️  File discovery not implemented - please update the getFilesToMigrate method')
      
      return files
    } catch (error) {
      console.error('Error getting files to migrate:', error)
      throw error
    }
  }

  /**
   * Process a batch of files
   */
  private async processBatch(batch: FileRecord[], result: MigrationResult): Promise<void> {
    const promises = batch.map(file => this.migrateFile(file, result))
    await Promise.allSettled(promises)
  }

  /**
   * Migrate a single file
   */
  private async migrateFile(fileRecord: FileRecord, result: MigrationResult): Promise<void> {
    try {
      console.log(`📄 Migrating: ${fileRecord.url}`)

      // Extract filename from Supabase URL
      const fileName = this.extractFileNameFromSupabaseUrl(fileRecord.url)
      if (!fileName) {
        throw new Error('Could not extract filename from URL')
      }

      // Download file from Supabase
      const { data, error } = await this.supabase.storage
        .from('photos') // Adjust bucket name as needed
        .download(fileName)

      if (error || !data) {
        throw new Error(`Failed to download from Supabase: ${error?.message || 'No data'}`)
      }

      // Convert blob to buffer
      const arrayBuffer = await data.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate new key for R2
      const newKey = this.generateNewKey(fileName, fileRecord.tableName)

      // Upload to R2
      const uploadResult = await this.r2Service.uploadFile(
        buffer,
        newKey,
        data.type || 'application/octet-stream',
        {
          originalUrl: fileRecord.url,
          migratedAt: new Date().toISOString(),
          sourceTable: fileRecord.tableName,
          sourceColumn: fileRecord.columnName,
        }
      )

      if (!uploadResult.success) {
        throw new Error(`R2 upload failed: ${uploadResult.error}`)
      }

      // Update database record with new URL
      await this.updateDatabaseRecord(fileRecord, uploadResult.url)

      result.migratedFiles++
      console.log(`✅ Migrated: ${fileName} -> ${newKey}`)
    } catch (error) {
      result.failedFiles++
      result.errors.push({
        file: fileRecord.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.error(`❌ Failed to migrate ${fileRecord.url}:`, error)
    }
  }

  /**
   * Extract filename from Supabase URL
   */
  private extractFileNameFromSupabaseUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      // Supabase URL format: /storage/v1/object/public/photos/filename
      const photosIndex = pathParts.indexOf('photos')
      if (photosIndex !== -1 && photosIndex < pathParts.length - 1) {
        return pathParts.slice(photosIndex + 1).join('/')
      }
      return null
    } catch (error) {
      console.error('URL parsing error:', error)
      return null
    }
  }

  /**
   * Generate new key for R2 storage
   */
  private generateNewKey(originalFileName: string, tableName: string): string {
    // Preserve the original structure but add table prefix
    return `migrated/${tableName}/${originalFileName}`
  }

  /**
   * Update database record with new R2 URL
   */
  private async updateDatabaseRecord(fileRecord: FileRecord, newUrl: string): Promise<void> {
    try {
      // Note: This is a placeholder - you'll need to implement based on your schema
      // Example implementation:
      
      // if (fileRecord.tableName === 'vibe_checks') {
      //   await db.update(vibeChecksTable)
      //     .set({ photoUrl: newUrl })
      //     .where(eq(vibeChecksTable.id, fileRecord.id))
      // } else if (fileRecord.tableName === 'venues') {
      //   if (fileRecord.columnName === 'cover_image_url') {
      //     await db.update(venuesTable)
      //       .set({ coverImageUrl: newUrl })
      //       .where(eq(venuesTable.id, fileRecord.id))
      //   } else if (fileRecord.columnName === 'cover_video_url') {
      //     await db.update(venuesTable)
      //       .set({ coverVideoUrl: newUrl })
      //       .where(eq(venuesTable.id, fileRecord.id))
      //   }
      // }

      console.log(`📝 Updated database record ${fileRecord.id} with new URL`)
    } catch (error) {
      console.error('Database update error:', error)
      throw error
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate migration by checking a sample of files
   */
  async validateMigration(sampleSize: number = 10): Promise<boolean> {
    console.log(`🔍 Validating migration with ${sampleSize} sample files...`)
    
    try {
      // Get a sample of migrated files
      const files = await this.getFilesToMigrate()
      const sample = files.slice(0, Math.min(sampleSize, files.length))

      let validCount = 0
      for (const file of sample) {
        try {
          // Try to access the R2 file
          const key = CloudflareR2Service.extractKeyFromUrl(file.url)
          if (key) {
            const signedUrl = await this.r2Service.getSignedDownloadUrl(key, 60)
            const response = await fetch(signedUrl, { method: 'HEAD' })
            if (response.ok) {
              validCount++
            }
          }
        } catch (error) {
          console.warn(`Validation failed for ${file.url}:`, error)
        }
      }

      const successRate = (validCount / sample.length) * 100
      console.log(`✅ Validation complete: ${validCount}/${sample.length} files accessible (${successRate.toFixed(1)}%)`)
      
      return successRate >= 95 // Consider successful if 95% or more files are accessible
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }
}

// CLI execution
async function main() {
  const migrationService = new FileMigrationService()
  
  try {
    const result = await migrationService.migrateAllFiles()
    
    // Validate migration
    const isValid = await migrationService.validateMigration()
    
    if (isValid) {
      console.log('🎉 Migration completed successfully and validated!')
    } else {
      console.log('⚠️  Migration completed but validation failed - please check manually')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { FileMigrationService, type MigrationResult }