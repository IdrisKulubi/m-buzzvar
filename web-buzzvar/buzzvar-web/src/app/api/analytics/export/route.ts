import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth/better-auth-server";
import { headers } from "next/headers";
import { checkVenueOwnership } from "@/lib/api/middleware";
import { AdminService } from "@/services/adminService";
import { AnalyticsService } from "@/services/analyticsService";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === "production",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userIsAdmin = await isAdmin(session.user.id);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'platform' or 'venue'
    const format = (searchParams.get("format") as "csv" | "json") || "csv";
    const venueId = searchParams.get("venueId");

    let blob: Blob;
    let filename: string;

    switch (type) {
      case "platform":
        if (!userIsAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }
        blob = await AdminService.exportPlatformAnalytics(format);
        filename = `platform-analytics-${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        break;

      case "venue":
        if (!venueId) {
          return NextResponse.json(
            { error: "Venue ID required" },
            { status: 400 }
          );
        }

        // Check if user owns the venue or is admin
        if (!userIsAdmin) {
          const client = await pool.connect();
          try {
            const db = {
              query: client.query.bind(client),
              release: client.release.bind(client),
            };
            const hasAccess = await checkVenueOwnership(
              db,
              session.user.id,
              venueId,
              userIsAdmin
            );
            if (!hasAccess) {
              return NextResponse.json(
                { error: "Access denied" },
                { status: 403 }
              );
            }
          } finally {
            client.release();
          }
        }

        blob = await AnalyticsService.exportVenueAnalytics(venueId, format);
        filename = `venue-analytics-${venueId}-${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": blob.type,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Analytics export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
