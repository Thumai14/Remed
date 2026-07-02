import { useEffect, useState, useCallback } from "react";
import { api, euros } from "../api.js";
import PlanGate from "../components/PlanGate.jsx";

const REASON_LABELS = {
  RUPTURE: "Rupture",
  TENSION: "Tension",
  BESOIN_URGENT: "Besoin urgent",
};

export default function Deals() {
  const [role, setRole] = useState("seller");
  const [offers, setOffers] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api(`/offers?role=${role}`)
      .then(setOffers)
      .catch((e) => setError(e.message));
  }, [role]);

  useEffect(load, [load]);

  async function act(offerId, action) {
    setError(null);
    try {
      await api(`/offers/${offerId}`, { method: "PATCH", body: { action } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <h1>Mes dépannages</h1>
      <div className="filters">
        <button className={`chip ${role === "seller" ? "on" : ""}`} onClick={() => setRole("seller")}>
          Demandes reçues (je cède)
        </button>
        <button className={`chip ${role === "buyer" ? "on" : ""}`} onClick={() => setRole("buyer")}>
          Demandes envoyées (j'ai un besoin)
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {offers?.length === 0 && <p className="empty">Aucun dépannage pour le moment.</p>}

      {offers?.map((o) => (
        <div key={o.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3>{o.listing.medicationName} {o.listing.dosage}</h3>
              <div className="meta">
                {role === "seller"
                  ? `Demande de ${o.buyerOrg.name} (${o.buyerOrg.city})`
                  : `Cédant : ${o.listing.org.name} (${o.listing.org.city})`}
                {" · "}{o.quantity} unité(s) · <b>{euros(o.quantity * o.listing.unitCostCents)}</b> au prix coûtant
              </div>
              <div className="meta">
                Motif : <b>{REASON_LABELS[o.needReason] || o.needReason}</b> — {o.needDetails}
              </div>
            </div>
            <span className={`status st-${o.status}`}>{o.status}</span>
          </div>

          {/* Actions sur la demande */}
          {o.status === "PENDING" && role === "seller" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" onClick={() => act(o.id, "accept")}>Accepter</button>
              <button className="btn sm danger" onClick={() => act(o.id, "reject")}>Refuser</button>
            </div>
          )}
          {o.status === "PENDING" && role === "buyer" && (
            <button className="btn sm ghost" onClick={() => act(o.id, "withdraw")}>Retirer ma demande</button>
          )}

          {/* Dossier de cession */}
          {o.cession && <CessionPanel cession={o.cession} role={role} reload={load} />}

          {/* Chat */}
          <button
            className="btn sm ghost"
            onClick={() => setOpenChat(openChat === o.id ? null : o.id)}
          >
            {openChat === o.id ? "Fermer la discussion" : "💬 Discussion"}
          </button>
          {openChat === o.id && <Chat offerId={o.id} />}
        </div>
      ))}
    </>
  );
}

// ──────── Panneau de cession ────────
function CessionPanel({ cession, role, reload }) {
  const [shipForm, setShipForm] = useState({});
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);

  async function cessionAct(action, extra = {}) {
    setError(null);
    try {
      await api(`/cessions/${cession.id}`, { method: "PATCH", body: { action, ...extra } });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadDocs() {
    setError(null);
    setUpgradeNeeded(false);
    try {
      setDocs(await api(`/cessions/${cession.id}/documents`));
    } catch (e) {
      setError(e.message);
      if (e.data?.upgradeRequired) setUpgradeNeeded(true);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 4 }}>
      <div className="meta">
        Dossier de cession : <b>{euros(cession.amountCents)}</b> au prix coûtant
        {" "}<span className={`status st-${cession.status}`}>{cession.status}</span>
        {cession.arsNotifiedAt && (
          <> · ARS informée le {new Date(cession.arsNotifiedAt).toLocaleDateString("fr-FR")}</>
        )}
        {cession.trackingNumber && <> · {cession.carrier} n° {cession.trackingNumber}</>}
      </div>
      <div className="meta" style={{ marginBottom: 8 }}>
        Règlement direct entre établissements (virement / Chorus Pro) — hors plateforme.
      </div>

      {error && !upgradeNeeded && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}
      {upgradeNeeded && (
        <PlanGate
          message="Les documents automatiques (bon de cession + courrier ARS) sont réservés au plan Pro."
          onUpgraded={() => { setUpgradeNeeded(false); setError(null); }}
        />
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn sm ghost" onClick={loadDocs}>📄 Documents</button>

        {role === "seller" && !cession.arsNotifiedAt && (
          <button className="btn sm ghost" onClick={() => cessionAct("mark_ars_notified")}>
            ✓ ARS informée
          </button>
        )}

        {role === "seller" && cession.status === "DOCUMENTS" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="chatbox-input"
              placeholder="Transporteur"
              style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}
              onChange={(e) => setShipForm({ ...shipForm, carrier: e.target.value })}
            />
            <input
              placeholder="N° de suivi"
              style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}
              onChange={(e) => setShipForm({ ...shipForm, trackingNumber: e.target.value })}
            />
            <button className="btn sm" onClick={() => cessionAct("mark_shipped", shipForm)}>Expédié</button>
          </div>
        )}

        {role === "buyer" && cession.status === "SHIPPED" && (
          <button className="btn sm" onClick={() => cessionAct("mark_delivered")}>Réceptionné</button>
        )}

        {cession.status === "DELIVERED" && (
          <button className="btn sm ghost" onClick={() => cessionAct("close")}>Clore le dossier</button>
        )}
      </div>

      {docs && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Bon de cession
            </summary>
            <pre className="doc-preview">{docs.bonDeCession}</pre>
          </details>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Courrier d'information ARS
            </summary>
            <pre className="doc-preview">{docs.courrierARS}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ──────── Chat ────────
function Chat({ offerId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const myUser = JSON.parse(localStorage.getItem("remed_user") || "{}");

  const load = useCallback(() => {
    api(`/offers/${offerId}/messages`).then(setMessages).catch(() => {});
  }, [offerId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await api(`/offers/${offerId}/messages`, { method: "POST", body: { body: draft } });
      setDraft("");
      load();
    } catch { /* ignore */ }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className="chat-container">
        {messages.length === 0 && (
          <p className="meta">Démarrez la discussion : modalités d'envoi, coordonnées de facturation…</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.sender.id === myUser.id ? "mine" : "theirs"}`}>
            <div className="msg-who">{m.sender.name}</div>
            {m.body}
          </div>
        ))}
      </div>
      <form className="chatbox" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Écrire un message…"
          aria-label="Message"
        />
        <button className="btn sm">Envoyer</button>
      </form>
    </div>
  );
}
