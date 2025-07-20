import { redirect } from "next/navigation";
import {
  auth,
  getUserRole,
  isVenueOwner,
  isAdmin,
} from "@/lib/auth/better-auth-server";
import { headers } from "next/headers";
import { PromotionManagement } from "@/components/promotions/PromotionManagement";
import { promotionService } from "@/lib/database/services";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function PromotionsPage() {
  // Get session on server side
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = await getUserRole(session.user.id);
  const userIsAdmin = await isAdmin(session.user.id);
  const userIsVenueOwner = await isVenueOwner(session.user.id);

  if (!userIsVenueOwner && !userIsAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be a venue owner to access promotion management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get user's venues if they're a venue owner
  let venueId: string | null = null;
  if (userIsVenueOwner && !userIsAdmin) {
    // For venue owners, get their first venue
    // TODO: Implement proper venue selection for multi-venue owners
    const venues = await promotionService.getUserVenues(session.user.id);
    venueId = venues[0]?.id || null;
  }

  if (userIsVenueOwner && !userIsAdmin && !venueId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No venue found. Please register your venue first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For admins, they can manage all venues, so venueId can be null initially
  const initialVenueId = venueId || (userIsAdmin ? "admin-view" : null);

  return (
    <div className="p-6">
      <PromotionManagement
        initialVenueId={initialVenueId || ""}
        userRole={userRole || "user"}
        isAdmin={userIsAdmin}
        isVenueOwner={userIsVenueOwner}
      />
    </div>
  );
}
