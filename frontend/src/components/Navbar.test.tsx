import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationProvider } from "../context/NotificationContext";
import { WebSocketProvider } from "../contexts/WebSocketContext";
import { WatchlistProvider } from "../hooks/useWatchlist";
import ThemeProvider from "../theme/ThemeProvider";
import Navbar from "./Navbar";
import { useNotificationStore } from "../stores/notificationStore";

function resetNotifications() {
  useNotificationStore.setState(useNotificationStore.getInitialState(), true);
}

describe("Navbar", () => {
  it("toggles the mobile navigation panel", () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WebSocketProvider>
              <WatchlistProvider>
                <NotificationProvider>
                  <Navbar />
                </NotificationProvider>
              </WatchlistProvider>
            </WebSocketProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    const toggle = screen.getByRole("button", { name: /toggle navigation/i });
    expect(document.getElementById("mobile-nav-links")).toBeNull();

    fireEvent.click(toggle);
    expect(document.getElementById("mobile-nav-links")).toBeTruthy();

    fireEvent.click(toggle);
    expect(document.getElementById("mobile-nav-links")).toBeNull();
  });
});
