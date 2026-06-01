import { NavLink } from "react-router-dom";
import {
  AlertTriangle, BarChart3, BellRing, DownloadCloud, LineChart, Settings, User, Server,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sectionTitle = "px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50";

const item = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
    isActive
      ? "bg-sidebar-accent text-white shadow-sm"
      : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-white",
  );

const dashboardLinks = [
  { to: "/per-team", label: "Per-team", icon: LineChart },
  { to: "/all-teams", label: "All-teams", icon: BarChart3 },
  { to: "/orphans", label: "Orphan alerts", icon: AlertTriangle },
  { to: "/ingestion", label: "Ingestion & jobs", icon: Server },
  { to: "/export", label: "Export", icon: DownloadCloud },
];

const accountLinks = [
  { to: "/account/profile", label: "Profile", icon: User },
  { to: "/account/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
          <BellRing className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Alerts Dashboard</div>
          <div className="text-[11px] text-sidebar-foreground/55">P1 hygiene · per team · per PI</div>
        </div>
      </div>

      <div className="mx-3 h-px bg-sidebar-border" />

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className={sectionTitle}>Dashboard</div>
        <div className="space-y-1">
          {dashboardLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={item}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className={sectionTitle}>Account</div>
        <div className="space-y-1">
          {accountLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={item}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* footer: user + theme */}
      <div className="mx-3 h-px bg-sidebar-border" />
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-9 w-9 ring-2 ring-white/10">
            <AvatarFallback className="bg-blue-500/20 text-white">GK</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-white">Giorgi K.</div>
            <div className="truncate text-[11px] text-sidebar-foreground/55">SSO · read-only</div>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
