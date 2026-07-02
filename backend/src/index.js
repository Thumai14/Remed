import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PORT, CORS_ORIGIN } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import offerRoutes, { createOfferHandler } from "./routes/offers.js";
import messageRoutes from "./routes/messages.js";
import cessionRoutes from "./routes/cessions.js";
import billingRoutes from "./routes/billing.js";

const prisma = new PrismaClient();
const app = express();

// ──────── Middleware global ────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ──────── Health check ────────
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "remed-api", version: "2.0.0" })
);

// ──────── Routes publiques ────────
app.use("/api/auth", authRoutes(prisma));

// ──────── Routes protégées ────────
app.use("/api/listings", requireAuth, listingRoutes(prisma));
app.post("/api/listings/:id/offers", requireAuth, createOfferHandler(prisma));
app.use("/api/offers", requireAuth, offerRoutes(prisma));
app.use("/api/offers/:offerId/messages", requireAuth, messageRoutes(prisma));
app.use("/api/cessions", requireAuth, cessionRoutes(prisma));
app.use("/api/billing", requireAuth, billingRoutes(prisma));

// ──────── Cron : expiration automatique des fiches périmées ────────
async function expireListings() {
  const count = await prisma.listing.updateMany({
    where: { status: "ACTIVE", expiryDate: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  if (count.count > 0) console.log(`⏰ ${count.count} fiche(s) expirée(s)`);
}
setInterval(expireListings, 3600_000);
expireListings();

// ──────── Error handler ────────
app.use((err, _req, res, _next) => {
  console.error("❌", err.stack || err);
  res.status(500).json({ error: "Erreur interne du serveur." });
});

// ──────── Start ────────
app.listen(PORT, () => {
  console.log(`\n🟢 Remed API v2 → http://localhost:${PORT}`);
  console.log(`   CORS origin  → ${CORS_ORIGIN}\n`);
});
