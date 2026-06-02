import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WatchlistProvider } from "../hooks/useWatchlist";
import Navbar from "./Navbar";
import { useNotificationStore } from "../stores/notificationStore";

function resetNotifications() {
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
}

describe("Navbar", () => {
  beforeEach(() => {
    localStorage.clear();
    resetNotifications();
  });

  it("opens notifications drawer and keeps trigger ARIA state in sync", () => {
    useNotificationStore.getState().addNotification({
      id: "n1",
      type: "info",
      priority: "medium",
      title: "One",
      message: "One",
      timestamp: 1,
    });

    render(
      <MemoryRouter>
        <WatchlistProvider>
          <Navbar />
        </WatchlistProvider>
      </MemoryRouter>
    );

    const trigger = screen.getByRole("button", { name: /open notifications/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "notifications-drawer");
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape and restores focus to trigger", () => {
    render(
      <MemoryRouter>
        <WatchlistProvider>
          <Navbar />
        </WatchlistProvider>
      </MemoryRouter>
    );

    const trigger = screen.getByRole("button", { name: /open notifications/i });
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
