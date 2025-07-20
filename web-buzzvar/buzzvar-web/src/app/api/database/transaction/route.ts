import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/neon-client";
import { sql } from "drizzle-orm";

// Transaction endpoint for mobile app
export async function POST(request: NextRequest) {
  try {
    const { operations } = await request.json();

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        {
          error: "Invalid operations parameter",
        },
        { status: 400 }
      );
    }

    // Validate all operations
    for (const operation of operations) {
      if (!operation.sql || typeof operation.sql !== "string") {
        return NextResponse.json(
          {
            error: "Invalid SQL operation",
          },
          { status: 400 }
        );
      }

      // Security: Only allow SELECT, INSERT, UPDATE queries for mobile app
      const trimmedQuery = operation.sql.trim().toLowerCase();
      const allowedOperations = ["select", "insert", "update"];
      const isAllowed = allowedOperations.some((op) =>
        trimmedQuery.startsWith(op)
      );

      if (!isAllowed) {
        return NextResponse.json(
          {
            error: "Only SELECT, INSERT, UPDATE queries are allowed",
          },
          { status: 403 }
        );
      }
    }

    // Execute transaction
    const results = await db().transaction(async (tx) => {
      const transactionResults = [];

      for (const operation of operations) {
        const params = Array.isArray(operation.params) ? operation.params : [];

        // For security, we'll use a simple parameter substitution
        // This is a basic implementation - in production you'd want more robust parameter handling
        let finalSql = operation.sql;
        if (params.length > 0) {
          // Replace $1, $2, etc. with actual values (basic implementation)
          params.forEach((param: string, index: number) => {
            const placeholder = `$${index + 1}`;
            const value =
              typeof param === "string"
                ? `'${param.replace(/'/g, "''")}'`
                : param;
            finalSql = finalSql.replace(placeholder, value);
          });
        }

        const result = await tx.execute(sql.raw(finalSql));
        transactionResults.push({
          rowCount: result.rowCount,
          rows: result.rows,
        });
      }

      return transactionResults;
    });

    return NextResponse.json({
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Transaction error:", error);
    return NextResponse.json(
      {
        error: "Transaction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
