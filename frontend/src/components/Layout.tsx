import { useState, useCallback, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { Breadcrumb } from "./Breadcrumb";
import { ComponentErrorBoundary } from "./ErrorBoundary";
import ShortcutHelp from "./ShortcutHelp";
import MaintenanceBanner from "./MaintenanceBanner";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export default function Layout() {
  const { pathname } = useLocation();
  const showBreadcrumbs = pathname !== "/dashboard";

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const openHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const closeHelp = useCallback(() => setShortcutHelpOpen(false), []);

  // Listen for open-shortcuts event dispatched by Navbar "?" button
  useEffect(() => {
    window.addEventListener("bridgewatch:open-shortcuts", openHelp);
    return () => window.removeEventListener("bridgewatch:open-shortcuts", openHelp);
  }, [openHelp]);

  // Forward "/" shortcut to GlobalSearch via custom event (avoids tight coupling)
  const openSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("bridgewatch:open-search"));
  }, []);

  useKeyboardShortcuts({ onOpenHelp: openHelp, onOpenSearch: openSearch });

  return (
    <div className="min-h-screen bg-stellar-dark">
      <Navbar />
      <MaintenanceBanner />
      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-none"
      >
        {showBreadcrumbs && <Breadcrumb />}
        <ComponentErrorBoundary context="PageContent" severity="high">
          <Outlet />
        </ComponentErrorBoundary>
      </main>

      <ShortcutHelp isOpen={shortcutHelpOpen} onClose={closeHelp} />
    </div>
  );
}
