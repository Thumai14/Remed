import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, euros } from "../api.js";
import ExpiryGauge from "../components/ExpiryGauge.jsx";
import PlanGate from "../components/PlanGate.jsx";

const REASONS = [
  ["RUPTURE", "Rupture d'approvisionnement"],
  ["TENSION", "Tension d'approvisionnement"],
  ["BESOIN_URGENT", "Besoin urgent (patient en cours de traitement)"],
];

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState({ quantity: 1, needReason: "RUPTURE", needDetails: "", message: "" });
  const [error, setError] = useState(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/listings/${id}`)
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setUpgradeNeeded(false);
    try {
      await api(`/listings/${id}/offers`, {
        method: "POST",
        body: {
          quantity: Number(form.quantity),
          needReason: form.needReason,
          needDetails: form.needDetails,
          message: form.message || undefined,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
      if (err.data?.upgradeRequired) setUpgradeNeeded(true);
    }
  }

  if (loading) return <p className="empty">Chargement…</p>;
  if (error && !listing) return <div className="error-msg">{error}</div>;
  if (!listing) return null;

  const myOffer = listing.offers?.[0];
  const totalCents = (Number(form.quantity) || 0) * listing.unitCostCents;

  return (
    <>
      <Link to="/disponibilites" style={{ fontSize: 13, marginBottom: 8, display: "inline-block" }}>
        ← Retour aux disponibilités
      </Link>

      <div className="badges" style={{ marginTop: 8 }}>
        {listing.org.licenceVerified && <span className="badge badge-green">✓ Structure vérifiée</span>}
        {listing.storage !== "AMBIANT" && (
          <span className="badge badge-cold">
            ❄ {listing.storage === "FRIGO" ? "2–8 °C" : "Congelé"}
          </span>
        )}
        <span className="badge badge-neutral">Prix coûtant — sans marge</span>
      </div>

      <h1 style={{ marginTop: 8 }}>{listing.medicationName} {listing.dosage}</h1>

      <p className="meta">
        {listing.form} · lot {listing.batchNumber} · {listing.quantity} unité(s) disponibles
        {listing.cipCode && <> · CIP {listing.cipCode}</>}
        <br />
        Mis à disposition par <b>{listing.org.name}</b> ({listing.org.city})
        {listing.org.finess && <> · FINESS {listing.org.finess}</>}
      </p>

      <div style={{ maxWidth: 420, margin: "16px 0" }}>
        <ExpiryGauge expiryDate={listing.expiryDate} />
      </div>

      <p className="price">
        {euros(listing.unitCostCents)} <small>/ unité — prix d'achat justifié du cédant</small>
      </p>

      {listing.notes && <p style={{ marginTop: 8 }}>{listing.notes}</p>}

      <h2>Demander un dépannage</h2>
      <p className="meta" style={{ marginBottom: 12 }}>
        Le dépannage inter-PUI répond à un besoin de votre établissement. Le motif
        déclaré figure au bon de cession et au courrier d'information ARS.
        Le règlement s'effectue directement entre établissements.
      </p>

      {myOffer && (
        <div className="upgrade-banner" style={{ marginBottom: 16, background: "var(--green-lt)", borderColor: "var(--line)" }}>
          <p>
            Vous avez déjà une demande{" "}
            <span className={`status st-${myOffer.status}`}>{myOffer.status}</span>{" "}
            sur ce lot — retrouvez-la dans{" "}
            <Link to="/depannages">Mes dépannages</Link>.
          </p>
        </div>
      )}

      {sent ? (
        <div className="upgrade-banner" style={{ background: "var(--green-lt)", borderColor: "var(--green)" }}>
          <p>
            <b>Demande envoyée !</b> Suivez la réponse du cédant dans{" "}
            <Link to="/depannages">Mes dépannages</Link>.
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          {error && !upgradeNeeded && <div className="error-msg">{error}</div>}
          {upgradeNeeded && (
            <PlanGate
              message="Quota du plan Découverte atteint. Passez au Pro pour des demandes illimitées et les documents automatiques."
              onUpgraded={() => { setUpgradeNeeded(false); setError(null); }}
            />
          )}

          <div className="row2">
            <label>
              Quantité
              <input
                type="number"
                min="1"
                max={listing.quantity}
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </label>
            <label>
              Motif du besoin
              <select
                value={form.needReason}
                onChange={(e) => setForm({ ...form, needReason: e.target.value })}
              >
                {REASONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Justification (figurera au bon de cession)
            <textarea
              rows="2"
              required
              minLength={10}
              placeholder="Rupture fournisseur depuis le 15/06, 3 patients en cours de traitement…"
              value={form.needDetails}
              onChange={(e) => setForm({ ...form, needDetails: e.target.value })}
            />
          </label>

          <label>
            Message au cédant (optionnel)
            <textarea
              rows="2"
              placeholder="Bonjour, nous sommes intéressés par ce lot…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>

          <p className="meta">
            Montant au prix coûtant : <b>{euros(totalCents)}</b> (hors transport)
          </p>

          <button className="btn" style={{ width: "100%" }}>
            Envoyer la demande de dépannage
          </button>
        </form>
      )}
    </>
  );
}
