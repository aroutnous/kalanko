"""Modèle Tenant — racine multi-tenant."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import StatutTenant


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(512), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    statut: Mapped[StatutTenant] = mapped_column(
        Enum(StatutTenant, name="statut_tenant", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=StatutTenant.ACTIF,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    utilisateurs: Mapped[list["Utilisateur"]] = relationship(  # noqa: F821
        "Utilisateur", back_populates="tenant"
    )
