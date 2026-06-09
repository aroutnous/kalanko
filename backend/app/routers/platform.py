"""Routes administration plateforme — Platform Owner (M1)."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.database import DbSession
from app.core.security import require_permission
from app.models.auth import Utilisateur
from app.models.enums import Permission, StatutTenant
from app.schemas.platform import (
    AbonnementResponse,
    AuditLogResponse,
    FactureResponse,
    NotificationPlateformeCreate,
    PlanCreate,
    PlanResponse,
    PlatformStatsResponse,
    ResetPasswordResponse,
    TenantCreate,
    TenantCreateResponse,
    TenantResponse,
    TenantUpdate,
    UtilisateurTenantCreate,
    UtilisateurTenantResponse,
    UtilisateurTenantUpdate,
)
from app.services.platform_service import PlatformService

router = APIRouter(prefix="/platform", tags=["platform"])

PlatformAdmin = Annotated[
    Utilisateur, Depends(require_permission(Permission.PLATFORM_ADMIN.value))
]


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _service(db: DbSession, user: Utilisateur, request: Request) -> PlatformService:
    return PlatformService(
        db=db,
        utilisateur_id=user.id,
        ip_address=_client_ip(request),
    )


@router.get("/stats", response_model=PlatformStatsResponse)
def get_stats_plateforme(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> PlatformStatsResponse:
    return _service(db, user, request).get_stats_plateforme()


@router.get("/tenants", response_model=list[TenantResponse])
def list_tenants(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
    statut: StatutTenant | None = Query(default=None),
) -> list[TenantResponse]:
    return _service(db, user, request).get_tous_tenants(statut)


@router.post(
    "/tenants",
    response_model=TenantCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_tenant(
    body: TenantCreate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> TenantCreateResponse:
    return _service(db, user, request).creer_tenant(body)


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def modifier_tenant(
    tenant_id: uuid.UUID,
    body: TenantUpdate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> TenantResponse:
    return _service(db, user, request).modifier_tenant(tenant_id, body)


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_tenant(
    tenant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> None:
    _service(db, user, request).supprimer_tenant(tenant_id)


@router.put("/tenants/{tenant_id}/suspendre", response_model=TenantResponse)
def suspendre_tenant(
    tenant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> TenantResponse:
    return _service(db, user, request).suspendre_tenant(tenant_id)


@router.put("/tenants/{tenant_id}/activer", response_model=TenantResponse)
def activer_tenant(
    tenant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> TenantResponse:
    return _service(db, user, request).activer_tenant(tenant_id)


@router.get("/plans", response_model=list[PlanResponse])
def list_plans(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> list[PlanResponse]:
    return _service(db, user, request).get_plans()


@router.post(
    "/plans",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_plan(
    body: PlanCreate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> PlanResponse:
    return _service(db, user, request).creer_plan(body)


@router.get("/abonnements", response_model=list[AbonnementResponse])
def list_abonnements(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
    tenant_id: uuid.UUID | None = Query(default=None),
) -> list[AbonnementResponse]:
    abonnements = _service(db, user, request).get_abonnements(tenant_id)
    return [AbonnementResponse.model_validate(a) for a in abonnements]


@router.get("/factures", response_model=list[FactureResponse])
def list_factures(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
    tenant_id: uuid.UUID | None = Query(default=None),
) -> list[FactureResponse]:
    factures = _service(db, user, request).get_factures(tenant_id)
    return [FactureResponse.model_validate(f) for f in factures]


@router.post("/notifications", status_code=status.HTTP_201_CREATED)
def envoyer_notification(
    body: NotificationPlateformeCreate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> dict[str, str]:
    return _service(db, user, request).envoyer_notification(body)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs_global(
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
    date_debut: date | None = Query(default=None),
    date_fin: date | None = Query(default=None),
    action: str | None = Query(default=None),
    tenant_id: uuid.UUID | None = Query(default=None),
) -> list[AuditLogResponse]:
    filtre = {
        "date_debut": date_debut,
        "date_fin": date_fin,
        "action": action,
        "tenant_id": tenant_id,
    }
    logs = _service(db, user, request).get_audit_logs_global(filtre)
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.get(
    "/tenants/{tenant_id}/utilisateurs",
    response_model=list[UtilisateurTenantResponse],
)
def list_utilisateurs_tenant(
    tenant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> list[UtilisateurTenantResponse]:
    return _service(db, user, request).get_utilisateurs_tenant(tenant_id)


@router.post(
    "/tenants/{tenant_id}/utilisateurs",
    response_model=UtilisateurTenantResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_utilisateur_tenant(
    tenant_id: uuid.UUID,
    body: UtilisateurTenantCreate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> UtilisateurTenantResponse:
    return _service(db, user, request).creer_utilisateur_tenant(tenant_id, body)


@router.put(
    "/tenants/{tenant_id}/utilisateurs/{user_id}",
    response_model=UtilisateurTenantResponse,
)
def modifier_utilisateur_tenant(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    body: UtilisateurTenantUpdate,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> UtilisateurTenantResponse:
    return _service(db, user, request).modifier_utilisateur_tenant(
        tenant_id, user_id, body
    )


@router.delete(
    "/tenants/{tenant_id}/utilisateurs/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def supprimer_utilisateur_tenant(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> None:
    _service(db, user, request).supprimer_utilisateur(tenant_id, user_id)


@router.post(
    "/tenants/{tenant_id}/utilisateurs/{user_id}/reset-password",
    response_model=ResetPasswordResponse,
)
def reset_password_utilisateur_tenant(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: PlatformAdmin,
) -> ResetPasswordResponse:
    mot_de_passe = _service(db, user, request).reset_password_utilisateur(
        tenant_id, user_id
    )
    return ResetPasswordResponse(mot_de_passe_temporaire=mot_de_passe)
