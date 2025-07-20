// Re-export the mobile database service
export { mobileDb, checkDatabaseHealth } from './mobile-database-service'

// For backward compatibility, also export as default
export { mobileDb as default } from './mobile-database-service'