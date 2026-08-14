# Kalanko — Contexte projet pour Claude Code

Plateforme **SaaS multi-tenant de gestion scolaire** pour les établissements
préscolaires et fondamentaux du Mali. Développée en *vibe coding*, sécurisée
par une démarche **DevSecOps « Shift Left »**. En production sur **kalanko.tech**.

> Le code fait foi : lis le dépôt et lance `/init` pour la structure, les
> commandes et les conventions dérivables. Ce fichier ne liste que ce qui ne
> se déduit pas du code : garde-fous, pièges, état, prochaines étapes.

## Règles de sécurité NON négociables

- **Isolation multi-tenant** : toujours filtrer par `tenant_id`. Le *Row Level
  Security* PostgreSQL est la dernière barrière — ne jamais la contourner.
- **ORM uniquement** : SQLAlchemy. **Jamais de SQL brut.**
- **Aucun secret en dur** : lecture depuis l'environnement (`.env.prod`).
- **Paiements immuables** : `INSERT` seulement. **Jamais `UPDATE`/`DELETE`**
  sur `paiements` (correction = écriture compensatoire).
- **Audit log** sur toutes les actions sensibles.
- **Auth** : bcrypt `cost=12` ; JWT HS256, `exp=15min`.
- **Platform Owner** : `require_platform_owner()` vérifie rôle **ET**
  `tenant_id` réservé, sur les 36 endpoints `/platform/*`.
- **Webhooks Mobile Money** : signature **HMAC-SHA256**, comparaison à temps
  constant (`hmac.compare_digest`). Signature absente/invalide → 401 + audit.

## Pièges connus (déjà rencontrés — ne pas régresser)

- **Bandit B608** sur les f-strings des migrations Alembic : refactorer en
  templates SQL statiques avec whitelist. **Ne jamais masquer avec `nosec`.**
- **Terminologie malienne** (migrations 008–009) : un *niveau* scolaire =
  `classe` ; une division physique d'élèves = `salle`. Ne pas réinverser.
- **Matières** : source de vérité unique = `matieres.enseignant_principal_id`.
  La table pivot historique n'est **pas** faisante foi.
- **Assistant établissement** : deep-clone complet de l'état à chaque mise à
  jour (un shallow-clone a déjà corrompu les capacités de salles).
- **Dev local** : `docker-compose.yml` en `env_file: .env.prod` entre en
  conflit avec le chargement auto du `.env` de Compose. Repli : `.env.local.backup`
  pour les runs pytest locaux.

## Workflow

Génère → **pytest 101/101 doit passer** → pre-commit hooks → *(le développeur
exécute git add/commit/push)* → pipeline vert → fonctionnalité terminée.
Traite tout code généré comme **non fiable par défaut**.

### Commandes clés
- Tests : `pytest`  (101 tests attendus)
- Pre-commit : `pre-commit run --all-files`
- Migrations : `alembic upgrade head`
- Dev : `docker compose up -d --build`
- Déploiement : push sur `main` → GitHub Actions (7 jobs) → SSH sur le VPS
  (build, `alembic upgrade head`, reload Caddy). **Pas de modif manuelle en prod.**

## Pipeline CI/CD (7 jobs — les bloquants doivent passer)

1. Gitleaks — secrets **(bloquant)**
2. Bandit + Semgrep — SAST **(bloquant)**
3. Safety + npm audit — SCA (avert.)
4. Trivy — images Docker **(bloquant)**
5. Checkov — IaC (soft-fail)
6. Deploy SSH (`appleboy/ssh-action`)
7. OWASP ZAP — DAST (avert.)

## Stack & infra (résumé — détails dans les docs importées)

- Frontend : React 18 / Vite / TypeScript — nginx:3000
- Backend : FastAPI (Python 3.12) / SQLAlchemy / Alembic — :8000
- BDD : PostgreSQL 16 + RLS (21 tables) · Cache : Redis 7
- Docker Compose (9 services) derrière Caddy (HTTPS auto)
- Monitoring : Prometheus / Grafana / Loki / Promtail
- VPS Hostinger, Ubuntu 24.04 LTS, kalanko.tech. Ports 5432/6379 **fermés** au
  public. SSH clé uniquement, UFW, Fail2ban. `.env.prod` → `/opt/kalanko/.env.prod`.
- Repo : `aroutnous/kalanko` · Platform Owner : aroutnous@gmail.com

## État actuel

Production opérationnelle · 6/6 modules · 101/101 tests · 140/0 ZAP ·
**0 vulnérabilité résiduelle** (S3 Platform Owner corrigée) · 12 migrations ·
44 permissions · premier tenant créé.

## Prochaines étapes (phase produit)

- **Environnement de staging** dédié (pour ne plus tester en production).
- **Tests E2E automatisés** (5 rôles) — Playwright ou Cypress.
- **Onboarding des établissements** pour la rentrée d'octobre (accès gratuit
  jusqu'à 2 ans, boucle de retours).
- Améliorations pilotées par les retours des tenants.

## Documentation détaillée

@ARCHITECTURE_BACKEND.md
@ARCHITECTURE_FRONTEND.md
@DOCUMENTATION_COMPLETE.md
