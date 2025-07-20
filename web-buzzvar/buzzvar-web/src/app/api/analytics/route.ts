import {
  withAuth,
  withDatabase,
  createApiResponse,
  handleApiError,
  checkVenueOwnership,
  AuthenticatedRequest,
  ApiHandler,
  ApiResponse,
} from "@/lib/api/middleware";
import { NextResponse } from "next/server";
import { analyticsService } from "@/lib/database/services/analytics-service";

// Types for better type safety
type AnalyticsType = "platform" | "venue" | "system-health" | "real-time";
type TimePeriod = "1d" | "7d" | "30d" | "90d" | "1y";

interface AnalyticsQuery {
  type: AnalyticsType;
  venueId?: string;
  period: TimePeriod;
}

// Constants
const DEFAULT_PERIOD: TimePeriod = "7d";
const SUPPORTED_TYPES: AnalyticsType[] = [
  "platform",
  "venue",
  "system-health",
  "real-time",
];

// Validation helpers
const validateAnalyticsType = (type: string | null): type is AnalyticsType => {
  return type !== null && SUPPORTED_TYPES.includes(type as AnalyticsType);
};

const validateTimePeriod = (period: string | null): period is TimePeriod => {
  const validPeriods: TimePeriod[] = ["1d", "7d", "30d", "90d", "1y"];
  return period !== null && validPeriods.includes(period as TimePeriod);
};

// Parse and validate query parameters
const parseAnalyticsQuery = (
  searchParams: URLSearchParams
): AnalyticsQuery | { error: string } => {
  const typeParam = searchParams.get("type");
  const venueId = searchParams.get("venueId");
  const periodParam = searchParams.get("period");

  if (!validateAnalyticsType(typeParam)) {
    return {
      error: `Invalid or missing type parameter. Supported types: ${SUPPORTED_TYPES.join(
        ", "
      )}`,
    };
  }

  const period = validateTimePeriod(periodParam) ? periodParam : DEFAULT_PERIOD;

  return {
    type: typeParam,
    venueId: venueId || undefined,
    period,
  };
};

// Analytics handlers for each type
const handlePlatformAnalytics = async (
  period: TimePeriod
): Promise<NextResponse<ApiResponse>> => {
  const data = await analyticsService.getPlatformAnalytics(period);
  return createApiResponse(data, {
    message: "Platform analytics retrieved successfully",
  });
};

const handleSystemHealth = async (): Promise<NextResponse<ApiResponse>> => {
  // TODO: Implement proper system health metrics
  const systemHealth = {
    status: "healthy" as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
  };

  return createApiResponse(systemHealth, {
    message: "System health metrics retrieved successfully",
  });
};

const handleRealTimeMetrics = async (): Promise<NextResponse<ApiResponse>> => {
  // TODO: Implement real-time metrics from Redis/WebSocket connections
  const realTimeMetrics = {
    activeUsers: 0,
    activeConnections: 0,
    timestamp: new Date().toISOString(),
  };

  return createApiResponse(realTimeMetrics, {
    message: "Real-time metrics retrieved successfully",
  });
};

const handleVenueAnalytics = async (
  venueId: string,
  period: TimePeriod,
  userId: string,
  isAdmin: boolean,
  db: any
): Promise<NextResponse<ApiResponse>> => {
  // Check venue access permissions
  if (!isAdmin) {
    const hasAccess = await checkVenueOwnership(db, userId, venueId, isAdmin);
    if (!hasAccess) {
      return createApiResponse(undefined, {
        status: 403,
        error: "Access denied",
        message: "You do not have permission to view analytics for this venue",
      });
    }
  }

  const data = await analyticsService.getVenueAnalytics(venueId, period);
  return createApiResponse(data, {
    message: "Venue analytics retrieved successfully",
  });
};

const handler: ApiHandler = async (
  request: AuthenticatedRequest
): Promise<NextResponse<ApiResponse>> => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: "Authentication required",
      });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = parseAnalyticsQuery(searchParams);

    if ("error" in queryResult) {
      return createApiResponse(undefined, {
        status: 400,
        error: "Invalid request parameters",
        message: queryResult.error,
      });
    }

    const { type, venueId, period } = queryResult;
    const { user, db } = request;

    // Admin-only endpoints
    const adminOnlyTypes: AnalyticsType[] = [
      "platform",
      "system-health",
      "real-time",
    ];
    if (adminOnlyTypes.includes(type) && !user.isAdmin) {
      return createApiResponse(undefined, {
        status: 403,
        error: "Admin access required",
        message: `Only administrators can access ${type} analytics`,
      });
    }

    // Route to appropriate handler
    switch (type) {
      case "platform":
        return handlePlatformAnalytics(period);

      case "system-health":
        return handleSystemHealth();

      case "real-time":
        return handleRealTimeMetrics();

      case "venue":
        if (!venueId) {
          return createApiResponse(undefined, {
            status: 400,
            error: "Venue ID required",
            message: "venueId parameter is required for venue analytics",
          });
        }
        return handleVenueAnalytics(venueId, period, user.id, user.isAdmin, db);

      default:
        // This should never happen due to validation, but keeping for type safety
        return createApiResponse(undefined, {
          status: 400,
          error: "Invalid analytics type",
          message: `Supported types: ${SUPPORTED_TYPES.join(", ")}`,
        });
    }
  } catch (error) {
    return handleApiError(error, "Analytics GET") as NextResponse<ApiResponse>;
  }
};

export const GET = withAuth(withDatabase(handler), { requireAuth: true });
