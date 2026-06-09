"""Service de permissions dynamiques par utilisateur (M1)."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import set_tenant_context
from app.models.auth import Utilisateur, UtilisateurPermission
from app.models.enums import Permission, RoleUtilisateur
from app.services.audit_service import log_audit


class PermissionService:
    """Gestion des permissions individuelles stockées en base."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_permissions(
        self,
        utilisateur_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> list[str]:
        """Retourne les permissions effectives d'un utilisateur."""
        utilisateur = self._get_utilisateur(utilisateur_id, tenant_id)

        if utilisateur.role == RoleUtilisateur.PROMOTEUR:
            return ["*"]

        if utilisateur.role == RoleUtilisateur.PLATFORM_OWNER:
            return [Permission.PLATFORM_ADMIN.value]

        set_tenant_context(self.db, tenant_id)
        rows = (
            self.db.query(UtilisateurPermission.permission)
            .filter(
                UtilisateurPermission.utilisateur_id == utilisateur_id,
                UtilisateurPermission.tenant_id == tenant_id,
            )
            .order_by(UtilisateurPermission.permission)
            .all()
        )
        return [row[0] for row in rows]

    def verifier_permission(self, utilisateur: Utilisateur, permission: str) -> bool:
        """Vérifie si l'utilisateur dispose de la permission demandée."""
        if utilisateur.role == RoleUtilisateur.PROMOTEUR:
            return True

        if utilisateur.role == RoleUtilisateur.PLATFORM_OWNER:
            return permission == Permission.PLATFORM_ADMIN.value

        permissions = self.get_permissions(utilisateur.id, utilisateur.tenant_id)
        return "*" in permissions or permission in permissions

    def accorder_permission(
        self,
        utilisateur_id: uuid.UUID,
        permission: str,
        accordee_par_id: uuid.UUID,
        tenant_id: uuid.UUID,
        *,
        ip_address: str | None = None,
    ) -> UtilisateurPermission:
        """Accorde une permission à un utilisateur."""
        self._assert_not_privileged_target(utilisateur_id, tenant_id)

        existing = self._get_permission_row(utilisateur_id, permission, tenant_id)
        if existing is not None:
            return existing

        set_tenant_context(self.db, tenant_id)
        row = UtilisateurPermission(
            tenant_id=tenant_id,
            utilisateur_id=utilisateur_id,
            permission=permission,
            accordee_par=accordee_par_id,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)

        log_audit(
            self.db,
            action="auth.permission.grant",
            resultat="success",
            tenant_id=tenant_id,
            utilisateur_id=accordee_par_id,
            ip_address=ip_address,
            table_cible="utilisateur_permissions",
            enregistrement_id=row.id,
            details={"utilisateur_id": str(utilisateur_id), "permission": permission},
        )
        return row

    def revoquer_permission(
        self,
        utilisateur_id: uuid.UUID,
        permission: str,
        tenant_id: uuid.UUID,
        *,
        accordee_par_id: uuid.UUID | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Révoque une permission d'un utilisateur."""
        self._assert_not_privileged_target(utilisateur_id, tenant_id)

        row = self._get_permission_row(utilisateur_id, permission, tenant_id)
        if row is None:
            return

        set_tenant_context(self.db, tenant_id)
        self.db.delete(row)
        self.db.commit()

        log_audit(
            self.db,
            action="auth.permission.revoke",
            resultat="success",
            tenant_id=tenant_id,
            utilisateur_id=accordee_par_id,
            ip_address=ip_address,
            table_cible="utilisateur_permissions",
            enregistrement_id=row.id,
            details={"utilisateur_id": str(utilisateur_id), "permission": permission},
        )

    def set_permissions(
        self,
        utilisateur_id: uuid.UUID,
        permissions: list[str],
        accordee_par_id: uuid.UUID,
        tenant_id: uuid.UUID,
        *,
        ip_address: str | None = None,
    ) -> list[UtilisateurPermission]:
        """Remplace toutes les permissions existantes par la nouvelle liste."""
        self._assert_not_privileged_target(utilisateur_id, tenant_id)

        set_tenant_context(self.db, tenant_id)
        anciennes = self.get_permissions(utilisateur_id, tenant_id)

        (
            self.db.query(UtilisateurPermission)
            .filter(
                UtilisateurPermission.utilisateur_id == utilisateur_id,
                UtilisateurPermission.tenant_id == tenant_id,
            )
            .delete()
        )

        nouvelles: list[UtilisateurPermission] = []
        for permission in sorted(set(permissions)):
            row = UtilisateurPermission(
                tenant_id=tenant_id,
                utilisateur_id=utilisateur_id,
                permission=permission,
                accordee_par=accordee_par_id,
            )
            self.db.add(row)
            nouvelles.append(row)

        self.db.commit()
        for row in nouvelles:
            self.db.refresh(row)

        log_audit(
            self.db,
            action="auth.permission.set",
            resultat="success",
            tenant_id=tenant_id,
            utilisateur_id=accordee_par_id,
            ip_address=ip_address,
            table_cible="utilisateur_permissions",
            enregistrement_id=utilisateur_id,
            details={
                "utilisateur_id": str(utilisateur_id),
                "anciennes": anciennes,
                "nouvelles": permissions,
            },
        )
        return nouvelles

    def _get_utilisateur(
        self,
        utilisateur_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> Utilisateur:
        utilisateur = (
            self.db.query(Utilisateur)
            .filter(
                Utilisateur.id == utilisateur_id,
                Utilisateur.tenant_id == tenant_id,
            )
            .first()
        )
        if utilisateur is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur introuvable",
            )
        return utilisateur

    def _get_permission_row(
        self,
        utilisateur_id: uuid.UUID,
        permission: str,
        tenant_id: uuid.UUID,
    ) -> UtilisateurPermission | None:
        set_tenant_context(self.db, tenant_id)
        return (
            self.db.query(UtilisateurPermission)
            .filter(
                UtilisateurPermission.utilisateur_id == utilisateur_id,
                UtilisateurPermission.tenant_id == tenant_id,
                UtilisateurPermission.permission == permission,
            )
            .first()
        )

    def _assert_not_privileged_target(
        self,
        utilisateur_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> None:
        utilisateur = self._get_utilisateur(utilisateur_id, tenant_id)
        if utilisateur.role in (
            RoleUtilisateur.PROMOTEUR,
            RoleUtilisateur.PLATFORM_OWNER,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de modifier les permissions de ce rôle",
            )


def user_has_permission(
    db: Session,
    utilisateur: Utilisateur,
    permission: str,
) -> bool:
    """Helper pour les contrôles d'accès dans les routeurs."""
    return PermissionService(db).verifier_permission(utilisateur, permission)


def user_has_any_permission(
    db: Session,
    utilisateur: Utilisateur,
    *permissions: str,
) -> bool:
    """Vrai si l'utilisateur possède au moins une des permissions listées."""
    service = PermissionService(db)
    return any(service.verifier_permission(utilisateur, p) for p in permissions)
