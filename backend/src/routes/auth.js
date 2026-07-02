import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { JWT_SECRET, ORG_TYPES } from "../config.js";

const router = Router();

const registerSchema = z.object({
  orgName: z.string().min(2, "Nom de la structure requis"),
  orgType: z.enum(ORG_TYPES, { message: "Type de structure invalide" }),
  finess: z.string().regex(/^\d{9}$/, "Le n° FINESS comporte 9 chiffres"),
  address: z.string().min(3, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  name: z.string().min(2, "Votre nom est requis"),
  email: z.string().email("E-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user, org) {
  return jwt.sign(
    { userId: user.id, orgId: org.id, name: user.name, orgName: org.name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export default function authRoutes(prisma) {
  // POST /api/auth/register
  router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const d = parsed.data;

    // Unicité email + FINESS
    const emailTaken = await prisma.user.findUnique({ where: { email: d.email } });
    if (emailTaken) return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });

    const finessTaken = await prisma.organization.findUnique({ where: { finess: d.finess } });
    if (finessTaken) return res.status(409).json({ error: "Ce n° FINESS est déjà enregistré." });

    const org = await prisma.organization.create({
      data: {
        name: d.orgName,
        type: d.orgType,
        finess: d.finess,
        address: d.address,
        city: d.city,
        users: {
          create: {
            email: d.email,
            name: d.name,
            passwordHash: await bcrypt.hash(d.password, 10),
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    res.status(201).json({
      token: signToken(user, org),
      user: { id: user.id, name: user.name, email: user.email, orgName: org.name, orgId: org.id, plan: org.plan },
    });
  });

  // POST /api/auth/login
  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "E-mail et mot de passe requis." });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { org: true },
    });

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    res.json({
      token: signToken(user, user.org),
      user: { id: user.id, name: user.name, email: user.email, orgName: user.org.name, orgId: user.org.id, plan: user.org.plan },
    });
  });

  return router;
}
