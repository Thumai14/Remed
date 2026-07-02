import { Router } from "express";
import { z } from "zod";
import { FREE_OFFERS_PER_MONTH, NEED_REASONS } from "../config.js";

const router = Router();

const offerSchema = z.object({
  quantity: z.number().int().positive(),
  needReason: z.enum(NEED_REASONS, { message: "Motif de besoin requis" }),
  needDetails: z.string().min(10, "Décrivez le besoin (10 car. min) — cette justification figure au bon de cession"),
  message: z.string().max(1000).optional(),
});

// Exporté séparément pour montage sur /api/listings/:id/offers dans index.js
export function createOfferHandler(prisma) {
  return async (req, res) => {
    const parsed = offerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing || listing.status !== "ACTIVE") {
      return res.status(404).json({ error: "Disponibilité indisponible." });
    }
    if (listing.orgId === req.auth.orgId) {
      return res.status(400).json({ error: "Vous ne pouvez pas demander votre propre lot." });
    }
    if (parsed.data.quantity > listing.quantity) {
      return res.status(400).json({ error: `Quantité maximale : ${listing.quantity}` });
    }

    // Doublon check
    const existing = await prisma.offer.findFirst({
      where: { listingId: listing.id, buyerOrgId: req.auth.orgId, status: "PENDING" },
    });
    if (existing) {
      return res.status(409).json({ error: "Vous avez déjà une demande en attente sur ce lot." });
    }

    // Gate freemium
    const org = await prisma.organization.findUnique({ where: { id: req.auth.orgId } });
    if (org.plan === "FREE") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const count = await prisma.offer.count({
        where: { buyerOrgId: org.id, createdAt: { gte: monthStart } },
      });
      if (count >= FREE_OFFERS_PER_MONTH) {
        return res.status(402).json({
          error: `Quota atteint (${FREE_OFFERS_PER_MONTH} demandes/mois en plan Découverte). Passez au plan Pro pour des demandes illimitées et les documents automatiques.`,
          upgradeRequired: true,
        });
      }
    }

    const offer = await prisma.offer.create({
      data: {
        listingId: listing.id,
        buyerOrgId: req.auth.orgId,
        quantity: parsed.data.quantity,
        needReason: parsed.data.needReason,
        needDetails: parsed.data.needDetails,
        ...(parsed.data.message
          ? { messages: { create: { senderId: req.auth.userId, body: parsed.data.message } } }
          : {}),
      },
    });
    res.status(201).json(offer);
  };
}

export default function offerRoutes(prisma) {
  // GET /api/offers?role=buyer|seller
  router.get("/", async (req, res) => {
    const role = req.query.role === "seller" ? "seller" : "buyer";
    const where =
      role === "buyer"
        ? { buyerOrgId: req.auth.orgId }
        : { listing: { orgId: req.auth.orgId } };

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        listing: { include: { org: { select: { name: true, city: true } } } },
        buyerOrg: { select: { name: true, city: true } },
        cession: true,
      },
    });
    res.json(offers);
  });

  // PATCH /api/offers/:id — accept / reject (cédant) ou withdraw (demandeur)
  router.patch("/:id", async (req, res) => {
    const { action } = req.body || {};
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { listing: true },
    });
    if (!offer) return res.status(404).json({ error: "Demande introuvable." });
    if (offer.status !== "PENDING") {
      return res.status(400).json({ error: "Cette demande n'est plus en attente." });
    }

    const isSeller = offer.listing.orgId === req.auth.orgId;
    const isBuyer = offer.buyerOrgId === req.auth.orgId;

    if (action === "withdraw" && isBuyer) {
      const updated = await prisma.offer.update({
        where: { id: offer.id },
        data: { status: "WITHDRAWN" },
      });
      return res.json(updated);
    }

    if (action === "reject" && isSeller) {
      const updated = await prisma.offer.update({
        where: { id: offer.id },
        data: { status: "REJECTED" },
      });
      return res.json(updated);
    }

    if (action === "accept" && isSeller) {
      const amountCents = offer.quantity * offer.listing.unitCostCents;

      const [updatedOffer] = await prisma.$transaction([
        prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } }),
        prisma.listing.update({
          where: { id: offer.listingId },
          data: {
            quantity: { decrement: offer.quantity },
            status: offer.quantity >= offer.listing.quantity ? "SOLD" : "ACTIVE",
          },
        }),
        prisma.cession.create({
          data: { offerId: offer.id, amountCents },
        }),
      ]);
      return res.json(updatedOffer);
    }

    res.status(403).json({ error: "Action non autorisée." });
  });

  return router;
}
