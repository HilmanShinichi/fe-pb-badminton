import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { store, type RootState } from "./store/store";
import { Layout } from "./ui";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { MabarListPage, MabarDetailPage } from "./pages/Mabar";
import { PeriodListPage, PeriodDetailPage } from "./pages/Periods";
import { PlayersPage } from "./pages/Players";
import { InventoryPage } from "./pages/Inventory";
import { FinancePage } from "./pages/Finance";
import { ReportsPage } from "./pages/Reports";
import { NoShowTrackerPage } from "./pages/NoShowTracker";
import { SimulatorPage } from "./pages/Simulator";
import { MatchMakerListPage, MatchMakerDetailPage } from "./pages/MatchMaker";
import { LiveEventPage, LiveIndexPage } from "./pages/Live";
import { I18nProvider } from "./i18n";
import "./index.css";

function Guard({ children }: { children: JSX.Element }) {
  const token = useSelector((s: RootState) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/live" element={<LiveIndexPage />} />
            <Route path="/live/:id" element={<LiveEventPage />} />
            <Route path="/" element={<Guard><DashboardPage /></Guard>} />
            <Route path="/mabar" element={<Guard><MabarListPage /></Guard>} />
            <Route path="/mabar/:id" element={<Guard><MabarDetailPage /></Guard>} />
            <Route path="/periods" element={<Guard><PeriodListPage /></Guard>} />
            <Route path="/periods/:id" element={<Guard><PeriodDetailPage /></Guard>} />
            <Route path="/players" element={<Guard><PlayersPage /></Guard>} />
            <Route path="/no-shows" element={<Guard><NoShowTrackerPage /></Guard>} />
            <Route path="/inventory" element={<Guard><InventoryPage /></Guard>} />
            <Route path="/finance" element={<Guard><FinancePage /></Guard>} />
            <Route path="/reports" element={<Guard><ReportsPage /></Guard>} />
            <Route path="/simulator" element={<Guard><SimulatorPage /></Guard>} />
            <Route path="/match-maker" element={<Guard><MatchMakerListPage /></Guard>} />
            <Route path="/match-maker/:id" element={<Guard><MatchMakerDetailPage /></Guard>} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </StrictMode>
);
