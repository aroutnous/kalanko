"""Peuple la base de données locale avec un tenant de test réaliste.

RÉSERVÉ AU DÉVELOPPEMENT LOCAL — ne peut pas s'exécuter en production.
Voir la section "Workflow local -> prod" de CLAUDE.md pour l'usage.

Usage :
    cd backend && python -m scripts.seed_local [--yes]
"""

from __future__ import annotations

import os
import sys
from urllib.parse import urlsplit

# --- Garde-fou 1/3 : variable d'environnement brute, AVANT tout import app.* ---
# Vérifié en premier, sans dépendre du parsing pydantic-settings, pour ne pas
# faire confiance à app.core.config avant même de savoir si on est en local.
_env_raw = os.environ.get("ENVIRONMENT")
if _env_raw is not None and _env_raw != "development":
    print(
        f"REFUS : ENVIRONMENT={_env_raw!r} — ce script ne peut tourner qu'en "
        "développement local (ENVIRONMENT=development ou absent)."
    )
    sys.exit(1)

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal, set_tenant_context  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.eleve import Eleve, Inscription  # noqa: E402
from app.models.enseignant import Enseignant  # noqa: E402
from app.models.enums import (  # noqa: E402
    ModePaiement,
    Permission,
    RoleUtilisateur,
    SexeEleve,
    StatutEleve,
    StatutInscription,
    StatutPaiement,
    StatutTenant,
    StatutUtilisateur,
)
from app.models.etablissement import AnneeScolaire, Classe, Cycle, Matiere, Salle  # noqa: E402
from app.models.finance import FraisScolaire, Paiement  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.models.auth import Utilisateur, UtilisateurPermission  # noqa: E402

from datetime import date  # noqa: E402
from decimal import Decimal  # noqa: E402

from sqlalchemy.orm import Session  # noqa: E402


# --- Garde-fou 2/3 : settings applicatifs parsés (redondant avec le check brut
# ci-dessus — protège contre un .env qui définirait ENVIRONMENT=production sans
# que la variable d'environnement shell ne le montre) ---
if settings.is_production or settings.environment != "development":
    print(
        f"REFUS : settings.environment={settings.environment!r} — ce script ne "
        "peut tourner qu'en développement local."
    )
    sys.exit(1)

# --- Garde-fou 3/3 : liste blanche sur l'hôte de DATABASE_URL ---
# Le check le plus robuste : contrairement à ENVIRONMENT (un simple label), un
# DATABASE_URL de prod ne peut pas accidentellement résoudre vers un hôte local.
_ALLOWED_DB_HOSTS = {"localhost", "127.0.0.1", "db"}  # "db" = service docker-compose
_db_host = urlsplit(settings.database_url).hostname
if _db_host not in _ALLOWED_DB_HOSTS:
    print(
        f"REFUS : hôte DATABASE_URL={_db_host!r} non autorisé pour ce script "
        f"(autorisés : {sorted(_ALLOWED_DB_HOSTS)})."
    )
    sys.exit(1)


TEST_TENANT_SLUG = "ecole-test"
TEST_DIRECTEUR_EMAIL = "directeur@ecole-test.ml"
TEST_DIRECTEUR_PASSWORD = "Password123!"

# Mirroir de tests/permission_helpers.py::ROLE_DEFAULT_PERMISSIONS[DIRECTEUR] —
# dupliqué ici volontairement (scripts/ ne doit pas dépendre de tests/) ; à
# garder synchronisé si le référentiel de permissions du rôle directeur change.
DIRECTEUR_PERMISSIONS = [
    Permission.ETABLISSEMENT_ACCEDER.value,
    Permission.ETABLISSEMENT_CONFIGURER.value,
    Permission.CLASSES_CONSULTER.value,
    Permission.CLASSES_GERER.value,
    Permission.ELEVES_CONSULTER.value,
    Permission.ELEVES_INSCRIRE.value,
    Permission.ELEVES_DOSSIERS.value,
    Permission.ENSEIGNANTS_CONSULTER.value,
    Permission.ENSEIGNANTS_GERER.value,
    Permission.ABSENCES_CONSULTER.value,
    Permission.ABSENCES_GERER.value,
    Permission.NOTES_CONSULTER.value,
    Permission.NOTES_SAISIR.value,
    Permission.BULLETINS_GENERER.value,
    Permission.BULLETINS_VALIDER.value,
    Permission.BULLETINS_PUBLIER.value,
    Permission.RESULTATS_CONSULTER.value,
    Permission.RAPPORTS_FINANCIERS.value,
    Permission.STATISTIQUES_PEDAGOGIE.value,
    Permission.UTILISATEURS_CONSULTER.value,
    Permission.UTILISATEURS_GERER.value,
]

ELEVES_DATA = [
    dict(
        matricule="ET-2025-001",
        nom="Keïta",
        prenom="Ibrahim",
        sexe=SexeEleve.M,
        date_naissance=date(2013, 3, 12),
        nom_parent="Oumar Keïta",
        telephone_parent="+22370001122",
    ),
    dict(
        matricule="ET-2025-002",
        nom="Sidibé",
        prenom="Aminata",
        sexe=SexeEleve.F,
        date_naissance=date(2013, 7, 4),
        nom_parent="Mariam Sidibé",
        telephone_parent="+22370001123",
    ),
    dict(
        matricule="ET-2025-003",
        nom="Touré",
        prenom="Modibo",
        sexe=SexeEleve.M,
        date_naissance=date(2013, 1, 20),
        nom_parent="Sekou Touré",
        telephone_parent="+22370001124",
    ),
    dict(
        matricule="ET-2025-004",
        nom="Diarra",
        prenom="Kadiatou",
        sexe=SexeEleve.F,
        date_naissance=date(2013, 11, 9),
        nom_parent="Salif Diarra",
        telephone_parent="+22370001125",
    ),
]


def _get_or_create(db: Session, model, defaults: dict | None = None, **lookup):
    """Renvoie (instance, created). Ne modifie jamais une instance existante."""
    instance = db.query(model).filter_by(**lookup).first()
    if instance is not None:
        return instance, False
    instance = model(**lookup, **(defaults or {}))
    db.add(instance)
    db.flush()
    return instance, True


def _grant_directeur_permissions(db: Session, directeur: Utilisateur) -> None:
    for permission in DIRECTEUR_PERMISSIONS:
        exists = (
            db.query(UtilisateurPermission)
            .filter(
                UtilisateurPermission.utilisateur_id == directeur.id,
                UtilisateurPermission.permission == permission,
            )
            .first()
        )
        if exists is None:
            db.add(
                UtilisateurPermission(
                    tenant_id=directeur.tenant_id,
                    utilisateur_id=directeur.id,
                    permission=permission,
                    accordee_par=directeur.id,
                )
            )
    db.flush()


def _confirm(skip_confirm: bool) -> None:
    if skip_confirm:
        return
    print(f"Cible : base sur '{_db_host}' — tenant '{TEST_TENANT_SLUG}'.")
    answer = input("Continuer le seed local ? [y/N] ").strip().lower()
    if answer != "y":
        print("Annulé.")
        sys.exit(0)


def main() -> None:
    skip_confirm = "--yes" in sys.argv[1:]
    _confirm(skip_confirm)

    db = SessionLocal()
    try:
        tenant, _ = _get_or_create(
            db,
            Tenant,
            slug=TEST_TENANT_SLUG,
            defaults={"nom": "École Test", "statut": StatutTenant.ACTIF},
        )
        set_tenant_context(db, tenant.id)

        directeur, _ = _get_or_create(
            db,
            Utilisateur,
            tenant_id=tenant.id,
            email=TEST_DIRECTEUR_EMAIL,
            defaults={
                "nom": "Diallo",
                "prenom": "Amadou",
                "mot_de_passe_hash": hash_password(TEST_DIRECTEUR_PASSWORD),
                "role": RoleUtilisateur.DIRECTEUR,
                "statut": StatutUtilisateur.ACTIF,
            },
        )
        _grant_directeur_permissions(db, directeur)

        cycle, _ = _get_or_create(
            db,
            Cycle,
            tenant_id=tenant.id,
            nom="Fondamental",
            defaults={
                "ordre": 1,
                "type_evaluation": "chiffree",
                "note_max": Decimal("20"),
                "note_passage": Decimal("10"),
            },
        )

        classe, _ = _get_or_create(
            db,
            Classe,
            tenant_id=tenant.id,
            cycle_id=cycle.id,
            nom="6ème Année",
            defaults={"ordre": 1},
        )

        annee, _ = _get_or_create(
            db,
            AnneeScolaire,
            tenant_id=tenant.id,
            libelle="2025-2026",
            defaults={
                "date_debut": date(2025, 9, 1),
                "date_fin": date(2026, 6, 30),
                "est_active": True,
            },
        )

        salle_a, _ = _get_or_create(
            db,
            Salle,
            tenant_id=tenant.id,
            classe_id=classe.id,
            annee_scolaire_id=annee.id,
            nom="6ème A",
            defaults={"nom_salle": "6ème A", "capacite": 40},
        )
        salle_b, _ = _get_or_create(
            db,
            Salle,
            tenant_id=tenant.id,
            classe_id=classe.id,
            annee_scolaire_id=annee.id,
            nom="6ème B",
            defaults={"nom_salle": "6ème B", "capacite": 40},
        )

        enseignant_1, _ = _get_or_create(
            db,
            Enseignant,
            tenant_id=tenant.id,
            email="f.traore@ecole-test.ml",
            defaults={
                "nom": "Traoré",
                "prenom": "Fatoumata",
                "salaire_base": Decimal("150000.00"),
            },
        )
        _get_or_create(
            db,
            Enseignant,
            tenant_id=tenant.id,
            email="m.coulibaly@ecole-test.ml",
            defaults={
                "nom": "Coulibaly",
                "prenom": "Moussa",
                "salaire_base": Decimal("140000.00"),
            },
        )

        _get_or_create(
            db,
            Matiere,
            tenant_id=tenant.id,
            classe_id=classe.id,
            nom="Mathématiques",
            defaults={"coefficient": Decimal("2"), "enseignant_principal_id": enseignant_1.id},
        )

        eleves = []
        for data in ELEVES_DATA:
            eleve, _ = _get_or_create(
                db,
                Eleve,
                tenant_id=tenant.id,
                matricule=data["matricule"],
                defaults={
                    "nom": data["nom"],
                    "prenom": data["prenom"],
                    "sexe": data["sexe"],
                    "date_naissance": data["date_naissance"],
                    "nom_parent": data["nom_parent"],
                    "telephone_parent": data["telephone_parent"],
                    "statut": StatutEleve.ACTIF,
                },
            )
            eleves.append(eleve)

        salles_cycle = [salle_a, salle_b]
        for index, eleve in enumerate(eleves):
            salle = salles_cycle[index % 2]
            _get_or_create(
                db,
                Inscription,
                tenant_id=tenant.id,
                eleve_id=eleve.id,
                annee_scolaire_id=annee.id,
                defaults={
                    "classe_id": salle.id,
                    "date_inscription": date(2025, 9, 1),
                    "statut": StatutInscription.INSCRIT,
                },
            )

        frais, _ = _get_or_create(
            db,
            FraisScolaire,
            tenant_id=tenant.id,
            classe_id=classe.id,
            annee_scolaire_id=annee.id,
            libelle="Frais de scolarité annuels",
            defaults={"montant": Decimal("75000.00"), "est_obligatoire": True},
        )

        paiement, _ = _get_or_create(
            db,
            Paiement,
            tenant_id=tenant.id,
            reference_transaction="SEED-PAY-0001",
            defaults={
                "eleve_id": eleves[0].id,
                "frais_id": frais.id,
                "annee_scolaire_id": annee.id,
                "montant_paye": Decimal("25000.00"),
                "mode_paiement": ModePaiement.ESPECES,
                "date_paiement": date(2025, 9, 15),
                "encaisse_par": directeur.id,
                "statut": StatutPaiement.VALIDE,
            },
        )

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("=" * 60)
    print("Seed local terminé.")
    print(f"Tenant       : École Test (slug={TEST_TENANT_SLUG})")
    print(f"Connexion    : {TEST_DIRECTEUR_EMAIL} / {TEST_DIRECTEUR_PASSWORD}")
    print(f"Élèves       : {len(ELEVES_DATA)} inscrits (ET-2025-001..004)")
    print("Enseignants  : 2")
    print(f"Paiement test: 25 000 FCFA (référence {paiement.reference_transaction})")
    print("=" * 60)


if __name__ == "__main__":
    main()
