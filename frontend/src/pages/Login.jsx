import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate("/disponibilites");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <h1>
          <span className="brand" style={{ fontSize: 48 }}>rem<span>e</span>d</span>
        </h1>
        <p>
          La plateforme de coordination qui donne une seconde vie aux médicaments
          onéreux proches de péremption — par le dépannage entre PUI, au prix coûtant.
        </p>
        <p className="tagline">
          Réservé aux structures pharmaceutiques disposant d'une PUI
          (n° FINESS requis). Chaque licence est vérifiée par notre équipe.
        </p>
      </section>

      <section className="auth-panel">
        <form className="form" onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420 }}>
          <h2>{mode === "login" ? "Connexion" : "Inscrire ma structure"}</h2>

          {error && <div className="error-msg">{error}</div>}

          {mode === "register" && (
            <>
              <label>
                Nom de la structure
                <input required onChange={set("orgName")} placeholder="CHU de Caen" />
              </label>
              <div className="row2">
                <label>
                  Type
                  <select required defaultValue="" onChange={set("orgType")}>
                    <option value="" disabled>Choisir…</option>
                    <option value="HOPITAL">Hôpital</option>
                    <option value="CLINIQUE">Clinique</option>
                    <option value="EHPAD">EHPAD</option>
                    <option value="CENTRE_SOINS">Centre de soins</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </label>
                <label>
                  N° FINESS (9 chiffres)
                  <input required pattern="\d{9}" onChange={set("finess")} placeholder="140000100" />
                </label>
              </div>
              <div className="row2">
                <label>
                  Adresse
                  <input required onChange={set("address")} placeholder="Avenue de la Côte de Nacre" />
                </label>
                <label>
                  Ville
                  <input required onChange={set("city")} placeholder="Caen" />
                </label>
              </div>
              <label>
                Votre nom (pharmacien référent)
                <input required onChange={set("name")} placeholder="Dr Camille Martin" />
              </label>
            </>
          )}

          <label>
            E-mail professionnel
            <input required type="email" onChange={set("email")} placeholder="pui@chu-exemple.fr" />
          </label>
          <label>
            Mot de passe
            <input required type="password" minLength={8} onChange={set("password")} />
          </label>

          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Chargement…" : mode === "login" ? "Se connecter" : "Créer le compte"}
          </button>

          <button type="button" className="btn ghost" onClick={toggleMode} style={{ width: "100%" }}>
            {mode === "login" ? "Première visite ? Inscrire ma structure" : "J'ai déjà un compte"}
          </button>
        </form>
      </section>
    </div>
  );
}
