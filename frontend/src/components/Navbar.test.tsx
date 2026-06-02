import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WatchlistProvider } from "../hooks/useWatchlist";
import Navbar from "./Navbar";
import { useNotificationStore } from "../stores/notificationStore";

const queryClient = new QueryClient();

function resetNotifications() {
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
}

describe("Navbar", () => {
  beforeEach(() => {
    resetNotifications();
  });
  it("toggles the mobile navigation panel", () => {
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
