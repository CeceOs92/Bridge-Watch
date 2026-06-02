import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { registerAction } from "./components/CommandPalette";
import { TimeRangeProvider } from "./hooks/useTimeRange";
import { WatchlistProvider } from "./hooks/useWatchlist";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  },
});

// Register a few built-in actions for the command palette
registerAction({ id: "goto-dashboard", title: "Go to Dashboard", href: "/dashboard", keywords: ["home", "dashboard"] });
registerAction({ id: "create-incident", title: "Create Incident", href: "/incidents", keywords: ["incident", "alert", "create"] });
registerAction({ id: "toggle-theme", title: "Toggle Dark Mode", onExecute: () => window.dispatchEvent(new CustomEvent('bridgewatch:toggle-theme')), keywords: ["theme", "dark", "light"] });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WatchlistProvider>
          <TimeRangeProvider>
            <App />
          </TimeRangeProvider>
        </WatchlistProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
