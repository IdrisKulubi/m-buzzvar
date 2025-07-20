import { BaseService } from '../base-service'
import { users, venues, adminRoles, adminUserRoles, moderationReports, userActivityLogs } from '../schema'
import { eq, and, or, like, desc, asc, count, sql, inArray, gte, lte } from 'drizzle-orm'
import type { User, Venue, AdminRole, AdminUserRole, ModerationReport } from '../schema'

export interface UserFilters {
  search?: string
  university?: string
  is_active?: boolean
  created_after?: string
  created_before?: string
}

export interface VenueFilters {
  search?: string
  city?: string
  venue_type?: string
  is_verified?: boolean
  is_active?: boolean
  owner_id?: string
}

export interface UserManagement {
  id: string
  email: string
  name: string | null
  university: string | null
  is_active: boolean
  created_at: Date
  last_login_at: Date | null
  total_vibe_checks: number
  total_reviews: number
  roles: string[]
}

export interface GrowthData {
  date: string
  new_users: number
  new_venues: number
  total_users: number
  total_venues: number
}

export interface EngagementData {
  date: string
  daily_active_users: number
  vibe_checks: number
  reviews: number
  venue_views: number
}

export class AdminService extends BaseService {
  async getUsers(filters?: UserFilters, limit: number = 50, offset: number = 0): Promise<UserManagement[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      
      const conditions = []
      
      if (filters?.search) {
        conditions.push(
          or(
            like(users.email, `%${filters.search}%`),
            like(users.name, `%${filters.search}%`)
          )
        )
      }
      
      if (filters?.university) {
        conditions.push(like(users.university, `%${filters.university}%`))
      }
      
      if (filters?.is_active !== undefined) {
        conditions.push(eq(users.isActive, filters.is_active))
      }
      
      if (filters?.created_after) {
        conditions.push(gte(users.createdAt, new Date(filters.created_after)))
      }
      
      if (filters?.created_before) {
        conditions.push(lte(users.createdAt, new Date(filters.created_before)))
      }

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          university: users.university,
          is_active: users.isActive,
          created_at: users.createdAt,
          last_login_at: users.lastLoginAt
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset)

      // For now, return basic user data without vibe checks and reviews counts
      // These would require additional queries to the respective tables
      return result.map(user => ({
        ...user,
        total_vibe_checks: 0, // Placeholder
        total_reviews: 0, // Placeholder
        roles: [] // Placeholder
      }))
    })
  }

  async getUserById(userId: string): Promise<UserManagement | null> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          university: users.university,
          is_active: users.isActive,
          created_at: users.createdAt,
          last_login_at: users.lastLoginAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (result.length === 0) {
        return null
      }

      const user = result[0]
      
      // Get user roles
      const rolesResult = await db
        .select({
          roleName: adminRoles.name
        })
        .from(adminUserRoles)
        .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
        .where(and(
          eq(adminUserRoles.userId, userId),
          eq(adminUserRoles.isActive, true)
        ))

      return {
        ...user,
        total_vibe_checks: 0, // Placeholder
        total_reviews: 0, // Placeholder
        roles: rolesResult.map(r => r.roleName)
      }
    })
  }

  async updateUser(userId: string, updates: {
    name?: string
    university?: string
    is_active?: boolean
  }): Promise<User> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const updateData: any = {
        updatedAt: new Date()
      }

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.university !== undefined) updateData.university = updates.university
      if (updates.is_active !== undefined) updateData.isActive = updates.is_active

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()

      if (result.length === 0) {
        throw new Error('User not found')
      }

      return result[0]
    })
  }

  async deleteUser(userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // Soft delete by setting isActive to false
      const result = await db
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id })

      if (result.length === 0) {
        throw new Error('User not found')
      }
    })
  }

  async getVenues(filters?: VenueFilters, limit: number = 50, offset: number = 0): Promise<Venue[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      
      const conditions = []
      
      if (filters?.search) {
        conditions.push(
          or(
            like(venues.name, `%${filters.search}%`),
            like(venues.description, `%${filters.search}%`),
            like(venues.address, `%${filters.search}%`)
          )
        )
      }
      
      if (filters?.city) {
        conditions.push(like(venues.city, `%${filters.city}%`))
      }
      
      if (filters?.venue_type) {
        conditions.push(eq(venues.venueType, filters.venue_type))
      }
      
      if (filters?.is_verified !== undefined) {
        conditions.push(eq(venues.isVerified, filters.is_verified))
      }
      
      if (filters?.is_active !== undefined) {
        conditions.push(eq(venues.isActive, filters.is_active))
      }
      
      if (filters?.owner_id) {
        conditions.push(eq(venues.ownerId, filters.owner_id))
      }

      const result = await db
        .select()
        .from(venues)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(venues.createdAt))
        .limit(limit)
        .offset(offset)

      return result
    })
  }

  async updateVenue(venueId: string, updates: {
    is_verified?: boolean
    is_active?: boolean
  }): Promise<Venue> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const updateData: any = {
        updatedAt: new Date()
      }

      if (updates.is_verified !== undefined) updateData.isVerified = updates.is_verified
      if (updates.is_active !== undefined) updateData.isActive = updates.is_active

      const result = await db
        .update(venues)
        .set(updateData)
        .where(eq(venues.id, venueId))
        .returning()

      if (result.length === 0) {
        throw new Error('Venue not found')
      }

      return result[0]
    })
  }

  async getGrowthData(days: number = 30): Promise<GrowthData[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // This is a simplified version - in a real implementation,
      // you'd want to generate a date series and left join with actual data
      const userGrowth = await db
        .select({
          date: sql<string>`DATE(${users.createdAt})`,
          new_users: count()
        })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`)

      const venueGrowth = await db
        .select({
          date: sql<string>`DATE(${venues.createdAt})`,
          new_venues: count()
        })
        .from(venues)
        .where(gte(venues.createdAt, startDate))
        .groupBy(sql`DATE(${venues.createdAt})`)
        .orderBy(sql`DATE(${venues.createdAt})`)

      // Combine the data (simplified approach)
      const growthMap = new Map<string, { new_users: number; new_venues: number }>()

      userGrowth.forEach(row => {
        growthMap.set(row.date, { 
          new_users: row.new_users, 
          new_venues: growthMap.get(row.date)?.new_venues || 0 
        })
      })

      venueGrowth.forEach(row => {
        const existing = growthMap.get(row.date)
        growthMap.set(row.date, { 
          new_users: existing?.new_users || 0, 
          new_venues: row.new_venues 
        })
      })

      // Convert to array and add cumulative totals
      let totalUsers = 0
      let totalVenues = 0

      return Array.from(growthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => {
          totalUsers += data.new_users
          totalVenues += data.new_venues
          
          return {
            date,
            new_users: data.new_users,
            new_venues: data.new_venues,
            total_users: totalUsers,
            total_venues: totalVenues
          }
        })
    })
  }

  async getEngagementData(days: number = 30): Promise<EngagementData[]> {
    return this.executeWithRetry(async () => {
      // This would require actual vibe_checks, reviews, and activity tracking tables
      // For now, return placeholder data
      const result: EngagementData[] = []
      const startDate = new Date()
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() - i)
        
        result.push({
          date: date.toISOString().split('T')[0],
          daily_active_users: 0, // Placeholder
          vibe_checks: 0, // Placeholder
          reviews: 0, // Placeholder
          venue_views: 0 // Placeholder
        })
      }
      
      return result.reverse()
    })
  }

  async createRole(name: string, description: string, permissions: string[]): Promise<AdminRole> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .insert(adminRoles)
        .values({
          name,
          description,
          permissions,
          isActive: true
        })
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to create role')
      }

      return result[0]
    })
  }

  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<AdminUserRole> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .insert(adminUserRoles)
        .values({
          userId,
          roleId,
          assignedBy,
          isActive: true
        })
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to assign role')
      }

      return result[0]
    })
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .update(adminUserRoles)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(adminUserRoles.userId, userId),
          eq(adminUserRoles.roleId, roleId)
        ))
        .returning({ id: adminUserRoles.id })

      if (result.length === 0) {
        throw new Error('Role assignment not found')
      }
    })
  }

  async getRoles(): Promise<AdminRole[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select()
        .from(adminRoles)
        .where(eq(adminRoles.isActive, true))
        .orderBy(asc(adminRoles.name))

      return result
    })
  }

  async getUserRoles(userId: string): Promise<AdminRole[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select({
          id: adminRoles.id,
          name: adminRoles.name,
          description: adminRoles.description,
          permissions: adminRoles.permissions,
          isActive: adminRoles.isActive,
          createdAt: adminRoles.createdAt
        })
        .from(adminUserRoles)
        .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
        .where(and(
          eq(adminUserRoles.userId, userId),
          eq(adminUserRoles.isActive, true),
          eq(adminRoles.isActive, true)
        ))

      return result
    })
  }

  async createModerationReport(
    reporterId: string,
    contentType: string,
    contentId: string,
    reason: string,
    description?: string
  ): Promise<ModerationReport> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .insert(moderationReports)
        .values({
          reporterId,
          reportedContentType: contentType,
          reportedContentId: contentId,
          reason,
          description,
          status: 'pending'
        })
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to create moderation report')
      }

      return result[0]
    })
  }

  async getModerationReports(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ModerationReport[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const conditions = []
      if (status) {
        conditions.push(eq(moderationReports.status, status))
      }

      const result = await db
        .select()
        .from(moderationReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationReports.createdAt))
        .limit(limit)
        .offset(offset)

      return result
    })
  }

  async updateModerationReport(
    reportId: string,
    moderatorId: string,
    status: string,
    notes?: string
  ): Promise<ModerationReport> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const updateData: any = {
        moderatorId,
        status,
        moderatorNotes: notes || null
      }

      if (status === 'resolved') {
        updateData.resolvedAt = new Date()
      }

      const result = await db
        .update(moderationReports)
        .set(updateData)
        .where(eq(moderationReports.id, reportId))
        .returning()

      if (result.length === 0) {
        throw new Error('Moderation report not found')
      }

      return result[0]
    })
  }

  async getSystemStats(): Promise<{
    totalUsers: number
    activeUsers: number
    totalVenues: number
    activeVenues: number
    verifiedVenues: number
    pendingReports: number
  }> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const [totalUsersResult] = await db
        .select({ count: count() })
        .from(users)

      const [activeUsersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true))

      const [totalVenuesResult] = await db
        .select({ count: count() })
        .from(venues)

      const [activeVenuesResult] = await db
        .select({ count: count() })
        .from(venues)
        .where(eq(venues.isActive, true))

      const [verifiedVenuesResult] = await db
        .select({ count: count() })
        .from(venues)
        .where(and(
          eq(venues.isActive, true),
          eq(venues.isVerified, true)
        ))

      const [pendingReportsResult] = await db
        .select({ count: count() })
        .from(moderationReports)
        .where(eq(moderationReports.status, 'pending'))

      return {
        totalUsers: totalUsersResult?.count || 0,
        activeUsers: activeUsersResult?.count || 0,
        totalVenues: totalVenuesResult?.count || 0,
        activeVenues: activeVenuesResult?.count || 0,
        verifiedVenues: verifiedVenuesResult?.count || 0,
        pendingReports: pendingReportsResult?.count || 0
      }
    })
  }
}

// Export singleton instance
export const adminService = new AdminService()