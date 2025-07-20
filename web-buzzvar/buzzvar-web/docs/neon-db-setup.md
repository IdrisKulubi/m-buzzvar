# Neon DB Setup Guide

This guide walks you through setting up Neon DB infrastructure for the Buzzvar platform migration from Supabase.

## Prerequisites

- Node.js 18+ installed
- Access to Neon Console (https://console.neon.tech)
- Existing Supabase project (for migration reference)

## Step 1: Create Neon Database Project

1. **Sign up/Login to Neon Console**
   - Visit https://console.neon.tech
   - Create an account or sign in

2. **Create a New Project**
   - Click "Create Project"
   - Choose your preferred region (closest to your users)
   - Select PostgreSQL version (14+ recommended)
   - Name your project (e.g., "buzzvar-production")

3. **Configure Database Settings**
   - Database name: `buzzvar` (or your preferred name)
   - Enable connection pooling
   - Set up compute settings based on your needs

## Step 2: Configure Environment Variables

Update your `.env.local` files with the Neon database credentials:

### Web Application (.env.local)

```bash
# Neon Database Configuration
NEON_DATABASE_URL=postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/buzzvar?sslmode=require
NEON_DATABASE_HOST=ep-example-123456.us-east-1.aws.neon.tech
NEON_DATABASE_NAME=buzzvar
NEON_DATABASE_USER=username
NEON_DATABASE_PASSWORD=password

# Database Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
```

### Mobile Application (.env.local)

```bash
# API Configuration for database access
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_DATABASE_HEALTH_CHECK_INTERVAL=30000
```

## Step 3: Install Dependencies

The required dependencies are already configured in package.json:

```bash
# Web application
cd apps/web-buzzvar/buzzvar-web
npm install

# Mobile application (no additional deps needed)
cd apps/m-buzzvar
npm install
```

## Step 4: Test Database Connection

Run the integration test to verify your setup:

```bash
cd apps/web-buzzvar/buzzvar-web
npx tsx scripts/test-neon-setup.ts
```

Expected output when properly configured:
```
🚀 Neon DB Setup Integration Test
==================================================
🔧 Checking environment variables...
✅ NEON_DATABASE_URL: Set
✅ NEON_DATABASE_HOST: Set
✅ NEON_DATABASE_NAME: Set
✅ NEON_DATABASE_USER: Set

🔍 Testing Neon DB Setup...
1. Testing database health check...
✅ Database health check passed
   - Connection count: 1
   - Idle connections: 0
   - Waiting connections: 0

🎉 All tests passed! Neon DB setup is working correctly.
```

## Step 5: API Health Checks

Test the health check endpoints:

```bash
# Start the development server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health/database

# Test detailed health endpoint
curl -X POST http://localhost:3000/api/health/database \
  -H "Content-Type: application/json" \
  -d '{"includeDetails": true}'
```

## Step 6: Database Monitoring

The setup includes automatic database monitoring:

### Starting Monitoring

```typescript
import { databaseMonitor } from '@/lib/monitoring/database-monitor'

// Start monitoring with 30-second intervals
databaseMonitor.startMonitoring(30000)
```

### Monitoring Features

- **Health Checks**: Automatic database connectivity monitoring
- **Performance Metrics**: Query response time tracking
- **Connection Pool Monitoring**: Track connection usage
- **Alerting**: Configurable alerts for issues

### Accessing Monitoring Data

```typescript
// Get current metrics
const currentMetrics = databaseMonitor.getCurrentMetrics()

// Get health summary for last 30 minutes
const summary = databaseMonitor.getHealthSummary(30)

// Get metrics history
const history = databaseMonitor.getMetricsHistory(50)
```

## Configuration Options

### Connection Pool Settings

Adjust these environment variables based on your needs:

- `DB_POOL_MAX`: Maximum connections (default: 20)
- `DB_POOL_IDLE_TIMEOUT`: Idle connection timeout in ms (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT`: New connection timeout in ms (default: 2000)

### Monitoring Settings

Configure monitoring thresholds:

```typescript
const monitor = new DatabaseMonitor({
  maxResponseTime: 5000,      // 5 seconds
  maxConnections: 18,         // 90% of pool size
  maxWaitingConnections: 5,   // Alert threshold
  alertCallback: (alert) => {
    // Custom alert handling
    console.error(`Database Alert: ${alert.message}`)
  }
})
```

## Security Considerations

1. **SSL/TLS**: Always use SSL connections in production
2. **Connection Strings**: Never commit database URLs to version control
3. **Environment Variables**: Use secure environment variable management
4. **Network Security**: Configure Neon IP allowlists if needed
5. **Monitoring**: Set up alerts for unusual connection patterns

## Performance Optimization

### Connection Pooling

- Use connection pooling to reduce connection overhead
- Monitor pool utilization and adjust `DB_POOL_MAX` as needed
- Set appropriate idle timeouts to free unused connections

### Query Optimization

- Use prepared statements to prevent SQL injection
- Implement query timeout settings
- Monitor slow queries and optimize as needed

### Monitoring and Alerting

- Set up monitoring for connection pool exhaustion
- Monitor query response times
- Alert on database connectivity issues

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if NEON_DATABASE_URL is correct
   - Verify network connectivity
   - Check Neon project status

2. **SSL Certificate Issues**
   - Ensure `sslmode=require` in connection string
   - Update Node.js if using older versions

3. **Connection Pool Exhaustion**
   - Increase `DB_POOL_MAX` if needed
   - Check for connection leaks in application code
   - Monitor connection usage patterns

4. **Timeout Issues**
   - Adjust `DB_POOL_CONNECTION_TIMEOUT`
   - Check network latency to Neon
   - Consider increasing query timeouts

### Debug Mode

Enable debug logging:

```bash
# Add to .env.local
DEBUG=pg:*
NODE_ENV=development
```

### Health Check Endpoints

Use these endpoints to diagnose issues:

- `GET /api/health/database` - Basic health check
- `POST /api/health/database` - Detailed health check with performance metrics

## Next Steps

After completing this setup:

1. **Schema Migration**: Run database schema migration (Task 2)
2. **Data Migration**: Migrate data from Supabase (Task 3)
3. **Authentication Setup**: Configure Better Auth (Task 4)
4. **Application Updates**: Update both mobile and web apps

## Support

For issues with this setup:

1. Check the integration test output
2. Review the health check endpoints
3. Check database monitoring metrics
4. Consult Neon documentation: https://neon.tech/docs