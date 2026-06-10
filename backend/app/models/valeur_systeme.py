"""Valeurs prédéfinies système — globales à la plateforme."""

from typing import Any

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class ValeurSysteme(BaseModel):
    __tablename__ = "valeurs_systeme"

    categorie: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    valeur: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    ordre: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
