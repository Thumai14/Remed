export const PORT = process.env.PORT || 3001;
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Freemium : publier = gratuit, demander = limité en FREE
export const FREE_OFFERS_PER_MONTH = 2;

// Types valides (validés côté route aussi via Zod)
export const ORG_TYPES = ["HOPITAL", "CLINIQUE", "EHPAD", "CENTRE_SOINS", "AUTRE"];
export const STORAGE_TYPES = ["AMBIANT", "FRIGO", "CONGELE"];
export const NEED_REASONS = ["RUPTURE", "TENSION", "BESOIN_URGENT"];
