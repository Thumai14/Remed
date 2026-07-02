import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const hash = await bcrypt.hash("password", 10);

async function seed() {
  // Deux structures de démo
  const chu = await prisma.organization.create({
    data: {
      name: "CHU de Caen Normandie",
      type: "HOPITAL",
      finess: "140000100",
      address: "Avenue de la Côte de Nacre",
      city: "Caen",
      licenceVerified: true,
      plan: "PRO",
      users: {
        create: {
          email: "pui@chu-caen.fr",
          name: "Dr. Camille Martin",
          passwordHash: hash,
        },
      },
    },
    include: { users: true },
  });

  const clinique = await prisma.organization.create({
    data: {
      name: "Clinique Saint-Martin",
      type: "CLINIQUE",
      finess: "140780100",
      address: "18 rue de Bayeux",
      city: "Caen",
      licenceVerified: true,
      users: {
        create: {
          email: "pharma@clinique-stmartin.fr",
          name: "Dr. Lucas Durand",
          passwordHash: hash,
        },
      },
    },
    include: { users: true },
  });

  // Quelques disponibilités
  const now = Date.now();
  const day = 86400000;

  const meds = [
    { medicationName: "Pembrolizumab (Keytruda)", dosage: "100 mg/4 mL", form: "Flacon injectable", batchNumber: "KY24A01", quantity: 8, unitCostCents: 285000, expiryDate: new Date(now + 25 * day), storage: "FRIGO", orgId: chu.id },
    { medicationName: "Nivolumab (Opdivo)", dosage: "240 mg/24 mL", form: "Flacon injectable", batchNumber: "NV24B12", quantity: 5, unitCostCents: 215000, expiryDate: new Date(now + 45 * day), storage: "FRIGO", orgId: chu.id },
    { medicationName: "Rituximab (MabThera)", dosage: "500 mg/50 mL", form: "Flacon injectable", batchNumber: "RT24C03", quantity: 12, unitCostCents: 97500, expiryDate: new Date(now + 90 * day), storage: "FRIGO", orgId: chu.id },
    { medicationName: "Bévacizumab (Avastin)", dosage: "400 mg/16 mL", form: "Flacon injectable", batchNumber: "AV24D07", quantity: 3, unitCostCents: 110000, expiryDate: new Date(now + 18 * day), storage: "FRIGO", orgId: clinique.id },
    { medicationName: "Facteur VIII recombinant", dosage: "2000 UI", form: "Poudre + solvant", batchNumber: "FV24E15", quantity: 20, unitCostCents: 150000, expiryDate: new Date(now + 120 * day), storage: "FRIGO", orgId: chu.id },
    { medicationName: "Imatinib (Glivec)", dosage: "400 mg", form: "Comprimé pelliculé", batchNumber: "IM24F22", quantity: 30, unitCostCents: 8500, expiryDate: new Date(now + 55 * day), storage: "AMBIANT", orgId: clinique.id },
  ];

  for (const med of meds) {
    await prisma.listing.create({ data: med });
  }

  console.log("✅ Seed terminé :");
  console.log(`   CHU de Caen    → pui@chu-caen.fr / password`);
  console.log(`   Clinique StM   → pharma@clinique-stmartin.fr / password`);
  console.log(`   ${meds.length} disponibilités créées.`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
