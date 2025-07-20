import { NextRequest, NextResponse } from "next/server";
import { FileUploadService } from "@/lib/services/file-upload-service";
import { venueService } from "@/lib/database/services";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = id;

    if (!venueId) {
      return NextResponse.json(
        { error: "Venue ID is required" },
        { status: 400 }
      );
    }

    // Check if venue exists
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file or type" },
        { status: 400 }
      );
    }

    if (!["image", "video"].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "image" or "video"' },
        { status: 400 }
      );
    }

    // Upload file
    const result = await FileUploadService.uploadFile(file, venueId, "venues", {
      maxSizeMB: type === "video" ? 50 : 10,
      allowedTypes:
        type === "video"
          ? ["video/mp4", "video/webm", "video/quicktime"]
          : ["image/jpeg", "image/png", "image/webp"],
      quality: 0.8,
    });

    if (!result.success || !result.url) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Update venue with new media URL
    const updateData =
      type === "image"
        ? { coverImageUrl: result.url }
        : { coverVideoUrl: result.url };

    await venueService.updateVenue(venueId, updateData as any);

    return NextResponse.json({
      url: result.url,
      key: result.key,
      type,
      success: true,
    });
  } catch (error) {
    console.error("Venue media upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = id;
    const { url, type } = await request.json();

    if (!venueId || !url || !type) {
      return NextResponse.json(
        { error: "Missing required fields: url or type" },
        { status: 400 }
      );
    }

    // Check if venue exists
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Delete file from R2
    const deleteResult = await FileUploadService.deleteFile(url);

    if (!deleteResult.success) {
      console.warn("Failed to delete file from R2:", deleteResult.error);
      // Continue with database update even if R2 deletion fails
    }

    // Update venue to remove media URL
    const updateData =
      type === "image" ? { coverImageUrl: null } : { coverVideoUrl: null };

    await venueService.updateVenue(venueId, updateData as any);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Venue media deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
