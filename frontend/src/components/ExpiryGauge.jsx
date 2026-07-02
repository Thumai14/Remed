import { daysToExpiry } from "../api.js";

/**
 * Jauge de péremption — la signature visuelle de Remed.
 * Horizon : 180 jours. Vert > 90j, ambre 30–90j, rouge < 30j.
 */
export default function ExpiryGauge({ expiryDate }) {
  const days = daysToExpiry(expiryDate);
  const pct = Math.max(3, Math.min(100, (days / 180) * 100));
  const tone = days <= 0 ? "crit" : days < 30 ? "crit" : days < 90 ? "warn" : "ok";

  let label;
  if (days <= 0) label = "Périmé";
  else if (days === 1) label = "Périme demain";
  else label = `Périme dans ${days} j`;

  return (
    <div className={`expiry tone-${tone}`}>
      <div className="expiry-track">
        <div className="expiry-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="expiry-label">{label}</span>
    </div>
  );
}
