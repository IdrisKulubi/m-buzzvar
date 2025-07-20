import { BaseService } from "../base-service";
import { venueAnalytics, userActivityLogs, venues, users } from "../schema";
import { eq, and, gte, lte, desc, sql, count} from "drizzle-orm";

export interface DailyStats {
  date: string;
  views: number;
  uniqueViews: number;
  checkins: number;
  vibeChecks: number;
  reviews: number;
}

export interface HourlyStats {
  hour: number;
  views: number;
  checkins: number;
  vibeChecks: number;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalVenues: number;
  totalVibeChecks: number;
  totalReviews: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  topVenues: Array<{
    id: string;
    name: string;
    views: number;
    checkins: number;
  }>;
  growthData: Array<{
    date: string;
    newUsers: number;
    newVenues: number;
    totalVibeChecks: number;
  }>;
}

export interface VenueAnalyticsData {
  venueId: string;
  period: string;
  totalViews: number;
  uniqueViews: number;
  totalCheckins: number;
  totalVibeChecks: number;
  totalReviews: number;
  dailyStats: DailyStats[];
  hourlyStats: HourlyStats[];
  topDays: Array<{
    date: string;
    views: number;
  }>;
}

export class AnalyticsService extends BaseService {
  async getVenueAnalytics(
    venueId: string,
    period: string = "7d"
  ): Promise<VenueAnalyticsData> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      // Get daily stats
      const dailyStats = await db
        .select({
          date: venueAnalytics.date,
          views: venueAnalytics.views,
          uniqueViews: venueAnalytics.uniqueViews,
          checkins: venueAnalytics.checkins,
          vibeChecks: venueAnalytics.vibeChecks,
          reviews: venueAnalytics.reviews,
        })
        .from(venueAnalytics)
        .where(
          and(
            eq(venueAnalytics.venueId, venueId),
            gte(venueAnalytics.date, startDateStr)
          )
        )
        .orderBy(desc(venueAnalytics.date));

      // Get totals
      const totalsResult = await db
        .select({
          totalViews: sql<number>`COALESCE(SUM(${venueAnalytics.views}), 0)`,
          uniqueViews: sql<number>`COALESCE(SUM(${venueAnalytics.uniqueViews}), 0)`,
          totalCheckins: sql<number>`COALESCE(SUM(${venueAnalytics.checkins}), 0)`,
          totalVibeChecks: sql<number>`COALESCE(SUM(${venueAnalytics.vibeChecks}), 0)`,
          totalReviews: sql<number>`COALESCE(SUM(${venueAnalytics.reviews}), 0)`,
        })
        .from(venueAnalytics)
        .where(
          and(
            eq(venueAnalytics.venueId, venueId),
            gte(venueAnalytics.date, startDateStr)
          )
        );

      const totals = totalsResult[0] || {
        totalViews: 0,
        uniqueViews: 0,
        totalCheckins: 0,
        totalVibeChecks: 0,
        totalReviews: 0,
      };

      // Get top performing days
      const topDays = await db
        .select({
          date: venueAnalytics.date,
          views: venueAnalytics.views,
        })
        .from(venueAnalytics)
        .where(
          and(
            eq(venueAnalytics.venueId, venueId),
            gte(venueAnalytics.date, startDateStr)
          )
        )
        .orderBy(desc(venueAnalytics.views))
        .limit(5);

      return {
        venueId,
        period,
        totalViews: totals.totalViews,
        uniqueViews: totals.uniqueViews,
        totalCheckins: totals.totalCheckins,
        totalVibeChecks: totals.totalVibeChecks,
        totalReviews: totals.totalReviews,
        dailyStats: dailyStats.map((stat) => ({
          date: stat.date,
          views: stat.views || 0,
          uniqueViews: stat.uniqueViews || 0,
          checkins: stat.checkins || 0,
          vibeChecks: stat.vibeChecks || 0,
          reviews: stat.reviews || 0,
        })),
        hourlyStats: [], // Placeholder - would need hourly tracking
        topDays: topDays.map((day) => ({
          date: day.date,
          views: day.views || 0,
        })),
      };
    });
  }

  async getPlatformAnalytics(
    period: string = "30d"
  ): Promise<PlatformAnalytics> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      // Get total counts
      const [totalUsersResult] = await db
        .select({ count: count() })
        .from(users);

      const [totalVenuesResult] = await db
        .select({ count: count() })
        .from(venues)
        .where(eq(venues.isActive, true));

      // Get analytics totals
      const analyticsResult = await db
        .select({
          totalVibeChecks: sql<number>`COALESCE(SUM(${venueAnalytics.vibeChecks}), 0)`,
          totalReviews: sql<number>`COALESCE(SUM(${venueAnalytics.reviews}), 0)`,
        })
        .from(venueAnalytics)
        .where(gte(venueAnalytics.date, startDateStr));

      // Get top venues
      const topVenues = await db
        .select({
          id: venues.id,
          name: venues.name,
          views: sql<number>`COALESCE(SUM(${venueAnalytics.views}), 0)`,
          checkins: sql<number>`COALESCE(SUM(${venueAnalytics.checkins}), 0)`,
        })
        .from(venues)
        .leftJoin(venueAnalytics, eq(venues.id, venueAnalytics.venueId))
        .where(
          and(eq(venues.isActive, true), gte(venueAnalytics.date, startDateStr))
        )
        .groupBy(venues.id, venues.name)
        .orderBy(desc(sql`COALESCE(SUM(${venueAnalytics.views}), 0)`))
        .limit(10);

      // Get growth data (simplified)
      const growthData = await db
        .select({
          date: venueAnalytics.date,
          totalVibeChecks: sql<number>`COALESCE(SUM(${venueAnalytics.vibeChecks}), 0)`,
        })
        .from(venueAnalytics)
        .where(gte(venueAnalytics.date, startDateStr))
        .groupBy(venueAnalytics.date)
        .orderBy(desc(venueAnalytics.date));

      const analytics = analyticsResult[0] || {
        totalVibeChecks: 0,
        totalReviews: 0,
      };

      return {
        totalUsers: totalUsersResult?.count || 0,
        totalVenues: totalVenuesResult?.count || 0,
        totalVibeChecks: analytics.totalVibeChecks,
        totalReviews: analytics.totalReviews,
        dailyActiveUsers: 0, // Placeholder - would need user activity tracking
        monthlyActiveUsers: 0, // Placeholder - would need user activity tracking
        topVenues: topVenues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          views: venue.views,
          checkins: venue.checkins,
        })),
        growthData: growthData.map((data) => ({
          date: data.date,
          newUsers: 0, // Placeholder
          newVenues: 0, // Placeholder
          totalVibeChecks: data.totalVibeChecks,
        })),
      };
    });
  }

  async recordVenueView(
    venueId: string,
    isUnique: boolean = false
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const today = new Date().toISOString().split("T")[0];

      await db
        .insert(venueAnalytics)
        .values({
          venueId,
          date: today,
          views: 1,
          uniqueViews: isUnique ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [venueAnalytics.venueId, venueAnalytics.date],
          set: {
            views: sql`${venueAnalytics.views} + 1`,
            uniqueViews: isUnique
              ? sql`${venueAnalytics.uniqueViews} + 1`
              : venueAnalytics.uniqueViews,
            updatedAt: new Date(),
          },
        });
    });
  }

  async recordVenueCheckin(venueId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const today = new Date().toISOString().split("T")[0];

      await db
        .insert(venueAnalytics)
        .values({
          venueId,
          date: today,
          checkins: 1,
        })
        .onConflictDoUpdate({
          target: [venueAnalytics.venueId, venueAnalytics.date],
          set: {
            checkins: sql`${venueAnalytics.checkins} + 1`,
            updatedAt: new Date(),
          },
        });
    });
  }

  async recordVibeCheck(venueId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const today = new Date().toISOString().split("T")[0];

      await db
        .insert(venueAnalytics)
        .values({
          venueId,
          date: today,
          vibeChecks: 1,
        })
        .onConflictDoUpdate({
          target: [venueAnalytics.venueId, venueAnalytics.date],
          set: {
            vibeChecks: sql`${venueAnalytics.vibeChecks} + 1`,
            updatedAt: new Date(),
          },
        });
    });
  }

  async recordReview(venueId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const today = new Date().toISOString().split("T")[0];

      await db
        .insert(venueAnalytics)
        .values({
          venueId,
          date: today,
          reviews: 1,
        })
        .onConflictDoUpdate({
          target: [venueAnalytics.venueId, venueAnalytics.date],
          set: {
            reviews: sql`${venueAnalytics.reviews} + 1`,
            updatedAt: new Date(),
          },
        });
    });
  }

  async getAnalyticsExport(
    startDate: string,
    endDate: string,
    venueIds?: string[]
  ): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const db = this.db();

      const conditions = [
        gte(venueAnalytics.date, startDate),
        lte(venueAnalytics.date, endDate),
      ];

      if (venueIds && venueIds.length > 0) {
        conditions.push(sql`${venueAnalytics.venueId} = ANY(${venueIds})`);
      }

      const result = await db
        .select()
        .from(venueAnalytics)
        .where(and(...conditions))
        .orderBy(desc(venueAnalytics.date), desc(venueAnalytics.venueId));

      return result;
    });
  }

  async getVenueComparison(
    venueIds: string[],
    period: string = "30d"
  ): Promise<
    Array<{
      venueId: string;
      venueName: string;
      totalViews: number;
      totalCheckins: number;
      totalVibeChecks: number;
      averageRating: number;
    }>
  > {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const result = await db
        .select({
          venueId: venues.id,
          venueName: venues.name,
          totalViews: sql<number>`COALESCE(SUM(${venueAnalytics.views}), 0)`,
          totalCheckins: sql<number>`COALESCE(SUM(${venueAnalytics.checkins}), 0)`,
          totalVibeChecks: sql<number>`COALESCE(SUM(${venueAnalytics.vibeChecks}), 0)`,
        })
        .from(venues)
        .leftJoin(
          venueAnalytics,
          and(
            eq(venues.id, venueAnalytics.venueId),
            gte(venueAnalytics.date, startDateStr)
          )
        )
        .where(sql`${venues.id} = ANY(${venueIds})`)
        .groupBy(venues.id, venues.name);

      return result.map((row) => ({
        venueId: row.venueId,
        venueName: row.venueName,
        totalViews: row.totalViews,
        totalCheckins: row.totalCheckins,
        totalVibeChecks: row.totalVibeChecks,
        averageRating: 0, // Placeholder - would need reviews calculation
      }));
    });
  }

  private parsePeriodToDays(period: string): number {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 7; // Default to 7 days

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
      case "d":
        return value;
      case "w":
        return value * 7;
      case "m":
        return value * 30;
      case "y":
        return value * 365;
      default:
        return 7;
    }
  }

  async logUserActivity(
    userId: string | null,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db();

      await db.insert(userActivityLogs).values({
        userId,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        metadata: metadata || {},
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });
    });
  }

  async getUserActivityStats(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActivity: Array<{
      action: string;
      resourceType: string | null;
      createdAt: Date;
    }>;
  }> {
    return this.executeWithRetry(async () => {
      const db = this.db();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total actions
      const [totalResult] = await db
        .select({ count: count() })
        .from(userActivityLogs)
        .where(
          and(
            eq(userActivityLogs.userId, userId),
            gte(userActivityLogs.createdAt, startDate)
          )
        );

      // Get actions by type
      const actionsByTypeResult = await db
        .select({
          action: userActivityLogs.action,
          count: count(),
        })
        .from(userActivityLogs)
        .where(
          and(
            eq(userActivityLogs.userId, userId),
            gte(userActivityLogs.createdAt, startDate)
          )
        )
        .groupBy(userActivityLogs.action);

      // Get recent activity
      const recentActivity = await db
        .select({
          action: userActivityLogs.action,
          resourceType: userActivityLogs.resourceType,
          createdAt: userActivityLogs.createdAt,
        })
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId))
        .orderBy(desc(userActivityLogs.createdAt))
        .limit(20);

      const actionsByType: Record<string, number> = {};
      actionsByTypeResult.forEach((row) => {
        actionsByType[row.action] = row.count;
      });

      return {
        totalActions: totalResult?.count || 0,
        actionsByType,
        recentActivity: recentActivity
          .filter((activity) => activity.createdAt !== null)
          .map((activity) => ({
            action: activity.action,
            resourceType: activity.resourceType,
            createdAt: activity.createdAt!,
          })),
      };
    });
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
