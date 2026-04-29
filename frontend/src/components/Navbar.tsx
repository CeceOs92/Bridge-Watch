import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import NotificationsDrawer from "./NotificationsDrawer";
import UnreadCountBadge from "./UnreadCountBadge";
import { useNotificationLiveUpdates } from "../hooks/useNotificationLiveUpdates";
import { selectUnreadCount, useNotificationStore } from "../stores/notificationStore";

const NAV_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/bridges", label: "Bridges" },
  { to: "/analytics", label: "Analytics" },
  { to: "/watchlists", label: "Watchlists" },
  { to: "/incidents", label: "Incidents" },
];

function matchesRoute(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Navbar() {
  const location = useLocation();
  const { activeSymbols } = useWatchlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="border-b border-stellar-border bg-stellar-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-white">
            Bridge Watch
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  matchesRoute(location.pathname, link.to)
                    ? "bg-stellar-blue text-white"
                    : "text-stellar-text-secondary hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden rounded-md px-2 py-1 text-sm text-stellar-text-secondary hover:bg-stellar-dark hover:text-white lg:inline-flex"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("bridgewatch:open-shortcuts"))
            }
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
          <div className="hidden items-center gap-2 text-xs text-stellar-text-secondary lg:flex">
            <span>Quick:</span>
            {activeSymbols.length === 0 ? (
              <span>No watchlist assets</span>
            ) : (
              activeSymbols.slice(0, 3).map((symbol) => (
                <Link
                  key={symbol}
                  to={`/assets/${symbol}`}
                  className="rounded border border-stellar-border px-2 py-1 hover:text-white"
                >
                  {symbol}
                </Link>
              ))
            )}
          </div>

          <button
            type="button"
            className="inline-flex rounded-md border border-stellar-border p-2 text-stellar-text-secondary hover:bg-stellar-dark hover:text-white md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-links"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div id="mobile-nav-links" className="border-t border-stellar-border px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  matchesRoute(location.pathname, link.to)
                    ? "bg-stellar-blue text-white"
                    : "text-stellar-text-secondary hover:bg-stellar-dark hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
