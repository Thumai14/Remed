import { Router } from "express";

const router = Router();

export default function billingRoutes(prisma) {
  // GET /api/billing — plan actuel
  router.get("/", async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.auth.orgId },
      select: { plan: true, planExpiresAt: true, name: true },
    });
    res.json(org);
  });

  // POST /api/billing/upgrade
  // MVP : activation directe. PROD : Stripe Billing (checkout session +
  // webhook customer.subscription.updated → update plan/planExpiresAt).
  router.post("/upgrade", async (req, res) => {
    const oneYear = new Date(Date.now() + 365 * 86400000);
    const org = await prisma.organization.update({
      where: { id: req.auth.orgId },
      data: { plan: "PRO", planExpiresAt: oneYear },
      select: { plan: true, planExpiresAt: true },
    });
    res.json({ ...org, message: "Plan Pro activé (mode démo)." });
  });

  return router;
}
