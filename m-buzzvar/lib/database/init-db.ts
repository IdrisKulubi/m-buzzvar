import { standaloneDb } from './neon-client';


// Database initialization utility
export class DatabaseInitializer {
  private async executeSchema() {
    try {
      console.log('🔵 Reading database schema...');
      
      // In a React Native environment, you'd need to include the schema as a string
      // or load it from a bundled asset. For now, we'll define it inline.
      const schema = `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            avatar_url TEXT,
            role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'venue_owner', 'admin', 'super_admin')),
            university VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Venues table
        CREATE TABLE IF NOT EXISTS venues (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            address TEXT NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Promotions table
        CREATE TABLE IF NOT EXISTS promotions (
            id VARCHAR(255) PRIMARY KEY,
            venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            start_date TIMESTAMP WITH TIME ZONE NOT NULL,
            end_date TIMESTAMP WITH TIME ZONE NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Vibe checks table
        CREATE TABLE IF NOT EXISTS vibe_checks (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, venue_id)
        );

        -- User sessions table
        CREATE TABLE IF NOT EXISTS user_sessions (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            access_token VARCHAR(255) NOT NULL UNIQUE,
            refresh_token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Venue categories table
        CREATE TABLE IF NOT EXISTS venue_categories (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            icon VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
        CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_promotions_venue_id ON promotions(venue_id);
        CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
      `;

      console.log('🔵 Executing database schema...');
      await standaloneDb.query(schema);
      console.log('✅ Database schema executed successfully');

      // Insert default data
      await this.insertDefaultData();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to execute database schema:', error);
      throw error;
    }
  }

  private async insertDefaultData() {
    try {
      console.log('🔵 Inserting default venue categories...');
      
      const categories = [
        { id: 'cat_nightclub', name: 'Nightclub', description: 'Dance clubs and nightlife venues', icon: '🕺' },
        { id: 'cat_bar', name: 'Bar', description: 'Bars and pubs', icon: '🍺' },
        { id: 'cat_restaurant', name: 'Restaurant', description: 'Dining establishments', icon: '🍽️' },
        { id: 'cat_cafe', name: 'Cafe', description: 'Coffee shops and cafes', icon: '☕' },
        { id: 'cat_lounge', name: 'Lounge', description: 'Relaxed social venues', icon: '🛋️' },
        { id: 'cat_sports_bar', name: 'Sports Bar', description: 'Sports viewing venues', icon: '⚽' },
        { id: 'cat_rooftop', name: 'Rooftop', description: 'Rooftop venues with views', icon: '🏙️' },
        { id: 'cat_live_music', name: 'Live Music', description: 'Venues with live performances', icon: '🎵' },
      ];

      for (const category of categories) {
        try {
          await standaloneDb.query(
            `INSERT INTO venue_categories (id, name, description, icon, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             ON CONFLICT (name) DO NOTHING`,
            [category.id, category.name, category.description, category.icon]
          );
        } catch (error) {
          // Ignore conflicts - category already exists
          console.log(`Category ${category.name} already exists, skipping...`);
        }
      }

      console.log('✅ Default data inserted successfully');
    } catch (error) {
      console.error('❌ Failed to insert default data:', error);
      throw error;
    }
  }

  async initializeDatabase() {
    try {
      console.log('🚀 Starting database initialization...');
      
      // Check database connection
      const health = await standaloneDb.checkHealth();
      if (health.status !== 'healthy') {
        throw new Error(`Database is not healthy: ${health.error}`);
      }
      
      console.log('✅ Database connection verified');
      
      // Execute schema
      await this.executeSchema();
      
      console.log('🎉 Database initialization completed successfully!');
      return { success: true, error: null };
    } catch (error) {
      console.error('💥 Database initialization failed:', error);
      return { success: false, error: error as Error };
    }
  }

  async createSampleData() {
    try {
      console.log('🔵 Creating sample data...');
      
      // Create a sample admin user
      const adminUser = await standaloneDb.createUser({
        email: 'admin@buzzvar.com',
        name: 'Admin User',
        role: 'admin',
      });

      // Create a sample venue owner
      const venueOwner = await standaloneDb.createUser({
        email: 'owner@buzzvar.com',
        name: 'Venue Owner',
        role: 'venue_owner',
      });

      // Create a sample venue
      const venue = await standaloneDb.createVenue({
        name: 'The Buzz Club',
        description: 'The hottest nightclub in town',
        address: '123 Party Street, Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        owner_id: venueOwner.id,
      });

      // Create a sample promotion
      const promotion = await standaloneDb.createPromotion({
        venue_id: venue.id,
        title: 'Happy Hour Special',
        description: '50% off all drinks from 5-7 PM',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        is_active: true,
      });

      console.log('✅ Sample data created successfully');
      console.log('📊 Sample data summary:');
      console.log(`   - Admin user: ${adminUser.email}`);
      console.log(`   - Venue owner: ${venueOwner.email}`);
      console.log(`   - Sample venue: ${venue.name}`);
      console.log(`   - Sample promotion: ${promotion.title}`);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      return { success: false, error: error as Error };
    }
  }
}

// Export singleton instance
export const dbInitializer = new DatabaseInitializer();

// Convenience function
export const initializeDatabase = () => dbInitializer.initializeDatabase();
export const createSampleData = () => dbInitializer.createSampleData();