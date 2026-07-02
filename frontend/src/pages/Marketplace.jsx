import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, euros } from "../api.js";
import ExpiryGauge from "../components/ExpiryGauge.jsx";

export default function Marketplace() {
  const [listings, setListings] = useState(null);
  const [q, setQ] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [storage, setStorage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (urgent) params.set("urgentOnly", "1");
    if (storage) params.set("storage", storage);

    const timer = setTimeout(() => {
      api(`/listings?${params}`)
        .then(setListings)
        .catch(() => setListings([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [q, urgent, storage]);

  return (
    <>
      <h1>Disponibilités du réseau</h1>
      <p className="meta">
        Lots proches de péremption mis à disposition au prix coûtant par des
        structures vérifiées, pour répondre à vos besoins de dépannage.
      </p>

      <div className="filters">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un médicament (ex. pembrolizumab)…"
          aria-label="Rechercher"
        />
        <button
          className={`chip ${urgent ? "on" : ""}`}
          onClick={() => setUrgent(!urgent)}
        >
          ⏳ Péremption &lt; 60 j
        </button>
        <button
          className={`chip ${storage === "FRIGO" ? "on" : ""}`}
          onClick={() => setStorage(storage === "FRIGO" ? "" : "FRIGO")}
        >
          ❄️ Chaîne du froid
        </button>
      </div>

      {!listings && <p className="empty">Chargement…</p>}
      {listings?.length === 0 && (
        <p className="empty">Aucune disponibilité ne correspond. Élargissez vos filtres ou revenez plus tard.</p>
      )}

      <div className="grid">
        {listings?.map((l) => (
          <Link key={l.id} to={`/disponibilite/${l.id}`} className="card" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="badges">
              {l.org.licenceVerified && <span className="badge badge-green">✓ Vérifiée</span>}
              {l.storage === "FRIGO" && <span className="badge badge-cold">❄ 2–8 °C</span>}
              {l.storage === "CONGELE" && <span className="badge badge-cold">❄ Congelé</span>}
              {l._count?.offers > 0 && (
                <span className="badge badge-amber">{l._count.offers} demande(s)</span>
              )}
            </div>
            <h3>{l.medicationName} {l.dosage}</h3>
            <div className="meta">
              {l.form} · lot {l.batchNumber} · {l.quantity} unité(s)
            </div>
            <div className="meta">{l.org.name} — {l.org.city}</div>
            <ExpiryGauge expiryDate={l.expiryDate} />
            <div className="price">
              {euros(l.unitCostCents)} <small>/ unité · prix coûtant</small>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
