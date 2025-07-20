#!/usr/bin/env node

/**
 * Interactive script to help set up Neon DB configuration
 * Run with: node scripts/setup-neon-config.js
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupNeonConfig() {
  console.log('🚀 Neon DB Configuration Setup')
  console.log('=' .repeat(40))
  console.log()
  
  console.log('This script will help you configure your Neon database connection.')
  console.log('You can find these values in your Neon Console (https://console.neon.tech)')
  console.log()

  try {
    // Get Neon database details
    const databaseUrl = await question('Enter your Neon Database URL: ')
    
    if (!databaseUrl.trim()) {
      console.log('❌ Database URL is required. Exiting.')
      process.exit(1)
    }

    // Parse the URL to extract components
    let host, database, user, password
    
    try {
      const url = new URL(databaseUrl)
      host = url.hostname
      database = url.pathname.slice(1) // Remove leading slash
      user = url.username
      password = url.password
    } catch (error) {
      console.log('⚠️  Could not parse database URL. Please enter details manually.')
      host = await question('Enter database host: ')
      database = await question('Enter database name: ')
      user = await question('Enter database user: ')
      password = await question('Enter database password: ')
    }

    // Get optional settings
    const maxConnections = await question('Max connections (default: 20): ') || '20'
    const idleTimeout = await question('Idle timeout in ms (default: 30000): ') || '30000'
    const connectionTimeout = await question('Connection timeout in ms (default: 2000): ') || '2000'

    // Generate environment variables
    const envConfig = `
# Neon Database Configuration
NEON_DATABASE_URL=${databaseUrl}
NEON_DATABASE_HOST=${host}
NEON_DATABASE_NAME=${database}
NEON_DATABASE_USER=${user}
NEON_DATABASE_PASSWORD=${password}

# Database Connection Pool Settings
DB_POOL_MAX=${maxConnections}
DB_POOL_IDLE_TIMEOUT=${idleTimeout}
DB_POOL_CONNECTION_TIMEOUT=${connectionTimeout}
`

    // Read existing .env.local file
    const envPath = path.join(__dirname, '..', '.env.local')
    let existingEnv = ''
    
    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf8')
    }

    // Check if Neon config already exists
    if (existingEnv.includes('NEON_DATABASE_URL')) {
      const overwrite = await question('Neon configuration already exists. Overwrite? (y/N): ')
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Configuration cancelled.')
        process.exit(0)
      }
      
      // Remove existing Neon configuration
      existingEnv = existingEnv.replace(/# Neon Database Configuration[\s\S]*?(?=\n#|\n[A-Z]|$)/g, '')
    }

    // Append new configuration
    const newEnvContent = existingEnv.trim() + '\n' + envConfig.trim() + '\n'

    // Write to .env.local
    fs.writeFileSync(envPath, newEnvContent)

    console.log()
    console.log('✅ Neon database configuration saved to .env.local')
    console.log()
    console.log('Next steps:')
    console.log('1. Test your configuration: npx tsx scripts/test-neon-setup.ts')
    console.log('2. Start the development server: npm run dev')
    console.log('3. Test the health endpoint: curl http://localhost:3000/api/health/database')
    console.log()

    // Also update mobile app env
    const mobileEnvPath = path.join(__dirname, '..', '..', '..', 'm-buzzvar', '.env.local')
    if (fs.existsSync(mobileEnvPath)) {
      let mobileEnv = fs.readFileSync(mobileEnvPath, 'utf8')
      
      if (!mobileEnv.includes('EXPO_PUBLIC_API_URL')) {
        const apiUrl = await question('Enter API URL for mobile app (default: http://localhost:3000): ') || 'http://localhost:3000'
        
        mobileEnv += `\n# API Configuration for database access\nEXPO_PUBLIC_API_URL=${apiUrl}\nEXPO_PUBLIC_DATABASE_HEALTH_CHECK_INTERVAL=30000\n`
        fs.writeFileSync(mobileEnvPath, mobileEnv)
        
        console.log('✅ Mobile app configuration also updated')
      }
    }

  } catch (error) {
    console.error('❌ Error setting up configuration:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nConfiguration cancelled.')
  rl.close()
  process.exit(0)
})

// Run the setup
setupNeonConfig().catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})