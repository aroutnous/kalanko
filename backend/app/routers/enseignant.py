"""Routes — gestion des enseignants."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.database import DbSession
from app.core.security import require_permission
from app.models.auth import Utilisateur
from app.models.enums import Permission, StatutEnseignant
from app.schemas.enseignant import (
    EnseignantClasseCreate,
    EnseignantClasseResponse,
    EnseignantCreate,
    EnseignantMatiereCreate,
    EnseignantMatiereResponse,
    EnseignantResponse,
    EnseignantUpdate,
)
from app.services.enseignant_service import EnseignantService

router = APIRouter(prefix="/enseignants", tags=["enseignants"])

EnseignantReader = Annotated[
    Utilisateur,
    Depends(require_permission(Permission.ENSEIGNANTS_CONSULTER.value)),
]
EnseignantManager = Annotated[
    Utilisateur,
    Depends(require_permission(Permission.ENSEIGNANTS_GERER.value)),
]


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _service(db: DbSession, user: Utilisateur, request: Request) -> EnseignantService:
    return EnseignantService(
        db=db,
        tenant_id=user.tenant_id,
        utilisateur_id=user.id,
        ip_address=_client_ip(request),
    )


@router.get("/classe/{classe_id}", response_model=list[EnseignantResponse])
def list_enseignants_par_classe(
    classe_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantReader,
) -> list[EnseignantResponse]:
    return _service(db, user, request).get_par_classe(classe_id)


@router.get("/matiere/{matiere_id}", response_model=list[EnseignantResponse])
def list_enseignants_par_matiere(
    matiere_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantReader,
) -> list[EnseignantResponse]:
    return _service(db, user, request).get_par_matiere(matiere_id)


@router.get("/", response_model=list[EnseignantResponse])
def list_enseignants(
    request: Request,
    db: DbSession,
    user: EnseignantReader,
    statut: StatutEnseignant | None = Query(default=None),
) -> list[EnseignantResponse]:
    return _service(db, user, request).get_all(statut)


@router.post(
    "/",
    response_model=EnseignantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_enseignant(
    body: EnseignantCreate,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> EnseignantResponse:
    return _service(db, user, request).creer(body)


@router.get("/{enseignant_id}", response_model=EnseignantResponse)
def get_enseignant(
    enseignant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantReader,
) -> EnseignantResponse:
    return _service(db, user, request).get_by_id(enseignant_id)


@router.put("/{enseignant_id}", response_model=EnseignantResponse)
def update_enseignant(
    enseignant_id: uuid.UUID,
    body: EnseignantUpdate,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> EnseignantResponse:
    return _service(db, user, request).modifier(enseignant_id, body)


@router.delete("/{enseignant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enseignant(
    enseignant_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> None:
    _service(db, user, request).supprimer(enseignant_id)


@router.post(
    "/{enseignant_id}/matieres",
    response_model=EnseignantMatiereResponse,
    status_code=status.HTTP_201_CREATED,
)
def affecter_matiere(
    enseignant_id: uuid.UUID,
    body: EnseignantMatiereCreate,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> EnseignantMatiereResponse:
    row = _service(db, user, request).affecter_matiere(enseignant_id, body)
    return EnseignantMatiereResponse.model_validate(row)


@router.delete(
    "/{enseignant_id}/matieres/{matiere_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def retirer_matiere(
    enseignant_id: uuid.UUID,
    matiere_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> None:
    _service(db, user, request).retirer_matiere(enseignant_id, matiere_id)


@router.post(
    "/{enseignant_id}/classes",
    response_model=EnseignantClasseResponse,
    status_code=status.HTTP_201_CREATED,
)
def affecter_classe(
    enseignant_id: uuid.UUID,
    body: EnseignantClasseCreate,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> EnseignantClasseResponse:
    row = _service(db, user, request).affecter_classe(enseignant_id, body)
    return EnseignantClasseResponse.model_validate(row)


@router.delete(
    "/{enseignant_id}/classes/{classe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def retirer_classe(
    enseignant_id: uuid.UUID,
    classe_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: EnseignantManager,
) -> None:
    _service(db, user, request).retirer_classe(enseignant_id, classe_id)
