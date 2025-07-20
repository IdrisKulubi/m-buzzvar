#!/usr/bin/env tsx

/**
 * Migration Test Script
 * This script tests the database migration by running comprehensive tests
 * Run with: npx tsx scripts/test-migration.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { db as getDb, checkDatabaseHealth } from '../lib/database/neon-client'

const db = getDb()
import { 
  users, 
  venues, 
  vibeChecks, 
  reviews, 
  promotions, 
  events,
  userFavorites,
  notifications
} from '../lib/database/schema'
import { eq, and, desc, count } from 'drizzle-orm'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

class MigrationTester {
  private results: TestResult[] = []

  private addResult(name: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ name, passed, error, details })
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${name}`)
    if (error) {
      console.log(`   Error: ${error}`)
    }
    if (details) {
      console.log(`   Details: ${JSON.stringify(details)}`)
    }
  }

  async testDatabaseConnection() {
    try {
      const health = await checkDatabaseHealth()
      this.addResult(
        'Database Connection', 
        health.status === 'healthy',
        health.status !== 'healthy' ? health.error : undefined,
        { connectionCount: health.connectionCount, dbTimestamp: health.dbTimestamp }
      )
    } catch (error) {
      this.addResult('Database Connection', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testTableCreation() {
    try {
      // Test that we can query each main table
      const tables = [
        { name: 'users', table: users },
        { name: 'venues', table: venues },
        { name: 'vibe_checks', table: vibeChecks },
        { name: 'reviews', table: reviews },
        { name: 'promotions', table: promotions },
        { name: 'events', table: events },
        { name: 'notifications', table: notifications }
      ]

      for (const { name, table } of tables) {
        try {
          const result = await db.select({ count: count() }).from(table)
          this.addResult(`Table ${name}`, true, undefined, { count: result[0].count })
        } catch (error) {
          this.addResult(`Table ${name}`, false, error instanceof Error ? error.message : 'Unknown error')
        }
      }
    } catch (error) {
      this.addResult('Table Creation Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testDataInsertion() {
    try {
      // Test inserting a user
      const testUser = await db.insert(users).values({
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      }).returning()

      this.addResult('User Insertion', testUser.length > 0, undefined, { userId: testUser[0]?.id })

      if (testUser.length > 0) {
        const userId = testUser[0].id

        // Test inserting a venue
        const testVenue = await db.insert(venues).values({
          name: 'Test Venue',
          slug: 'test-venue',
          address: '123 Test St',
          city: 'Test City',
          country: 'US',
          latitude: '40.7128',
          longitude: '-74.0060',
          venueType: 'bar',
          ownerId: userId
        }).returning()

        this.addResult('Venue Insertion', testVenue.length > 0, undefined, { venueId: testVenue[0]?.id })

        if (testVenue.length > 0) {
          const venueId = testVenue[0].id

          // Test inserting a vibe check
          const testVibeCheck = await db.insert(vibeChecks).values({
            venueId: venueId,
            userId: userId,
            crowdLevel: 3,
            musicVolume: 4,
            energyLevel: 5,
            waitTime: 10,
            coverCharge: '15.00'
          }).returning()

          this.addResult('Vibe Check Insertion', testVibeCheck.length > 0, undefined, { vibeCheckId: testVibeCheck[0]?.id })

          // Test inserting a review
          const testReview = await db.insert(reviews).values({
            venueId: venueId,
            userId: userId,
            rating: 4,
            title: 'Great place!',
            content: 'Had a wonderful time here.'
          }).returning()

          this.addResult('Review Insertion', testReview.length > 0, undefined, { reviewId: testReview[0]?.id })

          // Test inserting a favorite
          const testFavorite = await db.insert(userFavorites).values({
            userId: userId,
            venueId: venueId
          }).returning()

          this.addResult('User Favorite Insertion', testFavorite.length > 0, undefined, { favoriteId: testFavorite[0]?.id })
        }
      }
    } catch (error) {
      this.addResult('Data Insertion Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testRelationships() {
    try {
      // Test querying with relationships
      const venuesWithOwners = await db
        .select({
          venueName: venues.name,
          ownerName: users.name,
          ownerEmail: users.email
        })
        .from(venues)
        .leftJoin(users, eq(venues.ownerId, users.id))
        .limit(5)

      this.addResult('Venue-User Relationship', true, undefined, { count: venuesWithOwners.length })

      // Test vibe checks with venue and user info
      const vibeChecksWithDetails = await db
        .select({
          venueName: venues.name,
          userName: users.name,
          crowdLevel: vibeChecks.crowdLevel,
          energyLevel: vibeChecks.energyLevel
        })
        .from(vibeChecks)
        .leftJoin(venues, eq(vibeChecks.venueId, venues.id))
        .leftJoin(users, eq(vibeChecks.userId, users.id))
        .limit(5)

      this.addResult('Vibe Check Relationships', true, undefined, { count: vibeChecksWithDetails.length })

    } catch (error) {
      this.addResult('Relationship Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testConstraints() {
    try {
      // Test unique constraint on user email
      try {
        await db.insert(users).values({
          email: 'test@example.com', // This should fail due to unique constraint
          name: 'Duplicate User'
        })
        this.addResult('Email Unique Constraint', false, 'Duplicate email was allowed')
      } catch (error) {
        // This should fail, which means the constraint is working
        this.addResult('Email Unique Constraint', true, undefined, { message: 'Constraint working correctly' })
      }

      // Test check constraint on rating
      try {
        const testUser = await db.select().from(users).limit(1)
        const testVenue = await db.select().from(venues).limit(1)
        
        if (testUser.length > 0 && testVenue.length > 0) {
          await db.insert(reviews).values({
            venueId: testVenue[0].id,
            userId: testUser[0].id,
            rating: 6, // This should fail due to check constraint
            title: 'Invalid rating'
          })
          this.addResult('Rating Check Constraint', false, 'Invalid rating was allowed')
        }
      } catch (error) {
        // This should fail, which means the constraint is working
        this.addResult('Rating Check Constraint', true, undefined, { message: 'Constraint working correctly' })
      }

    } catch (error) {
      this.addResult('Constraint Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testIndexes() {
    try {
      // Test that indexes exist by running queries that would benefit from them
      const start = Date.now()
      
      // Query that should use email index
      await db.select().from(users).where(eq(users.email, 'test@example.com'))
      
      // Query that should use venue location (if we had PostGIS functions)
      await db.select().from(venues).where(eq(venues.city, 'Test City'))
      
      const duration = Date.now() - start
      
      this.addResult('Index Performance', duration < 1000, undefined, { queryTime: `${duration}ms` })

    } catch (error) {
      this.addResult('Index Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testTriggers() {
    try {
      // Test updated_at trigger
      const testUser = await db.select().from(users).where(eq(users.email, 'test@example.com')).limit(1)
      
      if (testUser.length > 0) {
        const originalUpdatedAt = testUser[0].updatedAt
        
        // Update the user
        await db.update(users)
          .set({ name: 'Updated Test User' })
          .where(eq(users.id, testUser[0].id))
        
        // Check if updated_at was changed
        const updatedUser = await db.select().from(users).where(eq(users.id, testUser[0].id)).limit(1)
        
        const triggerWorked = updatedUser[0].updatedAt > originalUpdatedAt
        this.addResult('Updated At Trigger', triggerWorked, undefined, {
          original: originalUpdatedAt,
          updated: updatedUser[0].updatedAt
        })
      }

    } catch (error) {
      this.addResult('Trigger Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testFunctions() {
    try {
      // Test custom functions
      const result = await db.execute(`SELECT cleanup_expired_tokens()`)
      this.addResult('Custom Function Test', true, undefined, { result: result.rows })

    } catch (error) {
      this.addResult('Function Test', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async cleanupTestData() {
    try {
      // Clean up test data
      await db.delete(userFavorites).where(eq(userFavorites.userId, 
        db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'))
      ))
      
      await db.delete(reviews).where(eq(reviews.userId, 
        db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'))
      ))
      
      await db.delete(vibeChecks).where(eq(vibeChecks.userId, 
        db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'))
      ))
      
      await db.delete(venues).where(eq(venues.ownerId, 
        db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'))
      ))
      
      await db.delete(users).where(eq(users.email, 'test@example.com'))
      
      this.addResult('Test Data Cleanup', true)

    } catch (error) {
      this.addResult('Test Data Cleanup', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async runAllTests() {
    console.log('🧪 Running Migration Tests...\n')

    await this.testDatabaseConnection()
    await this.testTableCreation()
    await this.testDataInsertion()
    await this.testRelationships()
    await this.testConstraints()
    await this.testIndexes()
    await this.testTriggers()
    await this.testFunctions()
    await this.cleanupTestData()

    // Summary
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    const passRate = ((passed / total) * 100).toFixed(1)

    console.log('\n📊 Test Summary:')
    console.log(`   Passed: ${passed}/${total} (${passRate}%)`)
    
    if (passed === total) {
      console.log('   🎉 All tests passed!')
    } else {
      console.log('   ⚠️  Some tests failed')
      const failed = this.results.filter(r => !r.passed)
      failed.forEach(test => {
        console.log(`      - ${test.name}: ${test.error}`)
      })
    }

    return { passed, total, passRate: parseFloat(passRate) }
  }
}

// Main execution
async function main() {
  console.log('🗄️  Database Migration Tester')
  console.log('=' .repeat(50))

  if (!process.env.NEON_DATABASE_URL) {
    console.error('❌ NEON_DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const tester = new MigrationTester()

  try {
    const result = await tester.runAllTests()

    if (result.passRate >= 90) {
      console.log('\n✅ Migration test passed!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Migration test completed with issues')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n💥 Migration test failed:', error)
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the tests
main().catch((error) => {
  console.error('Test script failed:', error)
  process.exit(1)
})