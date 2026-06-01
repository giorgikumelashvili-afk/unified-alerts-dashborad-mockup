import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import PerTeamView from "./views/PerTeamView";
import DefinedAlertsView from "./views/DefinedAlertsView";
import ProfileView from "./views/ProfileView";
import "./styles.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/per-team" replace /> },
      { path: "per-team", element: <PerTeamView /> },
      { path: "defined", element: <DefinedAlertsView /> },
      { path: "profile", element: <ProfileView /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
