import { db } from '../src/lib/database/neon-client'
import { sql } from 'drizzle-orm'

interface UrlUpdateResult {
  tableName: string
  columnName: string
  updatedCount: number
  errors: string[]
}

class DatabaseUrlUpdater {
  private batchSize = 100

  /**
   * Update all Supabase URLs to R2 URLs in the database
   */
  async updateAllUrls(): Promise<UrlUpdateResult[]> {
    console.log('🔄 Starting database URL update from Supabase to R2...')
    
    const results: UrlUpdateResult[] = []

    // Define tables and columns that contain file URLs
    const urlColumns = [
      { table: 'users', column: 'avatar_url' },
      { table: 'venues', column: 'cover_image_url' },
      { table: 'venues', column: 'cover_video_url' },
      { table: 'vibe_checks', column: 'photo_url' },
      // Add more tables/columns as needed
    ]

    for (const { table, column } of urlColumns) {
      try {
        console.log(`📝 Updating ${table}.${column}...`)
        const result = await this.updateTableColumn(table, column)
        results.push(result)
        console.log(`✅ Updated ${result.updatedCount} records in ${table}.${column}`)
      } catch (error) {
        console.error(`❌ Failed to update ${table}.${column}:`, error)
        results.push({
          tableName: table,
          columnName: column,
          updatedCount: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        })
      }
    }

    return results
  }

  /**
   * Update URLs in a specific table column
   */
  private async updateTableColumn(tableName: string, columnName: string): Promise<UrlUpdateResult> {
    const result: UrlUpdateResult = {
      tableName,
      columnName,
      updatedCount: 0,
      errors: [],
    }

    try {
      // First, get count of records that need updating
      const countQuery = sql`
        SELECT COUNT(*) as count 
        FROM ${sql.identifier(tableName)} 
        WHERE ${sql.identifier(columnName)} LIKE '%supabase%'
      `
      
      const countResult = await db.execute(countQuery)
      const totalRecords = Number(countResult.rows[0]?.count || 0)
      
      if (totalRecords === 0) {
        console.log(`ℹ️  No records to update in ${tableName}.${columnName}`)
        return result
      }

      console.log(`📊 Found ${totalRecords} records to update in ${tableName}.${columnName}`)

      // Update URLs in batches
      let offset = 0
      while (offset < totalRecords) {
        const updateQuery = sql`
          UPDATE ${sql.identifier(tableName)}
          SET ${sql.identifier(columnName)} = ${this.convertSupabaseUrlToR2(sql.identifier(columnName))}
          WHERE id IN (
            SELECT id 
            FROM ${sql.identifier(tableName)} 
            WHERE ${sql.identifier(columnName)} LIKE '%supabase%'
            LIMIT ${this.batchSize}
            OFFSET ${offset}
          )
        `

        const updateResult = await db.execute(updateQuery)
        const updatedInBatch = updateResult.rowCount || 0
        result.updatedCount += updatedInBatch

        offset += this.batchSize
        
        console.log(`   📦 Batch ${Math.floor(offset / this.batchSize)}: Updated ${updatedInBatch} records`)

        // Break if no more records were updated
        if (updatedInBatch === 0) {
          break
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(errorMessage)
      console.error(`Error updating ${tableName}.${columnName}:`, error)
    }

    return result
  }

  /**
   * Convert Supabase URL to R2 URL using SQL
   */
  private convertSupabaseUrlToR2(columnIdentifier: any) {
    // This SQL function extracts the filename from Supabase URL and creates R2 URL
    return sql`
      CASE 
        WHEN ${columnIdentifier} LIKE '%supabase%' THEN
          CONCAT(
            '${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || 'https://storage.buzzvar.com'}/',
            'migrated/',
            SUBSTRING(${columnIdentifier} FROM '.*/([^/]+)$')
          )
        ELSE ${columnIdentifier}
      END
    `
  }

  /**
   * Validate URL updates by checking a sample
   */
  async validateUpdates(sampleSize: number = 10): Promise<boolean> {
    console.log(`🔍 Validating URL updates with ${sampleSize} samples...`)

    try {
      // Check for any remaining Supabase URLs
      const checkQuery = sql`
        SELECT 
          'users' as table_name, 'avatar_url' as column_name, avatar_url as url
        FROM users 
        WHERE avatar_url LIKE '%supabase%'
        LIMIT ${sampleSize}
        
        UNION ALL
        
        SELECT 
          'venues' as table_name, 'cover_image_url' as column_name, cover_image_url as url
        FROM venues 
        WHERE cover_image_url LIKE '%supabase%'
        LIMIT ${sampleSize}
        
        UNION ALL
        
        SELECT 
          'venues' as table_name, 'cover_video_url' as column_name, cover_video_url as url
        FROM venues 
        WHERE cover_video_url LIKE '%supabase%'
        LIMIT ${sampleSize}
      `

      const remainingSupabaseUrls = await db.execute(checkQuery)
      
      if (remainingSupabaseUrls.rows.length > 0) {
        console.log('⚠️  Found remaining Supabase URLs:')
        remainingSupabaseUrls.rows.forEach(row => {
          console.log(`   - ${row.table_name}.${row.column_name}: ${row.url}`)
        })
        return false
      }

      // Check for R2 URLs
      const r2CheckQuery = sql`
        SELECT COUNT(*) as count
        FROM (
          SELECT avatar_url as url FROM users WHERE avatar_url IS NOT NULL
          UNION ALL
          SELECT cover_image_url as url FROM venues WHERE cover_image_url IS NOT NULL
          UNION ALL
          SELECT cover_video_url as url FROM venues WHERE cover_video_url IS NOT NULL
        ) urls
        WHERE url LIKE '%${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || 'storage.buzzvar.com'}%'
      `

      const r2UrlCount = await db.execute(r2CheckQuery)
      const r2Count = Number(r2UrlCount.rows[0]?.count || 0)

      console.log(`✅ Found ${r2Count} R2 URLs in database`)
      console.log('🎉 URL validation completed successfully!')
      
      return true
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }

  /**
   * Rollback URLs from R2 back to Supabase (emergency use only)
   */
  async rollbackUrls(): Promise<void> {
    console.log('🔄 Rolling back URLs from R2 to Supabase...')
    console.log('⚠️  This is an emergency rollback operation!')

    // This would require storing the original URLs somewhere
    // For now, just log a warning
    console.log('❌ Rollback not implemented - original URLs not stored')
    console.log('💡 Consider implementing URL backup before migration')
  }
}

// CLI execution
async function main() {
  const updater = new DatabaseUrlUpdater()
  
  try {
    console.log('🚀 Starting database URL update process...')
    
    const results = await updater.updateAllUrls()
    
    // Print summary
    console.log('\n📊 Update Summary:')
    let totalUpdated = 0
    let totalErrors = 0
    
    results.forEach(result => {
      console.log(`   ${result.tableName}.${result.columnName}: ${result.updatedCount} updated`)
      totalUpdated += result.updatedCount
      totalErrors += result.errors.length
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`     ❌ Error: ${error}`)
        })
      }
    })
    
    console.log(`\n✅ Total records updated: ${totalUpdated}`)
    if (totalErrors > 0) {
      console.log(`❌ Total errors: ${totalErrors}`)
    }
    
    // Validate updates
    const isValid = await updater.validateUpdates()
    
    if (isValid) {
      console.log('🎉 Database URL update completed successfully!')
    } else {
      console.log('⚠️  Database URL update completed with warnings')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('💥 Database URL update failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { DatabaseUrlUpdater, type UrlUpdateResult }