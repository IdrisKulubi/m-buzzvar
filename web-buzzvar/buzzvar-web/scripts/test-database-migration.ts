#!/usr/bin/env tsx

/**
 * Test script to verify database migration from Supabase to Neon
 * This script tests the new database services and connection
 */

import { config } from 'dotenv'
import { checkDatabaseHealth } from '../src/lib/database/neon-client'
import { promotionService, venueService, analyticsService, adminService } from '../src/lib/database/services'

// Load environment variables
config({ path: '.env.local' })

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  try {
    const health = await checkDatabaseHealth()
    console.log('✅ Database health check:', health)
    
    if (health.status !== 'healthy') {
      throw new Error(`Database is not healthy: ${health.error}`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function testPromotionService() {
  console.log('\n🔍 Testing Promotion Service...')
  
  try {
    // Test getting promotions for a non-existent venue (should return empty array)
    const promotions = await promotionService.getVenuePromotions('test-venue-id')
    console.log('✅ Promotion service - getVenuePromotions:', promotions.length, 'promotions')
    
    // Test getting promotion templates
    const templates = promotionService.getPromotionTemplates()
    console.log('✅ Promotion service - getPromotionTemplates:', templates.length, 'templates')
    
    // Test health check
    const health = await promotionService.healthCheck()
    console.log('✅ Promotion service health:', health.status)
    
    return true
  } catch (error) {
    console.error('❌ Promotion service test failed:', error)
    return false
  }
}

async function testVenueService() {
  console.log('\n🔍 Testing Venue Service...')
  
  try {
    // Test getting venues
    const venues = await venueService.getVenues({}, 10, 0)
    console.log('✅ Venue service - getVenues:', venues.length, 'venues')
    
    // Test getting venue types
    const types = await venueService.getVenueTypes()
    console.log('✅ Venue service - getVenueTypes:', types.length, 'types')
    
    // Test getting venue cities
    const cities = await venueService.getVenueCities()
    console.log('✅ Venue service - getVenueCities:', cities.length, 'cities')
    
    // Test health check
    const health = await venueService.healthCheck()
    console.log('✅ Venue service health:', health.status)
    
    return true
  } catch (error) {
    console.error('❌ Venue service test failed:', error)
    return false
  }
}

async function testAnalyticsService() {
  console.log('\n🔍 Testing Analytics Service...')
  
  try {
    // Test getting platform analytics
    const analytics = await analyticsService.getPlatformAnalytics('7d')
    console.log('✅ Analytics service - getPlatformAnalytics:', {
      totalUsers: analytics.totalUsers,
      totalVenues: analytics.totalVenues,
      totalVibeChecks: analytics.totalVibeChecks
    })
    
    // Test getting venue analytics for non-existent venue
    const venueAnalytics = await analyticsService.getVenueAnalytics('test-venue-id', '7d')
    console.log('✅ Analytics service - getVenueAnalytics:', {
      venueId: venueAnalytics.venueId,
      totalViews: venueAnalytics.totalViews
    })
    
    // Test health check
    const health = await analyticsService.healthCheck()
    console.log('✅ Analytics service health:', health.status)
    
    return true
  } catch (error) {
    console.error('❌ Analytics service test failed:', error)
    return false
  }
}

async function testAdminService() {
  console.log('\n🔍 Testing Admin Service...')
  
  try {
    // Test getting system stats
    const stats = await adminService.getSystemStats()
    console.log('✅ Admin service - getSystemStats:', {
      totalUsers: stats.totalUsers,
      totalVenues: stats.totalVenues,
      activeUsers: stats.activeUsers
    })
    
    // Test getting growth data
    const growthData = await adminService.getGrowthData(7)
    console.log('✅ Admin service - getGrowthData:', growthData.length, 'data points')
    
    // Test health check
    const health = await adminService.healthCheck()
    console.log('✅ Admin service health:', health.status)
    
    return true
  } catch (error) {
    console.error('❌ Admin service test failed:', error)
    return false
  }
}

async function testConnectionPooling() {
  console.log('\n🔍 Testing Connection Pooling...')
  
  try {
    const stats = await promotionService.getConnectionPoolStats()
    console.log('✅ Connection pool stats:', {
      totalCount: stats.totalCount,
      idleCount: stats.idleCount,
      waitingCount: stats.waitingCount
    })
    
    return true
  } catch (error) {
    console.error('❌ Connection pooling test failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Database Migration Tests...\n')
  
  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Promotion Service', test: testPromotionService },
    { name: 'Venue Service', test: testVenueService },
    { name: 'Analytics Service', test: testAnalyticsService },
    { name: 'Admin Service', test: testAdminService },
    { name: 'Connection Pooling', test: testConnectionPooling }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const { name, test } of tests) {
    try {
      const result = await test()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`❌ ${name} test crashed:`, error)
      failed++
    }
  }
  
  console.log('\n📊 Test Results:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All database migration tests passed!')
    console.log('✅ Supabase to Neon migration is working correctly')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.')
    process.exit(1)
  }
}

// Run the tests
main().catch((error) => {
  console.error('💥 Test runner crashed:', error)
  process.exit(1)
})