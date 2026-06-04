"""Connexion SQLAlchemy, sessions et contexte tenant pour le RLS PostgreSQL."""

import uuid
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base déclarative pour tous les modèles SQLAlchemy."""


def set_tenant_context(db: Session, tenant_id: uuid.UUID) -> None:
    """
    Active l'isolation RLS PostgreSQL pour la session courante.

    Utilise set_config (équivalent sécurisé de SET) avec paramètre lié —
    jamais d'interpolation de chaîne dans le SQL.
    """
    db.execute(
        text("SELECT set_config('app.current_tenant', :tenant_id, true)"),
        {"tenant_id": str(tenant_id)},
    )


def get_db(request: Request) -> Generator[Session, None, None]:
    """
    Fournit une session DB par requête et applique le contexte tenant si présent.

    Le tenant_id est posé par TenantMiddleware dans request.state.
    """
    db = SessionLocal()
    try:
        tenant_id: uuid.UUID | None = getattr(request.state, "tenant_id", None)
        if tenant_id is not None:
            set_tenant_context(db, tenant_id)
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]
