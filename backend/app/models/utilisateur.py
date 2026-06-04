"""Modèle Utilisateur — comptes par tenant."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import RoleUtilisateur, StatutUtilisateur


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mot_de_passe_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleUtilisateur] = mapped_column(
        Enum(
            RoleUtilisateur,
            name="role_utilisateur",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    statut: Mapped[StatutUtilisateur] = mapped_column(
        Enum(
            StatutUtilisateur,
            name="statut_utilisateur",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=StatutUtilisateur.ACTIF,
    )
    derniere_connexion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="utilisateurs")  # noqa: F821
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="utilisateur"
    )
