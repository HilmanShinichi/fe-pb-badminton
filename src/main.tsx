import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { store, type RootState } from "./store/store";
import { Layout } from "./ui";
import { LoginPage } from "./pages/Login";
import { LandingPage } from "./pages/LandingPage";
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
import { LiveEventPage, LiveIndexPage, LivePlayedPage, LiveRefereedPage, LiveArrivalPage } from "./pages/Live";
import { UsersPage } from "./pages/Users";
import { NoAccessPage } from "./pages/NoAccess";
import { I18nProvider } from "./i18n";
import { canAccess, homeFor } from "./permissions";
import "./index.css";

function Guard({ children }: { children: JSX.Element }) {
  const token = useSelector((s: RootState) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// NeedPerm keeps limited admins out of features they were not granted.
// Denied visits land on their home page (or /no-access when nothing is
// granted), never on a dead screen.
function Need({ perm, children }: { perm: string; children: JSX.Element }) {
  const auth = useSelector((s: RootState) => s.auth);
  if (!canAccess(auth.permissions, auth.isSuperadmin, perm)) {
    return <Navigate to={homeFor(auth.permissions, auth.isSuperadmin)} replace />;
  }
  return children;
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
            <Route path="/live/:id/played" element={<LivePlayedPage />} />
            <Route path="/live/:id/refereed" element={<LiveRefereedPage />} />
            <Route path="/live/:id/arrival" element={<LiveArrivalPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/no-access" element={<Guard><NoAccessPage /></Guard>} />
            <Route path="/users" element={<Guard><Need perm="users"><UsersPage /></Need></Guard>} />
            <Route path="/dashboard" element={<Guard><Need perm="dashboard"><DashboardPage /></Need></Guard>} />
            <Route path="/mabar" element={<Guard><Need perm="mabar"><MabarListPage /></Need></Guard>} />
            <Route path="/mabar/:id" element={<Guard><Need perm="mabar"><MabarDetailPage /></Need></Guard>} />
            <Route path="/periods" element={<Guard><Need perm="periods"><PeriodListPage /></Need></Guard>} />
            <Route path="/periods/:id" element={<Guard><Need perm="periods"><PeriodDetailPage /></Need></Guard>} />
            <Route path="/players" element={<Guard><Need perm="players"><PlayersPage /></Need></Guard>} />
            <Route path="/no-shows" element={<Guard><Need perm="reports"><NoShowTrackerPage /></Need></Guard>} />
            <Route path="/inventory" element={<Guard><Need perm="inventory"><InventoryPage /></Need></Guard>} />
            <Route path="/finance" element={<Guard><Need perm="finance"><FinancePage /></Need></Guard>} />
            <Route path="/reports" element={<Guard><Need perm="reports"><ReportsPage /></Need></Guard>} />
            <Route path="/simulator" element={<Guard><Need perm="simulator"><SimulatorPage /></Need></Guard>} />
            <Route path="/match-maker" element={<Guard><Need perm="matchmaker"><MatchMakerListPage /></Need></Guard>} />
            <Route path="/match-maker/:id" element={<Guard><Need perm="matchmaker"><MatchMakerDetailPage /></Need></Guard>} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </StrictMode>
);
