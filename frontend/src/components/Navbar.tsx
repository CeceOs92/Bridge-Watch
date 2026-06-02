import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import NotificationsDrawer from "./NotificationsDrawer";
import UnreadCountBadge from "./UnreadCountBadge";
import { useNotificationLiveUpdates } from "../hooks/useNotificationLiveUpdates";
import { selectUnreadCount, useNotificationStore } from "../stores/notificationStore";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/bridges", label: "Bridges" },
  { to: "/analytics", label: "Analytics" },
  { to: "/watchlists", label: "Watchlists" },
];

export default function Navbar() {
  const location = useLocation();
  const { activeSymbols } = useWatchlist();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousDrawerOpen = useRef(false);
  const unreadCount = useNotificationStore(selectUnreadCount);

  useNotificationLiveUpdates();

  useEffect(() => {
    if (previousDrawerOpen.current && !isNotificationsOpen) {
      notificationTriggerRef.current?.focus();
    }
    previousDrawerOpen.current = isNotificationsOpen;
  }, [isNotificationsOpen]);

  return (
    <>
      <nav className="border-b border-stellar-border bg-stellar-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center space-x-8 min-w-0">
              <Link to="/" className="text-xl font-bold text-white shrink-0">
                Bridge Watch
              </Link>
              <div className="hidden md:flex space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
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
              <div className="hidden lg:flex items-center gap-2 text-xs text-stellar-text-secondary">
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

              {/*
                ARIA contract:
                - aria-expanded mirrors drawer open state.
                - aria-controls points to the drawer dialog id.
                Keyboard contract:
                - Enter/Space toggles drawer.
                - Escape closes drawer (handled in drawer) and focus returns here.
              */}
              <button
                ref={notificationTriggerRef}
                type="button"
                onClick={() => setIsNotificationsOpen((open) => !open)}
                className={`relative rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue ${
                  isNotificationsOpen
                    ? "bg-stellar-blue/20 text-white"
                    : "text-stellar-text-secondary hover:text-white"
                }`}
                aria-label={
                  isNotificationsOpen
                    ? "Close notifications"
                    : `Open notifications (${unreadCount} unread)`
                }
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-drawer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <UnreadCountBadge unreadCount={unreadCount} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <NotificationsDrawer
        open={isNotificationsOpen}
        drawerId="notifications-drawer"
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
