import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light" : "Switch to dark"}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 px-1 transition-colors hover:bg-sidebar-foreground/20",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow transition-transform",
          isDark ? "translate-x-6" : "translate-x-0",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
