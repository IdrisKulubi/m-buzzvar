import { ModeToggle } from "@/components/themes/mode-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Buzzvar Admin Portal</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Manage your venues, promotions, and analytics all in one place
        </p>
      </div>
      
      <div className="flex gap-4 items-center">
        <Button asChild size="lg">
          <Link href="/login">Get Started</Link>
        </Button>
        <ModeToggle />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl">
        <div className="text-center p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Venue Management</h3>
          <p className="text-sm text-muted-foreground">
            Update venue information, hours, and media
          </p>
        </div>
        <div className="text-center p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Promotions</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage special events and offers
          </p>
        </div>
        <div className="text-center p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track engagement and customer insights
          </p>
        </div>
      </div>
    </div>
  );
}