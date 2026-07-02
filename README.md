# Remed — Coordination du dépannage inter-PUI

Logiciel SaaS de coordination et de traçabilité du dépannage de médicaments
entre pharmacies à usage intérieur (PUI). Remed n'est **pas** une marketplace :
la plateforme n'est jamais partie à la vente, ne touche aucun paiement et ne
prélève aucune commission. Modèle économique : **abonnement**.

## 1. Positionnement juridique — les 4 garde-fous dans le code

| Garde-fou | Implémentation |
|---|---|
| Le besoin comme fait générateur | Toute demande exige un motif (RUPTURE / TENSION / BESOIN_URGENT) + justification textuelle, tracés dans les documents |
| Prix coûtant obligatoire | Le cédant renseigne son prix d'achat unitaire — seul prix possible, pas de négociation |
| Paiement hors plateforme | Règlement direct entre établissements (virement / Chorus Pro) — Remed ne touche jamais l'argent |
| Valeur documentaire | Génération automatique du bon de cession + courrier ARS (plan Pro) |

## 2. Architecture système

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND — React 18 + Vite              (Netlify)          │
│  SPA avec _redirects pour le routing côté client            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / JSON (JWT Bearer)
                       │ VITE_API_URL en .env
┌──────────────────────▼──────────────────────────────────────┐
│  BACKEND — Node.js 20 + Express          (Render / Railway) │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │
│  │ Auth   │ │ Listings │ │ Offers │ │ Msgs   │ │ Cessions│ │
│  │ (JWT)  │ │ (dispo)  │ │(demand)│ │ (chat) │ │ (docs)  │ │
│  └────────┘ └──────────┘ └────────┘ └────────┘ └─────────┘ │
│  Prisma ORM + SQLite (dev) / PostgreSQL (prod)              │
└─────────────────────────────────────────────────────────────┘
```

## 3. Structure des fichiers

```
remed/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.js                  # Point d'entrée Express
│       ├── config.js                 # Constantes (JWT_SECRET, quotas)
│       ├── middleware/
│       │   └── auth.js               # Vérification JWT + context org
│       ├── services/
│       │   └── documents.js          # Bon de cession + courrier ARS
│       └── routes/
│           ├── auth.js               # Inscription structure + login
│           ├── listings.js           # CRUD disponibilités
│           ├── offers.js             # Demandes de dépannage + quota
│           ├── messages.js           # Chat rattaché à une demande
│           ├── cessions.js           # Dossier documentaire
│           └── billing.js            # Abonnement (stub Stripe)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── netlify.toml                  # ← fix du 404 Netlify
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                   # Routing + layout + guard
        ├── api.js                    # Client HTTP + gestion JWT
        ├── styles.css                # Design system
        ├── hooks/
        │   └── useAuth.jsx           # Context d'authentification
        ├── components/
        │   ├── ExpiryGauge.jsx       # Jauge de péremption (signature)
        │   └── PlanGate.jsx          # Upsell Pro inline
        └── pages/
            ├── Login.jsx
            ├── Marketplace.jsx
            ├── ListingDetail.jsx
            ├── NewListing.jsx
            └── Deals.jsx
```

## 4. Schéma de base de données

| Table | Rôle | Champs clés |
|---|---|---|
| Organization | Structure pharmaceutique | type, finess (unique), plan (FREE/PRO), licenceVerified |
| User | Pharmacien rattaché | email, passwordHash, role, orgId |
| Listing | Lot mis à disposition | medicationName, CIP, lot, quantité, unitCostCents (prix coûtant), expiryDate, storage, status |
| Offer | Demande de dépannage | quantity, needReason (RUPTURE/TENSION/BESOIN_URGENT), needDetails, status |
| Message | Chat rattaché à une demande | senderId, body |
| Cession | Dossier documentaire | amountCents (info), arsNotifiedAt, carrier, tracking, status |

## 5. Endpoints d'API

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | /api/auth/register | Créer structure + 1er pharmacien | — |
| POST | /api/auth/login | Connexion → JWT | — |
| GET | /api/listings | Disponibilités actives (filtres: q, storage, urgentOnly) | ✅ |
| POST | /api/listings | Mettre un lot à disposition (gratuit) | ✅ |
| GET | /api/listings/:id | Détail d'une disponibilité | ✅ |
| PATCH | /api/listings/:id | Modifier / retirer (cédant) | ✅ |
| POST | /api/listings/:id/offers | Demande de dépannage (motif obligatoire, quota FREE) | ✅ |
| GET | /api/offers?role=buyer\|seller | Mes demandes | ✅ |
| PATCH | /api/offers/:id | Accepter / refuser / retirer | ✅ |
| GET | /api/offers/:offerId/messages | Fil de discussion | ✅ |
| POST | /api/offers/:offerId/messages | Envoyer un message | ✅ |
| GET | /api/cessions | Mes dossiers de cession | ✅ |
| GET | /api/cessions/:id/documents | Bon de cession + courrier ARS (Pro) | ✅ |
| PATCH | /api/cessions/:id | ARS informée / expédié / livré / clos | ✅ |
| GET | /api/billing | Plan actuel | ✅ |
| POST | /api/billing/upgrade | Passer au plan Pro (stub) | ✅ |

## 6. Modèle économique (freemium)

| Plan | Prix indicatif | Inclus |
|---|---|---|
| Découverte | 0 € | Publier en illimité, 2 demandes/mois |
| Pro | ~2 000 €/an/établissement | Demandes illimitées, documents auto (bon de cession + courrier ARS), multi-utilisateurs |

## 7. Déploiement

### Frontend → Netlify

```bash
cd frontend
npm install && npm run build   # → dist/
# Pousser sur Netlify (CLI ou Git)
# Le netlify.toml gère le routing SPA (pas de 404 sur refresh)
```

Variables d'environnement Netlify :
- `VITE_API_URL` = URL du backend (ex: `https://remed-api.onrender.com`)

### Backend → Render / Railway

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm start
```

Variables d'environnement :
- `DATABASE_URL` (PostgreSQL en prod)
- `JWT_SECRET` (string aléatoire 64+ car.)
- `CORS_ORIGIN` (URL Netlify : `https://remed.netlify.app`)
