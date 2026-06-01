import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, Settings, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent",
  );

/**
 * Account section uses a deliberately separate shell from the dashboard
 * (no dashboard sidebar) — a focused, centered settings/profile experience.
 */
export default function AccountLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/per-team" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <ThemeToggle className="border-border bg-secondary hover:bg-accent" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mb-6 text-sm text-muted-foreground">Your profile and the dashboard configuration.</p>

        <div className="mb-6 flex gap-2">
          <NavLink to="/account/profile" className={tab}>
            <User className="h-4 w-4" /> Profile
          </NavLink>
          <NavLink to="/account/settings" className={tab}>
            <Settings className="h-4 w-4" /> Settings
          </NavLink>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
