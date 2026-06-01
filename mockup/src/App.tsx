import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-xs font-semibold text-warning-foreground">
          ⚠ MOCKUP — FAKE DATA · DEVOPS-17921 design spike · not connected to any real platform
        </div>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
