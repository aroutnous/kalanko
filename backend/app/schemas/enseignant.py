"""Schémas Pydantic — module Enseignants."""

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import StatutEnseignant


class EnseignantCreate(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    telephone: str | None = Field(default=None, max_length=20)
    adresse: str | None = Field(default=None, max_length=500)
    date_embauche: date | None = None
    salaire_base: Decimal = Field(default=Decimal("0.00"), ge=0)


class EnseignantUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=1, max_length=100)
    prenom: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    telephone: str | None = Field(default=None, max_length=20)
    adresse: str | None = Field(default=None, max_length=500)
    statut: StatutEnseignant | None = None
    date_embauche: date | None = None
    salaire_base: Decimal | None = Field(default=None, ge=0)


class EnseignantResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    nom: str
    prenom: str
    email: str
    telephone: str | None
    adresse: str | None
    statut: StatutEnseignant
    date_embauche: date | None
    salaire_base: Decimal
    matieres: list[str] = Field(default_factory=list)
    classes: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class EnseignantMatiereCreate(BaseModel):
    matiere_id: uuid.UUID
    classe_id: uuid.UUID | None = None


class EnseignantClasseCreate(BaseModel):
    classe_id: uuid.UUID
    annee_scolaire_id: uuid.UUID


class EnseignantMatiereResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    enseignant_id: uuid.UUID
    matiere_id: uuid.UUID
    classe_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class EnseignantClasseResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    enseignant_id: uuid.UUID
    classe_id: uuid.UUID
    annee_scolaire_id: uuid.UUID

    model_config = {"from_attributes": True}
