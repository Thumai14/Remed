import { Router } from "express";
import { z } from "zod";
import { STORAGE_TYPES } from "../config.js";

const router = Router();

const createSchema = z.object({
  medicationName: z.string().min(2),
  cipCode: z.string().optional(),
  dosage: z.string().min(1),
  form: z.string().min(2),
  batchNumber: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCostCents: z.number().int().positive(),
  expiryDate: z.coerce.date().refine((d) => d > new Date(), "La date de péremption doit être future"),
  storage: z.enum(STORAGE_TYPES).default("AMBIANT"),
  notes: z.string().max(1000).optional(),
});

export default function listingRoutes(prisma) {
  // GET /api/listings — registre des disponibilités
  router.get("/", async (req, res) => {
    const { q, storage, urgentOnly, mine } = req.query;
    const where = { status: "ACTIVE" };
    if (mine === "1") where.orgId = req.auth.orgId;
    if (q) where.medicationName = { contains: q };
    if (storage && STORAGE_TYPES.includes(storage)) where.storage = storage;
    if (urgentOnly === "1") {
      where.expiryDate = { lte: new Date(Date.now() + 60 * 86400000) };
    }

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { expiryDate: "asc" },
      include: {
        org: { select: { name: true, city: true, type: true, licenceVerified: true } },
        _count: { select: { offers: true } },
      },
    });
    res.json(listings);
  });

  // POST /api/listings — mettre un lot à disposition (gratuit, pas de gate)
  router.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const listing = await prisma.listing.create({
      data: { ...parsed.data, orgId: req.auth.orgId },
    });
    res.status(201).json(listing);
  });

  // GET /api/listings/:id
  router.get("/:id", async (req, res) => {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        org: { select: { id: true, name: true, city: true, type: true, finess: true, licenceVerified: true } },
        offers: {
          where: { buyerOrgId: req.auth.orgId },
          select: { id: true, status: true, quantity: true },
        },
      },
    });
    if (!listing) return res.status(404).json({ error: "Disponibilité introuvable." });
    res.json(listing);
  });

  // PATCH /api/listings/:id — retirer ou ajuster (cédant uniquement)
  router.patch("/:id", async (req, res) => {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: "Disponibilité introuvable." });
    if (listing.orgId !== req.auth.orgId) {
      return res.status(403).json({ error: "Seul l'établissement cédant peut modifier cette fiche." });
    }

    const data = {};
    if (req.body.status === "CANCELLED" && listing.status === "ACTIVE") data.status = "CANCELLED";
    if (typeof req.body.quantity === "number" && req.body.quantity > 0) data.quantity = Math.round(req.body.quantity);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucune modification valide." });
    }

    const updated = await prisma.listing.update({ where: { id: listing.id }, data });
    res.json(updated);
  });

  return router;
}
