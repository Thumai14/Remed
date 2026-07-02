import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";

/**
 * Affiche un banner d'upgrade Pro quand l'utilisateur atteint la limite FREE.
 */
export default function PlanGate({ message, onUpgraded }) {
  const { refreshUser } = useAuth();

  async function handleUpgrade() {
    await api("/billing/upgrade", { method: "POST" });
    await refreshUser();
    if (onUpgraded) onUpgraded();
  }

  return (
    <div className="upgrade-banner">
      <div>
        <p><b>Plan Pro requis</b></p>
        <p className="meta">{message || "Passez au plan Pro pour débloquer cette fonctionnalité."}</p>
      </div>
      <button className="btn" onClick={handleUpgrade}>
        Activer le plan Pro (démo)
      </button>
    </div>
  );
}
