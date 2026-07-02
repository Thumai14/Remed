import { Router } from "express";
import { generateBonDeCession, generateCourrierARS } from "../services/documents.js";

const router = Router();

export default function cessionRoutes(prisma) {
  async function loadCessionIfParty(id, orgId) {
    const cession = await prisma.cession.findUnique({
      where: { id },
      include: {
        offer: {
          include: {
            listing: { include: { org: true } },
            buyerOrg: true,
          },
        },
      },
    });
    if (!cession) return null;
    const isParty =
      cession.offer.buyerOrgId === orgId || cession.offer.listing.orgId === orgId;
    return isParty ? cession : null;
  }

  // GET /api/cessions
  router.get("/", async (req, res) => {
    const orgId = req.auth.orgId;
    const cessions = await prisma.cession.findMany({
      where: {
        offer: {
          OR: [{ buyerOrgId: orgId }, { listing: { orgId } }],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        offer: {
          include: {
            listing: { include: { org: { select: { name: true, city: true } } } },
            buyerOrg: { select: { name: true, city: true } },
          },
        },
      },
    });
    res.json(cessions);
  });

  // GET /api/cessions/:id/documents — bon de cession + courrier ARS (plan Pro)
  router.get("/:id/documents", async (req, res) => {
    const org = await prisma.organization.findUnique({ where: { id: req.auth.orgId } });
    if (org.plan !== "PRO") {
      return res.status(402).json({
        error: "La génération des documents est réservée au plan Pro.",
        upgradeRequired: true,
      });
    }

    const cession = await loadCessionIfParty(req.params.id, req.auth.orgId);
    if (!cession) return res.status(404).json({ error: "Dossier introuvable." });

    const ctx = {
      cession,
      offer: cession.offer,
      listing: cession.offer.listing,
      seller: cession.offer.listing.org,
      buyer: cession.offer.buyerOrg,
    };

    res.json({
      bonDeCession: generateBonDeCession(ctx),
      courrierARS: generateCourrierARS(ctx),
    });
  });

  // PATCH /api/cessions/:id — avancer le dossier
  router.patch("/:id", async (req, res) => {
    const cession = await loadCessionIfParty(req.params.id, req.auth.orgId);
    if (!cession) return res.status(404).json({ error: "Dossier introuvable." });

    const isSeller = cession.offer.listing.orgId === req.auth.orgId;
    const isBuyer = cession.offer.buyerOrgId === req.auth.orgId;
    const { action, carrier, trackingNumber } = req.body || {};

    let data = null;

    if (action === "mark_ars_notified" && isSeller && !cession.arsNotifiedAt) {
      data = { arsNotifiedAt: new Date() };
    }
    if (action === "mark_shipped" && isSeller && cession.status === "DOCUMENTS") {
      data = { status: "SHIPPED", carrier: carrier || null, trackingNumber: trackingNumber || null };
    }
    if (action === "mark_delivered" && isBuyer && cession.status === "SHIPPED") {
      data = { status: "DELIVERED" };
    }
    if (action === "close" && (isBuyer || isSeller) && cession.status === "DELIVERED") {
      data = { status: "CLOSED" };
    }
    if (action === "open_dispute" && (isBuyer || isSeller) && !["CLOSED", "DISPUTED"].includes(cession.status)) {
      data = { status: "DISPUTED" };
    }

    if (!data) return res.status(400).json({ error: "Transition non autorisée." });

    const updated = await prisma.cession.update({ where: { id: cession.id }, data });
    res.json(updated);
  });

  return router;
}
