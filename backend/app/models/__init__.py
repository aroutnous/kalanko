"""
Import centralisé de tous les modèles SQLAlchemy.

Nécessaire pour Alembic (metadata) et évite les imports circulaires.
"""

from app.core.database import Base
from app.models.auth import AuditLog, ResetToken, Session, Utilisateur, UtilisateurPermission
from app.models.base import BaseModel, TenantScopedModel
from app.models.eleve import Absence, Eleve, Inscription
from app.models.enseignant import Enseignant, EnseignantClasse, EnseignantMatiere
from app.models.enums import (
    ModePaiement,
    StatutPaiement,
    Permission,
    RoleUtilisateur,
    SexeEleve,
    StatutAbonnement,
    StatutBulletin,
    StatutEleve,
    StatutEnseignant,
    StatutFacture,
    StatutInscription,
    StatutSalaire,
    StatutTenant,
    StatutUtilisateur,
    TypeAbsence,
    TypeNotification,
)
from app.models.etablissement import (
    AnneeScolaire,
    Classe,
    ConfigNotation,
    Cycle,
    Matiere,
    Niveau,
    Periode,
)
from app.models.finance import CaisseJournaliere, Depense, FraisScolaire, Paiement, Salaire
from app.models.pedagogie import Bulletin, BulletinLigne, Note
from app.models.tenant import (
    Abonnement,
    FactureTenant,
    NotificationPlateforme,
    PlanAbonnement,
    Tenant,
)

__all__ = [
    "Base",
    "BaseModel",
    "TenantScopedModel",
    "Tenant",
    "PlanAbonnement",
    "Abonnement",
    "FactureTenant",
    "NotificationPlateforme",
    "Utilisateur",
    "UtilisateurPermission",
    "Session",
    "AuditLog",
    "ResetToken",
    "Cycle",
    "Niveau",
    "AnneeScolaire",
    "Periode",
    "Classe",
    "Matiere",
    "ConfigNotation",
    "Eleve",
    "Inscription",
    "Absence",
    "Enseignant",
    "EnseignantMatiere",
    "EnseignantClasse",
    "Note",
    "Bulletin",
    "BulletinLigne",
    "FraisScolaire",
    "Paiement",
    "Depense",
    "Salaire",
    "CaisseJournaliere",
    "Permission",
    "RoleUtilisateur",
    "StatutUtilisateur",
    "StatutTenant",
    "StatutAbonnement",
    "StatutFacture",
    "TypeNotification",
    "SexeEleve",
    "StatutEleve",
    "StatutEnseignant",
    "StatutInscription",
    "TypeAbsence",
    "StatutBulletin",
    "ModePaiement",
    "StatutPaiement",
    "StatutSalaire",
]
