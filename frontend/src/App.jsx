import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.jsx";
import Login from "./pages/Login.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import NewListing from "./pages/NewListing.jsx";
import Deals from "./pages/Deals.jsx";

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">rem<span>e</span>d</div>
        <nav>
          <NavLink to="/disponibilites">Disponibilités</NavLink>
          <NavLink to="/publier">Mettre à disposition</NavLink>
          <NavLink to="/depannages">Mes dépannages</NavLink>
        </nav>
        <div className="userchip">
          <b>{user?.name}</b>
          {user?.orgName}
          {user?.plan === "PRO" && <span className="badge badge-green" style={{ marginLeft: 6, verticalAlign: "middle" }}>PRO</span>}
        </div>
        <button className="btn sm ghost" onClick={handleLogout}>
          Déconnexion
        </button>
      </header>
      <main className="page">{children}</main>
    </>
  );
}

function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Navigate to="/disponibilites" replace /> : <Login />} />
      <Route path="/disponibilites" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
      <Route path="/disponibilite/:id" element={<PrivateRoute><ListingDetail /></PrivateRoute>} />
      <Route path="/publier" element={<PrivateRoute><NewListing /></PrivateRoute>} />
      <Route path="/depannages" element={<PrivateRoute><Deals /></PrivateRoute>} />
      {/* Catch-all → redirige vers l'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
