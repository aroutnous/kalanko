"""Permissions par défaut pour les tests (équivalent ancien ROLE_PERMISSIONS)."""

import uuid

from sqlalchemy.orm import Session

from app.core.database import set_tenant_context
from app.models.auth import Utilisateur, UtilisateurPermission
from app.models.enums import Permission, RoleUtilisateur

ROLE_DEFAULT_PERMISSIONS: dict[RoleUtilisateur, list[str]] = {
    RoleUtilisateur.DIRECTEUR: [
        Permission.CLASSES_READ.value,
        Permission.CLASSES_WRITE.value,
        Permission.ELEVES_READ.value,
        Permission.ELEVES_WRITE.value,
        Permission.ELEVES_DELETE.value,
        Permission.ELEVES_IMPRIMER.value,
        Permission.ENSEIGNANTS_READ.value,
        Permission.ENSEIGNANTS_WRITE.value,
        Permission.ABSENCES_READ.value,
        Permission.ABSENCES_WRITE.value,
        Permission.NOTES_READ.value,
        Permission.NOTES_WRITE.value,
        Permission.BULLETINS_READ.value,
        Permission.BULLETINS_WRITE.value,
        Permission.BULLETINS_VALIDATE.value,
        Permission.BULLETINS_PUBLISH.value,
        Permission.BULLETINS_IMPRIMER.value,
        Permission.RAPPORTS_READ.value,
        Permission.STATISTIQUES_READ.value,
        Permission.UTILISATEURS_READ.value,
        Permission.UTILISATEURS_WRITE.value,
    ],
    RoleUtilisateur.SECRETAIRE: [
        Permission.CLASSES_READ.value,
        Permission.ELEVES_READ.value,
        Permission.ELEVES_WRITE.value,
        Permission.ABSENCES_READ.value,
        Permission.ABSENCES_WRITE.value,
        Permission.PAIEMENTS_READ.value,
        Permission.PAIEMENTS_WRITE.value,
        Permission.PAIEMENTS_IMPRIMER.value,
        Permission.RAPPORTS_READ.value,
        Permission.RAPPORTS_IMPRIMER.value,
    ],
    RoleUtilisateur.COMPTABLE: [
        Permission.CLASSES_READ.value,
        Permission.PAIEMENTS_READ.value,
        Permission.PAIEMENTS_WRITE.value,
        Permission.PAIEMENTS_VALIDATE.value,
        Permission.PAIEMENTS_IMPRIMER.value,
        Permission.FRAIS_READ.value,
        Permission.FRAIS_WRITE.value,
        Permission.SALAIRES_READ.value,
        Permission.SALAIRES_WRITE.value,
        Permission.DEPENSES_READ.value,
        Permission.DEPENSES_WRITE.value,
        Permission.RAPPORTS_READ.value,
        Permission.STATISTIQUES_READ.value,
    ],
}


def grant_role_permissions(
    db: Session,
    user: Utilisateur,
    *,
    accordee_par_id: uuid.UUID | None = None,
) -> None:
    """Accorde les permissions par défaut du rôle (sauf rôles privilégiés)."""
    if user.role in (RoleUtilisateur.PROMOTEUR, RoleUtilisateur.PLATFORM_OWNER):
        return

    permissions = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    if not permissions:
        return

    grantor_id = accordee_par_id or user.id
    set_tenant_context(db, user.tenant_id)
    for permission in permissions:
        exists = (
            db.query(UtilisateurPermission)
            .filter(
                UtilisateurPermission.utilisateur_id == user.id,
                UtilisateurPermission.tenant_id == user.tenant_id,
                UtilisateurPermission.permission == permission,
            )
            .first()
        )
        if exists is None:
            db.add(
                UtilisateurPermission(
                    tenant_id=user.tenant_id,
                    utilisateur_id=user.id,
                    permission=permission,
                    accordee_par=grantor_id,
                )
            )
    db.flush()
