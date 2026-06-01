import { NavLink } from "react-router-dom";
import { BellRing, FileText, LineChart } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const item = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
    isActive
      ? "bg-sidebar-accent text-white shadow-sm"
      : "text-sidebar-foreground/75 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
  );

const links = [
  { to: "/per-team", label: "Per-team", icon: LineChart },
  { to: "/defined", label: "Defined alerts", icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/30">
          <BellRing className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-foreground">Alerts Dashboard</div>
          <div className="text-[11px] text-sidebar-foreground/55">P1 hygiene per team</div>
        </div>
      </div>

      <div className="mx-3 h-px bg-sidebar-border" />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={item}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* footer: clickable profile + theme toggle */}
      <div className="mx-3 h-px bg-sidebar-border" />
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-foreground/10",
              isActive && "bg-sidebar-foreground/10",
            )
          }
        >
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent/20 text-sidebar-foreground">GK</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-sidebar-foreground">Giorgi K.</div>
            <div className="truncate text-[11px] text-sidebar-foreground/55">View profile</div>
          </div>
        </NavLink>
        <ThemeToggle />
      </div>
    </aside>
  );
}
