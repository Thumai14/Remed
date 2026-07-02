import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

/**
 * Vérifie le JWT Bearer et injecte req.auth = { userId, orgId, name, orgName }
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expirée, reconnectez-vous." });
  }
}
