# KALANKO — Documentation Technique Complète

> Plateforme SaaS multi-tenant de gestion scolaire pour les établissements maliens
> (préscolaire & fondamental). Approche **DevSecOps Shift Left**.
>
> Document généré le **19 juillet 2026** à partir du code source réel du dépôt.
> Auteur du projet : **Amara Sountoura** — Stage THL Technologie, Bamako 2026.

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture multi-tenant](#2-architecture-multi-tenant)
3. [Base de données](#3-base-de-données)
4. [Backend FastAPI](#4-backend-fastapi)
5. [Frontend React](#5-frontend-react)
6. [Modules fonctionnels (M1 → M6)](#6-modules-fonctionnels-m1--m6)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Sécurité](#8-sécurité)
9. [Tests](#9-tests)
10. [Règles de développement](#10-règles-de-développement)
11. [État du projet (19 juillet 2026)](#11-état-du-projet-19-juillet-2026)

---

## 1. VUE D'ENSEMBLE

### 1.1 Description du projet

**Kalanko** est une application **SaaS multi-tenant** de gestion scolaire destinée aux
établissements maliens du préscolaire et du fondamental. Chaque établissement (école)
est un **tenant** isolé : ses données ne sont jamais visibles par un autre établissement.
Une couche « plateforme » (le *platform owner*) gère l'ensemble des tenants, leurs
abonnements et leur facturation.

### 1.2 Contexte Mali & problématique

Les établissements scolaires maliens gèrent encore majoritairement les inscriptions,
les notes, les bulletins et les paiements sur papier ou tableurs isolés. Cela engendre :

- des **pertes de données** et une absence d'historique fiable ;
- des **calculs manuels** de moyennes, rangs et mentions, sources d'erreurs ;
- un **suivi financier** difficile (frais scolaires, impayés, salaires, caisse) ;
- l'absence de **paiement mobile** (Mobile Money), pourtant omniprésent au Mali.

Kalanko répond à ces besoins avec un système adapté au barème scolaire malien
(cycles, notation par cycle, mentions type « Très Bien / Bien / Assez Bien / Passable »),
au paiement **Mobile Money** (webhook signé), et à une isolation stricte des données
par établissement.

### 1.3 Stack technique complète (versions réelles)

**Backend** (`backend/requirements.txt`) :

| Composant | Version | Rôle |
|---|---|---|
| Python | 3.12 | Langage backend |
| FastAPI | `>=0.115,<1.0` | Framework API |
| Uvicorn (standard) | `>=0.32,<1.0` | Serveur ASGI |
| SQLAlchemy | `>=2.0.36,<3.0` | ORM |
| Alembic | `>=1.14,<2.0` | Migrations DB |
| psycopg2-binary | `>=2.9.10` | Driver PostgreSQL |
| python-jose[cryptography] | `>=3.3.0` | JWT (HS256) |
| passlib[bcrypt] | `1.7.4` | Hachage mots de passe |
| bcrypt | `4.0.1` | Backend bcrypt (cost 12) |
| redis | `>=5.2,<6.0` | Cache / rate limit |
| slowapi | `>=0.1.9,<0.2` | Rate limiting |
| limits[redis] | `>=3.13,<4.0` | Backend rate limit |
| pydantic-settings | `>=2.6,<3.0` | Configuration |
| reportlab | `>=4.2,<5.0` | Génération PDF |
| openpyxl | `>=3.1.5,<4.0` | Export Excel |
| pytest / pytest-asyncio | `8.3` / `0.24` | Tests |
| httpx | `>=0.28,<1.0` | Client de test ASGI |
| fakeredis | `>=2.26,<3.0` | Redis mock (tests) |

**Frontend** (`frontend/package.json`) :

| Composant | Version | Rôle |
|---|---|---|
| React / React-DOM | `^19.2.6` | UI |
| react-router-dom | `^7.17.0` | Routing |
| @tanstack/react-query | `^5.101.0` | Data fetching / cache |
| zustand | `^5.0.14` | State management |
| axios | `^1.17.0` | Client HTTP |
| recharts | `^3.8.1` | Graphiques |
| lucide-react | `^1.17.0` | Icônes |
| TailwindCSS | `^4.3.0` | Styling |
| shadcn/ui (Radix + CVA) | — | Composants UI |
| Vite | `^8.0.12` | Build tool |
| TypeScript | `~6.0.2` | Langage |

**Infrastructure** : PostgreSQL 16 (RLS), Redis 7, Docker + Docker Compose,
Caddy (reverse proxy + TLS auto), Prometheus / Grafana / Loki / Promtail (monitoring),
GitHub Actions (CI/CD DevSecOps), Terraform (annexe `infra/`).

> ⚠️ Écart documentaire : `frontend/docs/ARCHITECTURE_FRONTEND.md` mentionne React 18 /
> Router v6, mais `package.json` épingle réellement **React 19 / react-router-dom 7 /
> Vite 8 / TypeScript 6 / Tailwind 4**.

### 1.4 URLs & environnement de production

| Élément | Valeur |
|---|---|
| Domaine frontend | `https://kalanko.tech` |
| Domaine API | `https://api.kalanko.tech` |
| Monitoring (manuel) | `grafana.kalanko.tech → localhost:3001` |
| Dépôt Git | `https://github.com/aroutnous/siniko` |
| VPS (IP) | `72.61.106.104` (Ubuntu 24.04 LTS) |
| Utilisateur VPS | `kalanko` |
| Racine projet VPS | `/opt/kalanko/app` |

---

## 2. ARCHITECTURE MULTI-TENANT

### 2.1 Principe

Chaque table métier possède une colonne `tenant_id` (UUID). L'isolation est garantie
à **deux niveaux** :

1. **Applicatif** — le `tenant_id` est extrait du JWT à chaque requête par le
   `TenantMiddleware` et injecté dans le contexte de session.
2. **Base de données** — PostgreSQL **Row Level Security (RLS)** filtre chaque
   requête via la variable de session `app.current_tenant`, de sorte qu'une requête
   ne voit jamais les lignes d'un autre tenant, même en cas d'oubli côté code.

### 2.2 Flux complet JWT → TenantMiddleware → RLS

```
┌──────────┐   POST /auth/login (public, rate limit 5/10min)
│ Frontend │──────────────────────────────────────────────►┐
└──────────┘                                                │
      ▲   JWT { sub: user_id, tenant_id, role, exp:+15min } │
      └────────────────────────────────────────────────────┘
                              │
                              ▼  Requête authentifiée : Authorization: Bearer <JWT>
      ┌───────────────────────────────────────────────────────────┐
      │  TenantMiddleware  (app/middleware/tenant.py)              │
      │  1. path public ? (PUBLIC_PATHS) ─► oui : passe            │
      │  2. /docs,/redoc,/openapi.json + DEBUG=false ─► 404        │
      │  3. décode JWT (jwt_secret, HS256) ─► 401 si invalide      │
      │  4. extrait tenant_id ─► 401 si absent/invalide            │
      │  5. request.state.tenant_id / user_id                     │
      └───────────────────────────────────────────────────────────┘
                              │
                              ▼
      ┌───────────────────────────────────────────────────────────┐
      │  AuditMiddleware (app/middleware/audit.py)                 │
      │  exécute la route, puis journalise dans audit_logs         │
      └───────────────────────────────────────────────────────────┘
                              │
                              ▼
      ┌───────────────────────────────────────────────────────────┐
      │  get_db()  (app/core/database.py)                          │
      │  SET LOCAL app.current_tenant = '<tenant_id>'  (RLS)       │
      └───────────────────────────────────────────────────────────┘
                              │
                              ▼
      ┌───────────────────────────────────────────────────────────┐
      │  get_current_user() — validation forte :                  │
      │  • user actif dans ce tenant                              │
      │  • session vivante (token_hash + expire_at > now)         │
      │  require_permission("...") / require_platform_owner        │
      └───────────────────────────────────────────────────────────┘
                              │
                              ▼
      ┌───────────────────────────────────────────────────────────┐
      │  PostgreSQL — POLICY tenant_isolation :                    │
      │  USING (tenant_id = current_setting('app.current_tenant')) │
      │  ► seules les lignes du tenant courant sont visibles       │
      └───────────────────────────────────────────────────────────┘
```

Politique RLS appliquée (identique sur toutes les tables scopées) :

```sql
CREATE POLICY tenant_isolation ON <table>
FOR ALL
USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

### 2.3 Diagramme ASCII de l'isolation

```
                     ┌──────────────────────────────────────┐
                     │          PostgreSQL (RLS ON)         │
                     │                                      │
 Tenant A  ────────► │  eleves     WHERE tenant_id = A  ──► │  ✅ lignes A
 (JWT tenant_id=A)   │  paiements  WHERE tenant_id = A      │  ❌ lignes B invisibles
                     │                                      │
 Tenant B  ────────► │  eleves     WHERE tenant_id = B  ──► │  ✅ lignes B
 (JWT tenant_id=B)   │  paiements  WHERE tenant_id = B      │  ❌ lignes A invisibles
                     │                                      │
 Platform Owner ───► │  tenant_id = 000...000 (technique)   │  gère tous les tenants
 (require_platform_  │  via require_platform_owner          │  hors politique métier
  owner)             └──────────────────────────────────────┘
```

### 2.4 Cas particuliers

| Rôle | Comportement d'isolation |
|---|---|
| **promoteur** | Propriétaire d'un tenant. `verifier_permission` renvoie **toujours `True`** (bypass total des permissions), mais reste **borné à son propre tenant_id** par la RLS. Il ne voit donc que ses données. |
| **platform_owner** | Rôle plateforme. Son `tenant_id` est le **tenant technique** `00000000-0000-0000-0000-000000000000` (`PLATFORM_TENANT_ID`). Il ne possède que la permission `platform.admin` et **échoue** sur toute vérification `require_permission` d'une route métier tenant. Il accède exclusivement aux routes `/platform/*` protégées par `require_platform_owner`. |
| **directeur / secretaire / comptable** | Permissions **individuelles** stockées en base (`utilisateur_permissions`), résolues par requête, toujours filtrées par tenant. |

---

## 3. BASE DE DONNÉES

### 3.1 Classes de base (`app/models/base.py`)

- **`BaseModel`** (abstrait) : `id` (UUID PK), `created_at`, `updated_at`. Aucun scope tenant.
- **`TenantScopedModel(BaseModel)`** (abstrait) : ajoute `tenant_id` (UUID, FK
  `tenants.id` ON DELETE CASCADE, NOT NULL, indexé) → RLS applicable.

### 3.2 Tables par domaine (colonnes clés & FK)

**Plateforme (`tenant.py`)**

| Modèle | Table | Base | Colonnes clés / FK |
|---|---|---|---|
| `Tenant` | `tenants` | BaseModel | nom, `slug` (unique), logo_url, adresse, telephone, email, statut |
| `PlanAbonnement` | `plans_abonnement` | BaseModel | nom, prix_mensuel, modules_inclus (JSONB), limite_eleves, limite_utilisateurs, est_actif |
| `Abonnement` | `abonnements` | TenantScoped | plan_id→plans_abonnement, date_debut, date_fin, statut, mode_paiement |
| `FactureTenant` | `factures_tenants` | TenantScoped | abonnement_id→abonnements, montant, periode, statut, date_echeance, date_paiement |
| `NotificationPlateforme` | `notifications_plateforme` | BaseModel (tenant_id **nullable**) | titre, message, type, lu, emetteur_id→utilisateurs |

**Authentification (`auth.py`)**

| Modèle | Table | Base | Colonnes clés / FK |
|---|---|---|---|
| `Utilisateur` | `utilisateurs` | BaseModel (tenant_id NOT NULL, **sans RLS**) | nom, prenom, email, mot_de_passe_hash, role, statut, derniere_connexion ; unique `(tenant_id, email)` |
| `UtilisateurPermission` | `utilisateur_permissions` | BaseModel (tenant_id) | utilisateur_id, permission, accordee_par→utilisateurs ; unique `(utilisateur_id, permission)` |
| `Session` | `sessions` | BaseModel | utilisateur_id, token_hash, ip_address, expire_at |
| `AuditLog` | `audit_logs` | BaseModel (tenant_id **nullable**, ON DELETE SET NULL) | utilisateur_id, action, table_cible, enregistrement_id, anciennes/nouvelles_valeurs (JSONB), ip_address, resultat |
| `ResetToken` | `reset_tokens` | BaseModel | utilisateur_id, token_hash, expire_at |

**Établissement (`etablissement.py`, tous TenantScoped)**

| Modèle | Table | Colonnes clés / FK |
|---|---|---|
| `Cycle` | `cycles` | nom, ordre, type_evaluation, note_max, note_passage, arrondi, valeur_systeme_ref |
| `Classe` | `classes` (ex-`niveaux`) | cycle_id→cycles, nom, ordre, valeur_systeme_ref |
| `AnneeScolaire` | `annees_scolaires` | libelle, date_debut, date_fin, est_active |
| `Periode` | `periodes` | annee_scolaire_id→annees_scolaires, nom, dates, ordre |
| `SequenceEvaluation` | `sequences_evaluation` | cycle_id→cycles, periode_id→periodes, nom, dates, ordre |
| `Salle` | `salles` (ex-`classes`) | classe_id→classes, annee_scolaire_id, nom, nom_salle, capacite |
| `Matiere` | `matieres` | classe_id→classes, nom, coefficient, note_max, est_obligatoire, est_domaine_competence, ordre, est_active, enseignant_principal_id / enseignant_assistant_id→enseignants |

> **Renommage important (migration 009)** : `classes → salles` et `niveaux → classes`.
> Depuis, une **`Classe`** est un *niveau pédagogique* (ex. « 6ème année ») et une
> **`Salle`** est une *division physique* d'une classe. Les inscriptions, absences,
> notes et bulletins pointent vers `salles` via `classe_id`.

**Élèves (`eleve.py`, tous TenantScoped)**

| Modèle | Table | Colonnes clés / FK |
|---|---|---|
| `Eleve` | `eleves` | matricule, nom, prenom, date/lieu_naissance, sexe, photo_url, nom_parent, telephone_parent, statut ; unique `(tenant_id, matricule)` |
| `Inscription` | `inscriptions` | eleve_id→eleves, classe_id→**salles**, annee_scolaire_id, date_inscription, statut |
| `Absence` | `absences` | eleve_id→eleves, classe_id→**salles**, date_absence, type, justifiee, motif, saisi_par |

**Enseignants (`enseignant.py`, tous TenantScoped)**

| Modèle | Table | Colonnes clés / FK |
|---|---|---|
| `Enseignant` | `enseignants` | nom, prenom, email, telephone, statut, date_embauche, salaire_base ; unique `(tenant_id, email)` |
| `EnseignantMatiere` | `enseignant_matieres` | enseignant_id, matiere_id, classe_id→salles (nullable) *(table pivot, dépréciée comme source de vérité)* |
| `EnseignantClasse` | `enseignant_classes` | enseignant_id, classe_id→salles, annee_scolaire_id |

**Pédagogie (`pedagogie.py`)**

| Modèle | Table | Base | Colonnes clés / FK |
|---|---|---|---|
| `Note` | `notes` | TenantScoped | eleve_id, matiere_id (SET NULL), periode_id (nullable), sequence_id, classe_id→salles, valeur, valeur_qualitative, appreciation, saisi_par |
| `Bulletin` | `bulletins` | TenantScoped | eleve_id, classe_id→salles, periode_id, moyenne_generale, rang, effectif_classe, mention, appreciation_generale, type_bulletin, statut, valide_par, date_validation |
| `BulletinLigne` | `bulletin_lignes` | **`Base` (sans tenant_id, sans RLS)** | bulletin_id→bulletins, matiere_id, note, moyenne_classe, coefficient, statut_competence, appreciation |

**Finance (`finance.py`, tous TenantScoped)**

| Modèle | Table | Colonnes clés / FK |
|---|---|---|
| `FraisScolaire` | `frais_scolaires` | classe_id→classes, annee_scolaire_id, libelle, montant, est_obligatoire |
| `Paiement` | `paiements` | **immuable** — eleve_id (RESTRICT), frais_id (RESTRICT), annee_scolaire_id (RESTRICT), montant_paye, mode_paiement, reference_transaction, encaisse_par, date_paiement, statut ; unique `(tenant_id, reference_transaction)` |
| `Depense` | `depenses` | categorie, libelle, montant, date_depense, saisi_par, justificatif_url |
| `Salaire` | `salaires` | employe_id→utilisateurs (RESTRICT), mois, montant_brut, montant_net, statut, date_paiement, valide_par |
| `CaisseJournaliere` | `caisse_journaliere` | date, solde_ouverture, total_entrees, total_sorties, solde_cloture, cloture_par |

**Valeurs système (`valeur_systeme.py`)**

| Modèle | Table | Base | Colonnes clés |
|---|---|---|---|
| `ValeurSysteme` | `valeurs_systeme` | BaseModel (**global, sans tenant_id, sans RLS**) | categorie (indexée), valeur, metadata_json (JSONB), ordre, actif |

### 3.3 Tables avec RLS vs sans RLS

**Avec RLS active** (politique `tenant_isolation`) :
`abonnements`, `factures_tenants`, `notifications_plateforme`, `audit_logs`,
`cycles`, `classes` (ex-niveaux), `salles` (ex-classes), `annees_scolaires`,
`periodes`, `sequences_evaluation`, `matieres`, `eleves`, `inscriptions`,
`absences`, `notes`, `bulletins`, `frais_scolaires`, `paiements`, `depenses`,
`salaires`, `caisse_journaliere`, `utilisateur_permissions`, `enseignants`,
`enseignant_matieres`, `enseignant_classes`.

**Sans RLS** (isolation applicative ou données globales) :

| Table | Raison |
|---|---|
| `utilisateurs` | Isolation applicative (nécessaire au login **avant** contexte tenant) |
| `sessions`, `reset_tokens` | Liées à un utilisateur, hors politique tenant |
| `tenants`, `plans_abonnement` | Données globales de la plateforme |
| `bulletin_lignes` | Isolée indirectement via la FK `bulletin_id` |
| `valeurs_systeme` | Référentiel **global** partagé par tous les tenants |

### 3.4 Historique des migrations (001 → 012)

| # | Révision | Description |
|---|---|---|
| 001 | `001_initial` | Schéma initial : toutes les tables (sauf 2 différées), 14 ENUM PostgreSQL, index `tenant_id`, activation RLS + politique `tenant_isolation` sur 21 tables. |
| 002 | `002_audit_nullable` | `audit_logs.tenant_id` rendu **nullable** (échecs de login sans contexte tenant). |
| 003 | `003_finance_statut` | Ajout `cheque` à `mode_paiement`, enum `statut_paiement`, colonne `paiements.statut` (défaut `valide`), contrainte unique `(tenant_id, reference_transaction)`. |
| 004 | `004_utilisateur_permissions` | Table `utilisateur_permissions` + RLS + index ; seed des permissions par rôle. |
| 005 | `005_update_permissions` | Réinitialisation des permissions (`DELETE FROM utilisateur_permissions`) — nouveau référentiel. |
| 006 | `006_enseignants` | Enum `statut_enseignant` + tables `enseignants`, `enseignant_matieres`, `enseignant_classes` (RLS sur les 3). |
| 007 | `007_platform_resilie` | Ajout `resilie` à `statut_abonnement` ; `notifications_plateforme.emetteur_id` (FK utilisateurs). |
| 008 | `008_valeurs_systeme` | Table globale `valeurs_systeme` (sans RLS) + seed (cycles, classes prédéfinies, périodes, années 2020–2041). |
| 009 | `009_renommage_etablissement` | **Renommage** `classes→salles`, `niveaux→classes` ; colonnes `niveau_id→classe_id`, `capacite_max→capacite` ; RLS sur `salles` ; mise à jour FK `matieres`/`frais_scolaires`. |
| 010 | `010_evaluation_par_cycle` | Colonnes d'évaluation sur `cycles` ; **suppression** de `config_notation` ; `matieres.est_domaine_competence` ; `notes.valeur` nullable + `valeur_qualitative` + CHECK XOR ; `bulletins.type_bulletin` ; `bulletin_lignes.statut_competence`. |
| 011a | `011_sequences_evaluation` | Table `sequences_evaluation` + RLS ; `notes.sequence_id` ; `notes.periode_id` nullable ; CHECK `periode_ou_sequence`. |
| 011b | `011_matieres_enrichies` | Enrichissement `matieres` (note_max, est_obligatoire, ordre, enseignant_principal_id, enseignant_assistant_id) ; `notes.matiere_id` nullable (ON DELETE SET NULL). |
| 012 | `e0b83de26a80` | **Migration de merge** fusionnant les deux branches 011 (`upgrade`/`downgrade` vides). **HEAD actuel.** |

---

## 4. BACKEND FASTAPI

### 4.1 Structure des fichiers (`backend/app/`)

```
backend/app/
├── main.py                 # App FastAPI, middlewares, handlers, routers
├── core/
│   ├── config.py           # Settings Pydantic (env)
│   ├── database.py         # Engine, session, set_tenant_context (RLS)
│   ├── redis_client.py     # Client Redis
│   └── security.py         # JWT, bcrypt, get_current_user, permissions
├── middleware/
│   ├── tenant.py           # TenantMiddleware (JWT → tenant_id)
│   └── audit.py            # AuditMiddleware (journalisation)
├── models/                 # 30 modèles SQLAlchemy (8 fichiers) + enums.py + base.py
├── schemas/                # Schémas Pydantic (par domaine)
├── routers/                # 8 routers (auth, platform, etablissement, eleve,
│                           #            enseignant, pedagogie, finance, reporting)
└── services/               # Logique métier (14 services) + permissions.py
```

### 4.2 Endpoints par module

> Convention : les chemins incluent le préfixe du router. `etablissement.py` **n'a pas
> de préfixe** (chemins montés à la racine). Statuts 201/204 indiqués si non-200.

#### 4.2.1 `auth.py` — préfixe `/auth`

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/auth/tenant/{slug}` | **Public** |
| POST | `/auth/login` | **Public** + rate limit `5/10min` par IP |
| POST | `/auth/logout` | Authentifié |
| POST | `/auth/refresh` | Authentifié |
| POST | `/auth/reset-password/request` | **Public** |
| POST | `/auth/reset-password/confirm` | **Public** (204) |
| GET | `/auth/me` | Authentifié |
| GET | `/auth/me/permissions` | Authentifié |
| GET | `/auth/utilisateurs` | `utilisateurs.gerer` |
| POST | `/auth/utilisateurs` | `utilisateurs.gerer` (201) |
| PUT | `/auth/utilisateurs/{user_id}` | `utilisateurs.gerer` |
| DELETE | `/auth/utilisateurs/{user_id}` | `utilisateurs.gerer` (204) |
| POST | `/auth/utilisateurs/{user_id}/reset-password` | `utilisateurs.gerer` |
| PUT | `/auth/utilisateurs/{user_id}/statut` | `utilisateurs.gerer` |
| GET | `/auth/utilisateurs/{user_id}/permissions` | `utilisateurs.consulter` |
| PUT | `/auth/utilisateurs/{user_id}/permissions` | `utilisateurs.gerer` |
| POST | `/auth/change-password` | Authentifié (204) |

#### 4.2.2 `platform.py` — préfixe `/platform` (tous `require_platform_owner`)

Domaines couverts : stats/dashboard, **tenants** (CRUD, suspendre, activer),
**plans** (CRUD), **abonnements** (créer, renouveler, changer-plan, résilier),
**factures** (revenus, créer, payer), **notifications** (tous / par tenant),
**audit-logs**, **utilisateurs d'un tenant** (CRUD + reset-password),
**valeurs-systeme** (CRUD). Exemples :

| Méthode | Chemin | Auth |
|---|---|---|
| GET | `/platform/stats`, `/platform/dashboard`, `/platform/statistiques` | `require_platform_owner` |
| GET/POST | `/platform/tenants` | `require_platform_owner` |
| PUT/DELETE | `/platform/tenants/{tenant_id}` | `require_platform_owner` |
| PUT | `/platform/tenants/{tenant_id}/suspendre` \| `/activer` | `require_platform_owner` |
| GET/POST/PUT/DELETE | `/platform/plans[/{id}]` | `require_platform_owner` |
| GET/POST | `/platform/abonnements` (+`/renouveler`,`/changer-plan`,`/resilier`) | `require_platform_owner` |
| GET/POST/PUT | `/platform/factures[/revenus]` (+`/payer`) | `require_platform_owner` |
| POST/GET | `/platform/notifications[/tous][/tenant/{id}]` | `require_platform_owner` |
| GET | `/platform/audit-logs` | `require_platform_owner` |
| GET/POST/PUT/DELETE | `/platform/tenants/{id}/utilisateurs[...]` | `require_platform_owner` |
| GET/POST/PUT/DELETE | `/platform/valeurs-systeme[/{id}]` | `require_platform_owner` |

#### 4.2.3 `etablissement.py` — **sans préfixe**

Alias de dépendances :
- `EstablishmentReader` = a **l'une** de `etablissement.acceder`, `classes.consulter`, `classes.gerer`
- `EstablishmentManager` = `etablissement.configurer`

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/valeurs/cycles` \| `/classes` \| `/periodes` \| `/annees-scolaires` | Authentifié |
| POST | `/wizard` | `etablissement.configurer` (201) |
| POST/GET/PUT/DELETE | `/cycles[/{id}]` | Manager (écriture) / Reader (lecture) |
| POST/GET/PUT/DELETE | `/classes[/{id}]` (+ alias legacy `/niveaux`) | Manager / Reader |
| POST/GET/PUT/DELETE | `/salles[/{id}]` (+ `/salles/{id}/effectif`) | Manager / Reader |
| POST/GET/PUT/DELETE/activer | `/annees-scolaires[/{id}]` (+ `/active`) | Manager / Reader |
| POST/GET/PUT/DELETE | `/periodes[/{id}]` | Manager / Reader |
| GET/POST/PUT/DELETE | `/sequences-evaluation[/{id}]` | **Manager** (y compris GET) |
| POST/GET/PUT/DELETE | `/matieres[/{id}]` (GET supporte `?nom=`, `?enseignant_id=`) | Manager / Reader |
| GET | `/etablissement/structure` | Reader |
| POST | `/etablissement/dupliquer` | Manager (201) |

#### 4.2.4 `eleve.py` — préfixe `/eleves`

- `StudentsReader` = `eleves.consulter` \| `eleves.inscrire` \| `eleves.dossiers`
- `StudentsWriter` = `eleves.inscrire` \| `eleves.dossiers` \| `absences.gerer`

| Méthode | Chemin | Permission |
|---|---|---|
| POST | `/eleves/inscrire` | Writer (201) |
| GET | `/eleves/` | Reader |
| GET | `/eleves/{id}` \| `/eleves/{id}/dossier` | Reader |
| PUT | `/eleves/{id}` | Writer |
| POST | `/eleves/{id}/archiver` | Writer |
| DELETE | `/eleves/{id}` | Writer (204) |
| POST | `/eleves/{id}/transferer` | Writer (201) |
| POST/GET | `/eleves/{id}/absences` | Writer / Reader |
| GET | `/eleves/classes/{classe_id}/absences` | Reader |
| PUT | `/eleves/absences/{absence_id}/justifier` | Writer |
| GET | `/eleves/{id}/carte-scolaire` \| `/attestation` \| `/certificat` | Reader (PDF) |

#### 4.2.5 `enseignant.py` — préfixe `/enseignants`

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/enseignants/` \| `/{id}` \| `/classe/{id}` \| `/matiere/{id}` | `enseignants.consulter` |
| POST | `/enseignants/` | `enseignants.gerer` (201) |
| PUT/DELETE | `/enseignants/{id}` | `enseignants.gerer` |
| POST/GET/DELETE | `/enseignants/{id}/matieres[...]` | gerer / consulter |
| POST/DELETE | `/enseignants/{id}/classes[...]` | `enseignants.gerer` |

#### 4.2.6 `pedagogie.py` — préfixe `/pedagogie`

- `PedagogyReader` = `notes.consulter` \| `resultats.consulter` \| `bulletins.generer`

| Méthode | Chemin | Permission |
|---|---|---|
| POST | `/pedagogie/notes/batch` | `notes.saisir` (201) |
| GET | `/pedagogie/notes/{eleve_id}` | Reader |
| POST | `/pedagogie/bulletins/generer` | `bulletins.generer` (201) |
| GET | `/pedagogie/eleves/{id}/bulletins` \| `/bulletins/{id}` | Reader |
| PUT | `/pedagogie/bulletins/{id}/valider` | `bulletins.valider` |
| PUT | `/pedagogie/bulletins/{id}/publier` | `bulletins.publier` |
| GET | `/pedagogie/classes/{id}/resultats` | Reader |

#### 4.2.7 `finance.py` — préfixe `/finance`

- `FinanceReader` = l'une de `paiements.consulter/historique`, `frais.consulter`, `depenses.consulter`, `salaires.consulter`, `caisse.consulter`
- `FinanceManager` = l'une de `frais.gerer`, `depenses.gerer`, `salaires.gerer`, `caisse.gerer`

| Méthode | Chemin | Permission |
|---|---|---|
| POST/GET | `/finance/frais` | Manager / Reader |
| GET | `/finance/paiements` | `paiements.consulter` |
| POST | `/finance/paiements` | `paiements.enregistrer` (201) |
| PUT | `/finance/paiements/{id}/valider` | Manager |
| GET | `/finance/eleves/{id}/situation` \| `/recus` | Reader |
| POST/GET | `/finance/depenses` | Manager / Reader |
| GET/POST | `/finance/salaires` | Reader / Manager |
| GET | `/finance/caisse` | Manager |
| GET | `/finance/situation` | Reader |
| GET | `/finance/impayes` | `paiements.suivre_retard` |
| GET | `/finance/transactions` | `paiements.historique` |
| POST | `/finance/webhook/mobile-money` | **Public** + signature HMAC `X-Webhook-Signature` (201) |

#### 4.2.8 `reporting.py` — préfixe `/reporting`

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/reporting/tableau-bord` | `rapports.financiers`\|`rapports.imprimer`\|`statistiques.*` |
| GET | `/reporting/statistiques` | `rapports.financiers`\|`statistiques.*` |
| GET | `/reporting/exports/rapport-financier` \| `/resultats-classe` | Reader (PDF/Excel) |
| GET | `/reporting/impressions/bulletin/{id}` \| `/recu/{id}` \| `/liste-classe/{id}` \| `/attestation/{id}` | `rapports.imprimer`\|`rapports.financiers`\|`documents.rapports` (PDF) |

#### 4.2.9 `main.py`

| Méthode | Chemin | Auth |
|---|---|---|
| GET | `/health` | **Public** |

### 4.3 Middlewares

**`TenantMiddleware`** (`app/middleware/tenant.py`) — ordre d'exécution : **1er** (le plus externe).

```python
PUBLIC_PATHS = {
    "/health", "/auth/login", "/auth/tenant/",
    "/auth/reset-password/request", "/auth/reset-password/confirm",
    "/finance/webhook/mobile-money",
}
DOCS_PATHS = {"/docs", "/redoc", "/openapi.json"}
```

Logique : (1) normalise le path ; (2) si `DEBUG=false` et path ∈ `DOCS_PATHS` → **404** ;
(3) path public ou `OPTIONS` → laisse passer ; (4) sinon exige `Authorization: Bearer` →
401 si absent ; (5) décode le JWT (`jwt_secret`, HS256) → 401 si invalide/expiré ;
(6) extrait `tenant_id` (obligatoire) → 401 si absent/invalide ; (7) pose
`request.state.tenant_id` / `user_id` pour la RLS et l'audit.

**`AuditMiddleware`** (`app/middleware/audit.py`) — s'exécute **après** la route.
`SKIP_AUDIT_PATHS = {"/health"}`. Journalise `action = "{method} {path}"`, le résultat
(`success` / `client_error` / `server_error` selon le status), l'IP (`X-Forwarded-For`),
dans `audit_logs` via une **session dédiée**. Si `tenant_id` est absent (ex. login échoué),
il ne fait qu'un log applicatif (pas d'écriture DB). Les erreurs d'audit ne remontent jamais.

### 4.4 Système de permissions (44 permissions)

`Permission` (`app/models/enums.py`) contient **44 valeurs** réparties en 12 groupes :

| Groupe | Nb | Permissions |
|---|---|---|
| Établissement | 2 | `etablissement.acceder`, `etablissement.configurer` |
| Élèves | 3 | `eleves.inscrire`, `eleves.dossiers`, `eleves.consulter` |
| Enseignants | 2 | `enseignants.consulter`, `enseignants.gerer` |
| Classes | 2 | `classes.consulter`, `classes.gerer` |
| Absences | 2 | `absences.consulter`, `absences.gerer` |
| Pédagogie | 6 | `notes.saisir`, `notes.consulter`, `bulletins.generer`, `bulletins.valider`, `bulletins.publier`, `resultats.consulter` |
| Paiements | 5 | `paiements.enregistrer`, `paiements.consulter`, `paiements.valider`, `paiements.suivre_retard`, `paiements.historique` |
| Finance | 8 | `frais.consulter/gerer`, `salaires.consulter/gerer`, `depenses.consulter/gerer`, `caisse.consulter/gerer` |
| Hub Documentaire | 7 | `documents.bulletins/recus/cartes_scolaires/attestations/certificats/listes_classe/rapports` |
| Rapports & Stats | 4 | `statistiques.pedagogie/finance`, `rapports.financiers/imprimer` |
| Utilisateurs | 2 | `utilisateurs.consulter`, `utilisateurs.gerer` |
| Platform | 1 | `platform.admin` |

**Logique par rôle** (`app/services/permissions.py`) :

```python
def verifier_permission(self, utilisateur, permission) -> bool:
    if utilisateur.role == RoleUtilisateur.PROMOTEUR:
        return True                                     # bypass total
    if utilisateur.role == RoleUtilisateur.PLATFORM_OWNER:
        return permission == Permission.PLATFORM_ADMIN.value
    permissions = self.get_permissions(utilisateur.id, utilisateur.tenant_id)
    return "*" in permissions or permission in permissions
```

- **promoteur** → toutes permissions.
- **platform_owner** → uniquement `platform.admin`.
- **directeur / secretaire / comptable** → permissions individuelles en base
  (`utilisateur_permissions`). Les cibles `promoteur` / `platform_owner` ne peuvent
  pas voir leurs permissions modifiées (`_assert_not_privileged_target`).

### 4.5 `require_platform_owner()` — pourquoi & où

Défini dans `app/core/security.py` :

```python
PLATFORM_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")

async def require_platform_owner(current_user = Depends(get_current_user)):
    if current_user.role != RoleUtilisateur.PLATFORM_OWNER \
       or current_user.tenant_id != PLATFORM_TENANT_ID:
        raise HTTPException(403, "Accès réservé au Platform Owner")
    return current_user
```

**Pourquoi** : les endpoints `/platform/*` exposaient une **vulnérabilité d'élévation de
privilège** — un token de rôle `promoteur` pouvait atteindre `/platform/tenants` et lister
tous les établissements. La dépendance impose désormais une **double condition** : rôle
`platform_owner` **ET** `tenant_id == 00000000-...`. **Où** : appliquée à **tous** les
endpoints du router `platform.py` (alias `PlatformOwner`).

### 4.6 Sécurité applicative

| Mécanisme | Détail (source) |
|---|---|
| **JWT** | HS256, `jwt_secret` (env), claims `sub`, `tenant_id`, `role`, `exp`. **Expiration 15 min** (`jwt_expire_minutes`). `create_access_token` / `decode_token`. |
| **Sessions** | `get_current_user` vérifie une `Session` vivante : `token_hash == sha256(token)` **et** `expire_at > now`. Le token brut n'est jamais stocké. |
| **bcrypt** | `CryptContext(schemes=["bcrypt"], bcrypt__rounds=12)` → **cost 12**. |
| **HMAC** | Webhook Mobile Money : `verifier_signature_webhook(raw_body, signature)` (HMAC-SHA256, `mobile_money_webhook_secret`), comparaison en temps constant. |
| **Rate limit** | slowapi, backend Redis, `5/10minutes` par IP réelle (X-Forwarded-For) sur `/auth/login`. Handler 429 générique : *« Trop de tentatives. Veuillez réessayer dans quelques minutes. »* |
| **/docs désactivé** | En production (`DEBUG=false`), `docs_url`/`redoc_url`/`openapi_url` = `None` **et** le `TenantMiddleware` renvoie 404 sur `/docs`, `/redoc`, `/openapi.json`. |
| **Handlers d'exception** | 422 `« Données invalides »` (détails uniquement si `debug`) ; 500 `« Erreur interne du serveur »` — **aucune stack trace exposée en production**. |
| **CORS** | Origines restreintes à `allowed_origins` (env), credentials autorisés. |

Ordre d'exécution runtime des middlewares :
`TenantMiddleware → AuditMiddleware → CORS → SlowAPI → routes`.

---

## 5. FRONTEND REACT

### 5.1 Structure `src/`

```
frontend/src/
├── main.tsx / App.tsx / router.tsx / index.css
├── components/
│   ├── auth/          # TenantPermissionGuard
│   ├── layout/        # AppLayout, PlatformLayout, PlatformSidebar
│   ├── ui/            # shadcn/ui (Toast, DataTable, dialog, card, button…)
│   ├── etablissement/ # MatiereFormModal, FormModal, EtablissementLayout
│   ├── eleves/        # EleveCard, EleveFormModal, DocumentsPanel, TransfertModal…
│   ├── enseignants/   # EnseignantForm, EnseignantMatieresField, AffectationModal
│   ├── pedagogie/     # NotesGrid, BulletinCard, ResultatsChart…
│   ├── finance/       # PaiementForm, FinanceChart…
│   ├── reporting/     # KpiGrid, ExportButton, PrintButton…
│   └── utilisateurs/  # UtilisateurEditModal, PermissionsModal…
├── pages/             # par domaine (auth, dashboard, etablissement, eleves,
│                      #  enseignants, pedagogie, finance, documents, rapports,
│                      #  platform, utilisateurs)
├── lib/               # api.ts, constants.ts, *-api.ts, route-access.ts, permissions.ts
├── hooks/             # useHasPermission, useMenuAccess, use*Access…
├── stores/            # authStore, toastStore, exportHistoryStore
└── types/index.ts     # types partagés
```

### 5.2 Routing (`src/router.tsx`, `createBrowserRouter`)

**Gardes** :
- `TenantRoute` : non authentifié → `/login` ; `platform_owner` → `/platform` ; sinon `<Outlet/>`.
- `PlatformRoute` : non authentifié → `/admin` ; rôle ≠ `platform_owner` → `/dashboard` ; sinon `<Outlet/>`.
- Gates de login : redirigent un utilisateur déjà connecté vers `getPostLoginRoute(role)`.

**Routes publiques** : `/login`, `/login/:slug`, `/admin`.

**Routes tenant** (`/` → `TenantRoute` → `AppLayout`) :
`/dashboard`, `/etablissement/{wizard,annees,periodes,classes,salles,matieres}`,
`/eleves`, `/eleves/inscrire`, `/eleves/absences`, `/eleves/:id/dossier`,
`/enseignants`, `/absences`, `/paiements`, `/documents`,
`/pedagogie/{notes,bulletins,resultats,historique}`,
`/finance/{paiements,frais,impayes,transactions,depenses,salaires,caisse,tableau-bord}`,
`/rapports`, `/utilisateurs`, `/profil`. (Routes legacy `/classes`, `/salles`,
`/reporting/*` → redirections.)

**Routes plateforme** (`/platform` → `PlatformRoute` → `PlatformLayout`) :
`/platform` (dashboard), `/tenants`, `/tenants/nouveau`, `/tenants/:id/utilisateurs`,
`/abonnements`, `/facturation`, `/notifications`, `/statistiques`, `/plans`, `/audit`,
`/valeurs-systeme`, `/profil`.

### 5.3 Stores Zustand

**`authStore`** — state : `user`, `token`, `tenant`, `permissions`, `permissionsLoaded`,
`isAuthenticated`. Actions : `hydrate`, `login`, `logout`, `refreshToken`, `setUser`,
`setPermissions`, `hasPermission`, `fetchPermissions`, `fetchProfile`. Résolution :
`promoteur` → toujours `true` ; `platform_owner` → `["platform.admin"]` ; autres →
`GET /auth/me/permissions`. Le token est en **`sessionStorage`** (`kalanko_access_token`).

**`toastStore`** — `toasts: {id, message, type}` ; `show(message, type)` (auto-dismiss 4s),
`dismiss(id)`.

**`exportHistoryStore`** — persistant (`localStorage`, clé `kalanko-export-history`),
historique des 20 derniers exports.

### 5.4 Composants clés

- **`MatiereFormModal`** (`components/etablissement/`) — création/édition d'une matière
  sur **plusieurs classes** à la fois. Charge structure + enseignants (+ matières
  existantes en édition). Par classe : coefficient, note_max (auto selon cycle : 1er
  cycle→10, 2ème→20, qualitatif→désactivé), enseignant principal/assistant. La mutation
  **diffe** les sélections : `POST` (nouvelles), `PUT` (existantes), `DELETE`
  (désélectionnées) en `Promise.all`, puis invalide `matieres`,
  `etablissement-structure`, `enseignants`.
- **`EnseignantMatieresField`** (`components/enseignants/`) — vue **lecture seule** des
  matières d'un enseignant via `GET /matieres?enseignant_id=<id>`. Message vide :
  *« Aucune matière assignée — assignez cet enseignant depuis la page Matières. »*
  (La source de vérité unique est `matieres.enseignant_principal_id`.)
- **`TenantPermissionGuard`** (`components/auth/`) — attend
  `permissionsLoaded && user` ; calcule `canAccessPath(pathname, menuAccess)` ; si non
  autorisé → redirige vers `/dashboard`.

### 5.5 Gestion des permissions (frontend)

- **`useHasPermission`** → `(permission) => boolean` (promoteur `true`, `"*"` `true`, sinon appartenance).
- **`useMenuAccess`** → flags de visibilité de menu (`showEtablissement`, `showEleves`,
  `showFinance`…) + objet `can.*` (ex. `can.paiementsEnregistrer`, `can.bulletinsValider`).
- **`route-access.ts` / `canAccessPath`** → mappe préfixes d'URL aux flags de menu.
- **`permissions.ts`** → `PERMISSION_GROUPS` (catalogue affichable dans l'UI de gestion).

### 5.6 Variables d'environnement

Une seule variable Vite est utilisée : **`VITE_API_URL`**.

```ts
// src/lib/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
```

Injectée au **build** via `frontend/Dockerfile` (`ARG VITE_API_URL` / `ENV VITE_API_URL`)
et passée par `docker-compose.yml` (`args: VITE_API_URL=https://api.kalanko.tech`).
Le client axios (`src/lib/api.ts`) ajoute automatiquement le `Bearer` et gère le
**refresh JWT single-flight** sur 401 (rejoue la requête, sinon redirige vers `/login`).

---

## 6. MODULES FONCTIONNELS (M1 → M6)

### M1 — Authentification & Accès
- **Backend** : `/auth/*` (login, logout, refresh, me, permissions, gestion utilisateurs).
- **Frontend** : `LoginPage`, `LoginPageGeneric`, `AdminLoginPage`, `UtilisateursListPage`,
  `PermissionsModal`, `ProfilPage`.
- **Règles clés** : JWT 15 min ; sessions hachées ; bcrypt cost 12 ; rate limit login
  `5/10min` ; audit systématique ; permissions individuelles par utilisateur ; rôles
  créables : `directeur`, `secretaire`, `comptable`.

### M2 — Gestion établissement
- **Backend** : `/wizard`, `/cycles`, `/classes`, `/salles`, `/annees-scolaires`,
  `/periodes`, `/sequences-evaluation`, `/matieres`, `/etablissement/structure`,
  `/etablissement/dupliquer`.
- **Frontend** : `WizardEtablissementPage`, `ClassesPage`, `SallesPage`, `MatieresPage`
  (+ `MatieresTab`, `SequencesTab`, `NotationParCycleTab`), `AnneesPage`, `PeriodesPage`.
- **Règles clés** : `Classe` = niveau, `Salle` = division physique ; notation **par
  cycle** (numérique/qualitatif, note_max, note_passage, arrondi) ; une seule année
  scolaire active ; source de vérité enseignant↔matière = `matieres.enseignant_principal_id`.

### M3 — Gestion des élèves
- **Backend** : `/eleves/inscrire`, dossier, transfert, archivage, absences (saisie,
  justification, stats), documents PDF (carte scolaire, attestation, certificat).
- **Frontend** : `ElevesListPage`, `InscriptionPage`, `EleveDossierPage`, `AbsencesPage`,
  `TransfertModal`, `DocumentsPanel`, `AbsenceForm`.
- **Règles clés** : matricule **unique par tenant** ; inscription liée à une salle et une
  année ; contrôle de capacité de salle ; documents générés via reportlab.

### M4 — Gestion pédagogique
- **Backend** : `/pedagogie/notes/batch`, notes par élève, génération/validation/
  publication de bulletins, résultats de classe.
- **Frontend** : `SaisieNotesPage` (`NotesGrid`), `BulletinsPage` (`BulletinCard`),
  `ResultatsClassePage` (`ResultatsChart`), `HistoriqueNotesPage`.
- **Règles clés** (`services/calcul_service.py`) : moyenne matière (coefficients),
  **moyenne générale**, **rang** (classement), moyenne de classe ; **mention** selon
  barème malien —

  | Moyenne | Mention |
  |---|---|
  | `< note_passage` (10) | Insuffisant |
  | `≥ 10` | Passable |
  | `≥ 12` | Assez Bien |
  | `≥ 14` | Bien |
  | `≥ 16` | Très Bien |

  Bulletins numériques **ou** qualitatifs (domaines de compétence) ; workflow
  généré → validé → publié.

### M5 — Comptabilité & Finance
- **Backend** : frais, **paiements** (enregistrer, valider, reçus, situation), dépenses,
  salaires, caisse journalière, impayés, transactions, **webhook Mobile Money**.
- **Frontend** : `PaiementsPage`, `FraisScolairesPage`, `ImpayesPage`, `TransactionsPage`,
  `DepensesPage`, `SalairesPage`, `CaissePage`, `TableauBordFinancierPage`.
- **Règles clés** (`services/finance_service.py`) : **paiements immuables** — jamais
  d'UPDATE/DELETE ; seule transition autorisée `EN_ATTENTE → VALIDE` ; référence de
  transaction **unique par tenant** ; FK RESTRICT (élève/frais/année) ; webhook signé
  HMAC-SHA256 (401 si signature absente/invalide, tentative auditée).

### M6 — Reporting & Documents
- **Backend** : `/reporting/tableau-bord`, `/statistiques`, exports (rapport financier
  PDF/Excel, résultats classe), impressions (bulletin, reçu, liste classe, attestation).
- **Frontend** : `HubDocumentairePage`, `RapportsPage`, `TableauBordPage`,
  `StatistiquesPage`, `ExportsPage`, `ImpressionsPage` (`KpiGrid`, `ExportButton`,
  `PrintButton`).
- **Règles clés** : exports reportlab (PDF) / openpyxl (Excel) ; KPI pédagogiques &
  financiers ; historique d'export persistant côté frontend.

---

## 7. INFRASTRUCTURE & DEVOPS

### 7.1 VPS

- **OS** : Ubuntu 24.04 LTS, IP `72.61.106.104`, utilisateur `kalanko`.
- **Provisioning** : `scripts/provision.sh` (idempotent, `set -euo pipefail`), 8 sections :
  1. **Hardening système** : user `kalanko`, SSH durci (`PermitRootLogin no`,
     `PasswordAuthentication no`, clés uniquement, `ClientAliveInterval 300`), timezone UTC.
  2. **Firewall UFW** : deny incoming / allow outgoing ; ouvre `22`, `80/tcp`, `443/tcp`.
  3. **Fail2ban** : jail `sshd` (`maxretry 3`, `bantime 3600`).
  4. **Docker** : Docker CE + compose plugin, user ajouté au groupe `docker`.
  5. **Caddy** : installation + génération du `Caddyfile` (mêmes en-têtes que
     `monitoring/caddyfile-prod`).
  6. **Structure projet** : `/opt/kalanko/{app,data,backups,scripts}`, clone du dépôt,
     génération du template `.env.prod` (chmod 600).
  7. **Backup PostgreSQL** : `backup.sh` (pg_dump + gzip, rétention 7) via cron **02:00 UTC**.
  8. **Résumé** : rappel DNS (A records → `72.61.106.104`), remplissage `.env.prod`, build.

### 7.2 Docker Compose — 9 conteneurs

Projet `name: kalanko`. Volumes nommés : `postgres_data`, `prometheus_data`,
`grafana_data`, `loki_data`.

| Service | Image / build | Ports | env_file | restart | depends_on |
|---|---|---|---|---|---|
| `db` | `postgres:16-alpine` | *(interne)* | — | — | — |
| `redis` | `redis:7-alpine` | *(interne)* | — | — | — |
| `backend` | build `./backend` | `8000:8000` | `.env.prod` | — | db, redis (healthy) |
| `frontend` | build `./frontend` (`VITE_API_URL=https://api.kalanko.tech`) | `3000:3000` | — | — | backend |
| `adminer` | `adminer:latest` | `127.0.0.1:8080:8080` | — | — | db |
| `prometheus` | `prom/prometheus:latest` | *(interne)* | `.env.prod` | unless-stopped | backend |
| `grafana` | `grafana/grafana:latest` | `127.0.0.1:3001:3001` | `.env.prod` | unless-stopped | prometheus, loki |
| `loki` | `grafana/loki:latest` | *(interne)* | `.env.prod` | unless-stopped | — |
| `promtail` | `grafana/promtail:latest` | *(interne)* | `.env.prod` | unless-stopped | loki |

Sécurité réseau : PostgreSQL & Redis **non exposés publiquement** ; Adminer et Grafana
**restreints à `127.0.0.1`** ; seuls `backend` (8000) et `frontend` (3000) sont exposés
et servis derrière Caddy. `db` et `redis` ont un healthcheck (`pg_isready` / `redis-cli ping`).

**Dockerfiles** :
- `backend/Dockerfile` : `python:3.12-slim`, user non-root `kalanko`, `EXPOSE 8000`,
  `uvicorn app.main:app`.
- `frontend/Dockerfile` : multi-stage `node:20-alpine` (build, `VITE_API_URL` injecté)
  → `nginx:alpine` (serve, `setcap` pour port privilégié, user `nginx`). Nginx écoute
  sur **3000** (`nginx.conf`), fallback SPA `try_files … /index.html`.

### 7.3 Caddy — reverse proxy & en-têtes

`monitoring/caddyfile-prod` (copié en `/etc/caddy/Caddyfile` au déploiement) :

**`kalanko.tech`** → `reverse_proxy localhost:3000`, `encode gzip zstd`, blocage
`@assets_slash` (`/assets` `/assets/` → 404), en-têtes de sécurité complets (voir §8.5).

**`api.kalanko.tech`** → `reverse_proxy localhost:8000`, en-têtes durcis
(`X-Frame-Options DENY`, HSTS, CORP, `-Server`, `-Via`).

**`grafana.kalanko.tech`** → `localhost:3001` (commenté, à activer manuellement).

### 7.4 Pipeline CI/CD — 7 jobs (`.github/workflows/ci-cd-devsecops.yml`)

Nom : **`CI — DevSecOps KALANKO`**. Déclencheurs : push `[main, develop]`, PR `[main]`.

| # | Job | needs | Rôle |
|---|---|---|---|
| 1 | **secrets-scan** — Gitleaks | — | Détection de secrets (`gitleaks-action@v2`, `fetch-depth: 0`). |
| 2 | **sast** — Bandit + Semgrep | secrets-scan | SAST Python : Bandit (`-r backend/ -ll`) + Semgrep (`p/python p/fastapi p/secrets`). |
| 3 | **sca** — Safety + npm audit | secrets-scan | Analyse des dépendances : `safety check -r backend/requirements.txt` + `npm audit` (frontend). |
| 4 | **container-scan** — Trivy | sast, sca | Scan filesystem (`scan-type: fs`, sévérité `CRITICAL,HIGH`). |
| 5 | **iac-scan** — Checkov | secrets-scan, sast, sca, container-scan | IaC : Checkov sur `docker-compose.yml` (`dockerfile,secrets`) + `infra/` (Terraform), `soft_fail`. |
| 6 | **deploy** — VPS | secrets-scan, sast, sca, container-scan, iac-scan | Déploiement prod (**push main uniquement**), voir §7.5. |
| 7 | **dast** — OWASP ZAP | deploy | Scan dynamique (`zap-full-scan.py` sur `https://kalanko.tech`), rapport en artefact. |

### 7.5 Job `deploy` — actions exactes

Via `appleboy/ssh-action@v1.0.0` (secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`),
condition `github.ref == 'refs/heads/main' && github.event_name == 'push'` :

```bash
cd /opt/kalanko/app
git pull origin main
docker compose up -d --build
sudo cp /opt/kalanko/app/monitoring/caddyfile-prod /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
docker compose exec -T backend alembic upgrade head
```

Le job `dast` exécute ensuite :

```bash
docker pull ghcr.io/zaproxy/zaproxy:stable
docker run --rm -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://kalanko.tech \
  -J report_json.json -w report_md.md -r report_html.html -a -I
```

Rapport uploadé en artefact `rapport-zap-kalanko` (rétention 30 j).

### 7.6 Monitoring

| Outil | Rôle | Config |
|---|---|---|
| **Prometheus** | Métriques | `monitoring/prometheus.yml` — scrape `prometheus:9090`, `backend:8000/metrics`, `host.docker.internal:2019/metrics` (Caddy). Intervalle 15 s. |
| **Grafana** | Dashboards | `127.0.0.1:3001`, mdp via `GRAFANA_PASSWORD`. |
| **Loki** | Agrégation logs | `monitoring/loki.yml` — `http:3100`, stockage filesystem, schema v13, rétention `168h`. |
| **Promtail** | Collecte logs Docker | `monitoring/promtail.yml` — lit `/var/lib/docker/containers/*/*-json.log`, push vers `loki:3100`. |

---

## 8. SÉCURITÉ

### 8.1 Défense en profondeur — 5 couches

```
Couche 1 — Réseau/Edge   : UFW (22/80/443), Fail2ban, Caddy TLS auto + en-têtes HTTP
Couche 2 — Application    : JWT 15 min + sessions hachées, bcrypt cost 12, rate limit login
Couche 3 — Autorisation   : 44 permissions, require_permission, require_platform_owner
Couche 4 — Middleware      : TenantMiddleware (tenant_id du JWT) + AuditMiddleware (audit_logs)
Couche 5 — Données         : PostgreSQL RLS (tenant_isolation) + paiements immuables
```

### 8.2 Pentest STRIDE — 9 menaces testées

| # | Cat. STRIDE | Menace testée | Résultat |
|---|---|---|---|
| 1 | **S**poofing | Login par force brute | ✅ Mitigé — rate limit `5/10min` + Fail2ban |
| 2 | **S**poofing | Réutilisation de session après logout | ✅ Mitigé — session invalidée (`token_hash`) |
| 3 | **T**ampering | Modification du claim `tenant_id` du JWT | ✅ Mitigé — signature HS256 vérifiée |
| 4 | **T**ampering (T3) | Webhook Mobile Money sans/avec mauvaise signature | ✅ Corrigé — voir §8.4 (T3) |
| 5 | **R**epudiation (R1) | Traçabilité des actions / doublons audit | ✅ Corrigé — voir §8.4 (R1) |
| 6 | **I**nfo Disclosure | Fuite de stack trace / `/docs` en prod | ✅ Mitigé — 500 générique, `/docs` désactivé (404) |
| 7 | **D**oS (D1) | Message rate limit trop verbeux | ✅ Corrigé — voir §8.4 (D1) |
| 8 | **E**levation of Privilege (S3) | Token `promoteur` → `/platform/*` | 🔴 → ✅ Corrigé — voir §8.3 |
| 9 | **E**levation of Privilege | Accès inter-tenant (RLS) | ✅ Mitigé — RLS + tests d'isolation |

### 8.3 Vulnérabilité critique S3 — élévation de privilège plateforme

- **Cause racine** : les endpoints `/platform/*` s'appuyaient sur une simple vérification
  de permission (`platform.admin`) insuffisamment stricte ; un utilisateur de rôle
  `promoteur` (dont `verifier_permission` renvoie toujours `True`) pouvait atteindre
  `GET /platform/tenants` et **lister tous les tenants** de la plateforme.
- **Correction** : introduction de `require_platform_owner()` (`app/core/security.py`)
  exigeant **simultanément** `role == platform_owner` **et**
  `tenant_id == 00000000-0000-0000-0000-000000000000` (`PLATFORM_TENANT_ID`), appliquée à
  **tous** les endpoints de `platform.py`. Tests ajoutés dans `test_platform.py` :
  token tenant → **403**, promoteur → **403**, platform_owner → **200**.

### 8.4 Findings mineurs corrigés

| ID | Catégorie | Problème | Correction |
|---|---|---|---|
| **T3** | Tampering | Le webhook `/finance/webhook/mobile-money` renvoyait **500** si la signature HMAC était absente/invalide. | Vérification de `X-Webhook-Signature` **avant** parsing → **401** *« Signature webhook invalide »*, tentative journalisée dans `audit_logs`. |
| **D1** | DoS / Info | Message rate limit verbeux (« Rate limit exceeded: 5 per 10 minute ») exposant la config. | Handler générique : *« Trop de tentatives. Veuillez réessayer dans quelques minutes. »* (`main.py`). |
| **R1** | Repudiation | `GET /platform/audit-logs` renvoyait des entrées **dupliquées** (même id) via l'agrégation multi-tenant. | Déduplication par `id` (`unique_by_id = {log.id: log …}`) puis tri par `created_at` dans `platform_service.get_audit_logs_global`. |

### 8.5 En-têtes HTTP Caddy (7)

Site `kalanko.tech` :

| # | En-tête | Valeur |
|---|---|---|
| 1 | `X-Frame-Options` | `SAMEORIGIN` (`DENY` sur l'API) |
| 2 | `X-Content-Type-Options` | `nosniff` |
| 3 | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| 4 | `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.kalanko.tech; frame-ancestors 'none';` |
| 5 | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| 6 | `Cross-Origin-Resource-Policy` | `same-origin` |
| 7 | `Cross-Origin-Opener-Policy` | `same-origin` |

Plus suppression des en-têtes révélateurs : `-Server`, `-Via`. Bypass 403 corrigé via le
bloc `@assets_slash` (`/assets`, `/assets/` → 404). Ces réglages répondent aux 9 warnings
OWASP ZAP (clickjacking, MIME sniffing, HSTS, fuite version serveur, CSP, Permissions
Policy, Proxy disclosure, bypass 403, CORP).

### 8.6 Hardening VPS

- **SSH** : root désactivé, mot de passe désactivé, clés publiques uniquement,
  `ClientAliveInterval 300 / CountMax 2`.
- **UFW** : politique deny-by-default, seuls 22/80/443 ouverts.
- **Fail2ban** : bannissement SSH (`maxretry 3`, `bantime 3600`).
- **Conteneurs non-root** : backend (`kalanko`), frontend (`nginx`).
- **Secrets** : `.env.prod` chmod 600 ; aucun secret en dur (validé par Gitleaks/Checkov).
- **Backups** : pg_dump quotidien 02:00 UTC, rétention 7 jours.

---

## 9. TESTS

**98 tests pytest** (`asyncio_mode = auto`, `testpaths = tests`) sur 9 fichiers.

| Fichier | Tests | Couverture |
|---|---|---|
| `test_auth.py` | 8 | Login (succès / mauvais mdp / tenant inactif / inconnu), brute-force rate limit, reset-password (toujours 200), expiration JWT, logout/invalidation session |
| `test_permissions.py` | 9 | PermissionService : bypass promoteur, grant/deny, set/replace, revoke, isolation tenant, platform_owner→platform.admin, `/auth/me/permissions` |
| `test_etablissement.py` | 11 | Cycles, classes (+alias niveau), salles, année active, structure complète, valeurs système, wizard complet, isolation tenant |
| `test_eleve.py` | 10 | Inscription (succès / classe pleine), matricule unique/tenant, isolation, transfert, absences (saisie/justif/stats), recherche, dossier |
| `test_enseignant.py` | 8 | CRUD enseignant, affectation matière/classe, liste par classe, isolation, email unique/tenant |
| `test_pedagogie.py` | 12 | Notes batch/upsert, moyenne pondérée, rang, mention, compétences, bulletins (numérique + qualitatif), validation/publication, isolation, résultats classe |
| `test_finance.py` | 16 | Paiement (enregistrer/lister/valider/**immuabilité**), référence unique/tenant, situations, isolation, dépenses, salaires, caisse, impayés, transactions, webhook Mobile Money (valide / invalide / absente) |
| `test_reporting.py` | 8 | Dashboard (promoteur/directeur), stats globales, taux de réussite/paiement, export PDF financier, export Excel résultats, isolation |
| `test_platform.py` | 16 | CRUD tenants (créer/suspendre/activer/modifier/supprimer), stats, CRUD plans, audit logs globaux, utilisateurs tenant + reset mdp, **contrôle d'accès** (refus non-owner / token tenant / promoteur, accept platform_owner) |

**Fixtures (`conftest.py`)** : `engine`, `db_session` (rollback par test), `seed_auth_data`
(tenant actif + directeur), `suspended_tenant`, `override_db` (autouse, contexte tenant RLS),
`reset_rate_limiter` (autouse, MemoryStorage), `async_client` (httpx ASGITransport),
`auth_headers` (login réel → Bearer). Mot de passe de test : `Password123!`.
Helpers : `permission_helpers.py`, `establishment_helpers.py`.

**Lancer les tests** :

```bash
cd backend
pytest tests/ -v
```

> Nécessite un PostgreSQL et un Redis accessibles (défaut :
> `postgresql://kalanko_user:kalanko_dev_password@localhost:5432/kalanko`).
> `KALANKO_TESTING=1` est forcé par `conftest.py`.

---

## 10. RÈGLES DE DÉVELOPPEMENT

### 10.1 Règles permanentes (`.cursorrules`)

**10 règles de sécurité obligatoires** :
1. Jamais de SQL brut — SQLAlchemy ORM uniquement.
2. Jamais de secret en dur — variables d'environnement.
3. Toujours valider les entrées avec Pydantic.
4. Toujours vérifier les permissions (`@require_permission`) avant toute action.
5. Toujours inclure `tenant_id` dans les filtres de requête.
6. Mots de passe bcrypt cost 12 — jamais en clair.
7. JWT expire après 15 minutes.
8. Journaliser les actions sensibles dans `audit_logs`.
9. Ne jamais exposer les stack traces en production.
10. Paiements **immuables** — jamais d'UPDATE/DELETE sur `paiements`.

### 10.2 Workflow Git

- **Branches** : `main` (production, déclenche deploy + dast), `develop` (intégration).
- **Commits conventionnels** : `feat` / `fix` / `sec` / `chore` / `docs`.
- **Qui fait quoi** : chaque push sur `main` déclenche le pipeline complet
  (7 jobs) ; le job `deploy` (VPS) puis `dast` (ZAP) ne s'exécutent que sur `main`.
- Les migrations Alembic sont appliquées automatiquement au déploiement
  (`alembic upgrade head`).

### 10.3 Conventions de code

- **Python** : snake_case, type hints obligatoires, docstrings sur les fonctions publiques,
  une fonction = une responsabilité.
- **TypeScript** : camelCase, interfaces préférées aux types, **pas de `any`**.
- Pas de code commenté inutile.

### 10.4 Règles métier critiques

| Domaine | Règle |
|---|---|
| **Paiements** | Immuables ; unique transition `EN_ATTENTE → VALIDE` ; référence unique par tenant ; FK RESTRICT. |
| **Isolation** | `tenant_id` sur toute table métier ; RLS PostgreSQL ; jamais de requête métier sans filtre tenant. |
| **Audit** | Toute action est journalisée par `AuditMiddleware` ; actions de permissions auditées explicitement. |
| **Plateforme** | `/platform/*` réservé au `platform_owner` (rôle + tenant technique `000…000`). |
| **Notation** | Barème par cycle (numérique/qualitatif) ; mentions selon barème malien. |

---

## 11. ÉTAT DU PROJET (19 juillet 2026)

### 11.1 Phases

| Domaine | État |
|---|---|
| M1 Authentification & Accès | ✅ Complet (backend + frontend + tests) |
| M2 Établissement | ✅ Complet |
| M3 Élèves | ✅ Complet |
| M4 Pédagogie | ✅ Complet |
| M5 Finance | ✅ Complet |
| M6 Reporting & Documents | ✅ Complet |
| Enseignants | ✅ Complet |
| Plateforme (multi-tenant) | ✅ Complet |
| Infra prod (VPS, Docker, Caddy) | ✅ Opérationnelle |
| CI/CD DevSecOps (7 jobs) | ✅ Actif (deploy + dast sur `main`) |
| Monitoring (Prometheus/Grafana/Loki/Promtail) | ✅ Déployé (Grafana à finaliser manuellement) |

**V1 fonctionnelle et déployée en production** (`https://kalanko.tech`).

### 11.2 Indicateurs DevSecOps

| Indicateur | Statut |
|---|---|
| Secret scanning (Gitleaks) | ✅ |
| SAST (Bandit, Semgrep) | ✅ |
| SCA (Safety, npm audit) | ✅ |
| Container/FS scan (Trivy) | ✅ |
| IaC scan (Checkov) | ✅ |
| DAST (OWASP ZAP) | ✅ |
| Déploiement automatisé (SSH) | ✅ |
| Hardening VPS (SSH/UFW/Fail2ban) | ✅ |
| Isolation multi-tenant (RLS) | ✅ (tests dédiés) |
| Pentest STRIDE (9 menaces) | ✅ (1 critique + 3 mineurs corrigés) |
| Supervision continue | ✅ (stack monitoring) |
| Sauvegardes automatiques | ✅ (pg_dump quotidien) |

### 11.3 Ce qui reste à faire

- **Grafana** : activer `grafana.kalanko.tech` dans Caddy et importer les dashboards.
- **Métriques backend** : exposer `/metrics` (Prometheus scrape déjà configuré).
- **Terraform (`infra/`)** : annexe présente, non pilotant le VPS actuel (provisioning
  via `provision.sh`).
- **Alignement documentaire** : mettre à jour `ARCHITECTURE_BACKEND.md` /
  `ARCHITECTURE_FRONTEND.md` (migrations 010–012, React 19/Vite 8, 44 permissions, 98 tests).
- **Table pivot `enseignant_matieres`** : conservée mais dépréciée comme source de vérité
  (unifiée sur `matieres.enseignant_principal_id`).

---

> *Fin du document — Documentation technique complète Kalanko, générée à partir du code
> source réel (dépôt `siniko`), 19 juillet 2026.*
