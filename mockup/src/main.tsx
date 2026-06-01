import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import App from "./App";
import AccountLayout from "./layouts/AccountLayout";
import { ThemeProvider } from "./components/theme-provider";
import PerTeamView from "./views/PerTeamView";
import AllTeamsView from "./views/AllTeamsView";
import OrphanAlertsView from "./views/OrphanAlertsView";
import IngestionView from "./views/IngestionView";
import ExportView from "./views/ExportView";
import ProfileView from "./views/ProfileView";
import SettingsView from "./views/SettingsView";
import "./styles.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/per-team" replace /> },
      { path: "per-team", element: <PerTeamView /> },
      { path: "all-teams", element: <AllTeamsView /> },
      { path: "orphans", element: <OrphanAlertsView /> },
      { path: "ingestion", element: <IngestionView /> },
      { path: "export", element: <ExportView /> },
    ],
  },
  {
    path: "/account",
    element: <AccountLayout />,
    children: [
      { index: true, element: <Navigate to="/account/profile" replace /> },
      { path: "profile", element: <ProfileView /> },
      { path: "settings", element: <SettingsView /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
