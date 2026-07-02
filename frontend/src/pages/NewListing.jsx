import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function NewListing() {
  const [form, setForm] = useState({ storage: "AMBIANT" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const set = (key, isNum) => (e) =>
    setForm({ ...form, [key]: isNum ? Number(e.target.value) : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/listings", {
        method: "POST",
        body: {
          medicationName: form.medicationName,
          cipCode: form.cipCode || undefined,
          dosage: form.dosage,
          form: form.form,
          batchNumber: form.batchNumber,
          quantity: Number(form.quantity),
          unitCostCents: Math.round(Number(form.unitCost) * 100),
          expiryDate: form.expiryDate,
          storage: form.storage,
          notes: form.notes || undefined,
        },
      });
      navigate("/disponibilites");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Mettre un lot à disposition</h1>
      <p className="meta">
        Renseignez le lot exactement comme il figure sur le conditionnement.
        La cession se fait au prix coûtant (prix d'achat), sans marge.
        La fiche sera automatiquement retirée à la date de péremption.
      </p>

      <form className="form wide" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {error && <div className="error-msg">{error}</div>}

        <div className="row2">
          <label>
            Nom du médicament (DCI ou spécialité)
            <input required onChange={set("medicationName")} placeholder="Pembrolizumab (Keytruda)" />
          </label>
          <label>
            Code CIP13 (optionnel)
            <input onChange={set("cipCode")} placeholder="3400930000000" />
          </label>
        </div>

        <div className="row2">
          <label>
            Dosage
            <input required onChange={set("dosage")} placeholder="100 mg/4 mL" />
          </label>
          <label>
            Forme
            <input required onChange={set("form")} placeholder="Flacon injectable" />
          </label>
        </div>

        <div className="row2">
          <label>
            N° de lot
            <input required onChange={set("batchNumber")} placeholder="A12345" />
          </label>
          <label>
            Date de péremption
            <input required type="date" onChange={set("expiryDate")} />
          </label>
        </div>

        <div className="row2">
          <label>
            Quantité disponible
            <input required type="number" min="1" onChange={set("quantity", true)} />
          </label>
          <label>
            Conservation
            <select value={form.storage} onChange={set("storage")}>
              <option value="AMBIANT">Température ambiante</option>
              <option value="FRIGO">Réfrigéré (2–8 °C)</option>
              <option value="CONGELE">Congelé</option>
            </select>
          </label>
        </div>

        <label>
          Prix d'achat unitaire justifié (€) — prix coûtant, seul prix possible
          <input required type="number" step="0.01" min="0.01" onChange={set("unitCost", true)} />
        </label>

        <label>
          Remarques (conditions de cession, disponibilité…)
          <textarea rows="3" onChange={set("notes")} />
        </label>

        <button className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Publication…" : "Mettre à disposition"}
        </button>
      </form>
    </>
  );
}
