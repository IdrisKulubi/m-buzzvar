// Standalone database service - re-export the mobile database service
export { mobileDb as standaloneDb } from '../../src/lib/database/mobile-database-service';
export { checkDatabaseHealth } from '../../src/lib/database/mobile-database-service';

// For backward compatibility
export { mobileDb as default } from '../../src/lib/database/mobile-database-service';