"""Service valeurs prédéfinies système (globales)."""

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.valeur_systeme import ValeurSysteme


class ValeurSystemeService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_dict(self, row: ValeurSysteme) -> dict[str, Any]:
        return {
            "id": str(row.id),
            "categorie": row.categorie,
            "valeur": row.valeur,
            "metadata_json": row.metadata_json or {},
            "ordre": row.ordre,
            "actif": row.actif,
        }

    def get_cycles(self) -> list[dict[str, Any]]:
        rows = (
            self.db.query(ValeurSysteme)
            .filter(
                ValeurSysteme.categorie == "cycle",
                ValeurSysteme.actif.is_(True),
            )
            .order_by(ValeurSysteme.ordre)
            .all()
        )
        return [self._to_dict(row) for row in rows]

    def get_classes_par_cycle(self, cycle: str) -> list[dict[str, Any]]:
        rows = (
            self.db.query(ValeurSysteme)
            .filter(
                ValeurSysteme.categorie == "classe_predefinie",
                ValeurSysteme.actif.is_(True),
            )
            .order_by(ValeurSysteme.ordre)
            .all()
        )
        return [
            self._to_dict(row)
            for row in rows
            if (row.metadata_json or {}).get("cycle") == cycle
        ]

    def get_periodes(self) -> list[dict[str, Any]]:
        rows = (
            self.db.query(ValeurSysteme)
            .filter(
                ValeurSysteme.categorie == "periode",
                ValeurSysteme.actif.is_(True),
            )
            .order_by(ValeurSysteme.ordre)
            .all()
        )
        return [self._to_dict(row) for row in rows]

    def get_annees_scolaires(self) -> list[dict[str, Any]]:
        rows = (
            self.db.query(ValeurSysteme)
            .filter(
                ValeurSysteme.categorie == "annee_scolaire",
                ValeurSysteme.actif.is_(True),
            )
            .order_by(ValeurSysteme.ordre)
            .all()
        )
        return [self._to_dict(row) for row in rows]

    def list_by_categorie(self, categorie: str | None = None) -> list[ValeurSysteme]:
        query = self.db.query(ValeurSysteme)
        if categorie:
            query = query.filter(ValeurSysteme.categorie == categorie)
        return query.order_by(ValeurSysteme.categorie, ValeurSysteme.ordre).all()

    def creer_annee_scolaire(self, valeur: str) -> ValeurSysteme:
        existing = (
            self.db.query(ValeurSysteme)
            .filter(
                ValeurSysteme.categorie == "annee_scolaire",
                ValeurSysteme.valeur == valeur,
            )
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette année scolaire existe déjà",
            )
        max_ordre = (
            self.db.query(ValeurSysteme.ordre)
            .filter(ValeurSysteme.categorie == "annee_scolaire")
            .order_by(ValeurSysteme.ordre.desc())
            .first()
        )
        row = ValeurSysteme(
            categorie="annee_scolaire",
            valeur=valeur,
            metadata_json={},
            ordre=(max_ordre[0] if max_ordre else 0) + 1,
            actif=True,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def creer_valeur(
        self,
        categorie: str,
        valeur: str,
        metadata_json: dict[str, Any] | None,
        ordre: int,
    ) -> ValeurSysteme:
        row = ValeurSysteme(
            categorie=categorie,
            valeur=valeur,
            metadata_json=metadata_json or {},
            ordre=ordre,
            actif=True,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update_valeur(
        self,
        valeur_id: uuid.UUID,
        valeur: str | None,
        metadata_json: dict[str, Any] | None,
        ordre: int | None,
        actif: bool | None,
    ) -> ValeurSysteme:
        row = self._get_valeur(valeur_id)
        if valeur is not None:
            row.valeur = valeur
        if metadata_json is not None:
            row.metadata_json = metadata_json
        if ordre is not None:
            row.ordre = ordre
        if actif is not None:
            row.actif = actif
        self.db.commit()
        self.db.refresh(row)
        return row

    def desactiver_valeur(self, valeur_id: uuid.UUID) -> ValeurSysteme:
        row = self._get_valeur(valeur_id)
        row.actif = False
        self.db.commit()
        self.db.refresh(row)
        return row

    def _get_valeur(self, valeur_id: uuid.UUID) -> ValeurSysteme:
        row = self.db.query(ValeurSysteme).filter(ValeurSysteme.id == valeur_id).first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Valeur système introuvable",
            )
        return row
