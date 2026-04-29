import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { GlobalErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "./context/NotificationContext";
import { useNotifications } from "./hooks/useNotifications";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const Bridges = lazy(() => import("./pages/Bridges"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Landing = lazy(() => import("./pages/Landing"));
const Settings = lazy(() => import("./pages/Settings"));
const WatchlistPage = lazy(() => import("./pages/Watchlist"));
const WatchlistsPage = lazy(() => import("./pages/Watchlists"));
const Transactions = lazy(() => import("./pages/Transactions"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const AlertRoutingAdmin = lazy(() => import("./pages/AlertRoutingAdmin"));
const SupplyChain = lazy(() => import("./pages/SupplyChain"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Help = lazy(() => import("./pages/Help"));

function NotificationInitializer() {
  useNotifications();
  return null;
}

function App() {
  return (
    <GlobalErrorBoundary>
      <NotificationProvider>
        <NotificationInitializer />
        <Suspense
          fallback={
            <div className="min-h-screen bg-stellar-dark flex items-center justify-center text-stellar-text-secondary">
              Loading page...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets/:symbol" element={<AssetDetail />} />
              <Route path="/bridges" element={<Bridges />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/watchlists" element={<WatchlistsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/api-keys" element={<ApiKeys />} />
              <Route path="/admin/alert-routing" element={<AlertRoutingAdmin />} />
              <Route path="/supply-chain" element={<SupplyChain />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Routes>
        </Suspense>
      </NotificationProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
