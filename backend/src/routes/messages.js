import { Router } from "express";

const router = Router({ mergeParams: true });

export default function messageRoutes(prisma) {
  // Vérifie que l'utilisateur est partie prenante (acheteur ou vendeur)
  async function loadOfferIfParty(offerId, orgId) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: { select: { orgId: true } } },
    });
    if (!offer) return null;
    return offer.buyerOrgId === orgId || offer.listing.orgId === orgId ? offer : null;
  }

  // GET /api/offers/:offerId/messages
  router.get("/", async (req, res) => {
    const offer = await loadOfferIfParty(req.params.offerId, req.auth.orgId);
    if (!offer) return res.status(404).json({ error: "Discussion introuvable." });
    const messages = await prisma.message.findMany({
      where: { offerId: offer.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true, orgId: true } } },
    });
    res.json(messages);
  });

  // POST /api/offers/:offerId/messages
  router.post("/", async (req, res) => {
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Message vide." });
    if (body.length > 2000) return res.status(400).json({ error: "Message trop long (2000 car. max)." });

    const offer = await loadOfferIfParty(req.params.offerId, req.auth.orgId);
    if (!offer) return res.status(404).json({ error: "Discussion introuvable." });

    const message = await prisma.message.create({
      data: { offerId: offer.id, senderId: req.auth.userId, body },
      include: { sender: { select: { id: true, name: true, orgId: true } } },
    });
    res.status(201).json(message);
  });

  return router;
}
