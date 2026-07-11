"""Logique métier — gestion des enseignants."""

import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enseignant import Enseignant, EnseignantClasse, EnseignantMatiere
from app.models.enums import StatutEnseignant
from app.models.etablissement import AnneeScolaire, Matiere, Salle
from app.schemas.enseignant import (
    EnseignantClasseCreate,
    EnseignantCreate,
    EnseignantMatiereCreate,
    EnseignantResponse,
    EnseignantUpdate,
)
from app.services.audit_service import log_audit


class EnseignantService:
    """CRUD enseignants et affectations matières / classes."""

    def __init__(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        utilisateur_id: uuid.UUID,
        ip_address: str | None = None,
    ) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.utilisateur_id = utilisateur_id
        self.ip_address = ip_address

    def _audit(
        self,
        action: str,
        record_id: uuid.UUID | None,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        log_audit(
            self.db,
            action=action,
            resultat="success",
            tenant_id=self.tenant_id,
            utilisateur_id=self.utilisateur_id,
            ip_address=self.ip_address,
            table_cible="enseignants",
            enregistrement_id=record_id,
            details=details,
        )

    def _get_enseignant_or_404(self, enseignant_id: uuid.UUID) -> Enseignant:
        enseignant = (
            self.db.query(Enseignant)
            .filter(
                Enseignant.id == enseignant_id,
                Enseignant.tenant_id == self.tenant_id,
            )
            .first()
        )
        if enseignant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enseignant introuvable",
            )
        return enseignant

    def _assert_email_unique(
        self,
        email: str,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        query = self.db.query(Enseignant).filter(
            Enseignant.tenant_id == self.tenant_id,
            Enseignant.email == email.lower(),
        )
        if exclude_id is not None:
            query = query.filter(Enseignant.id != exclude_id)
        if query.first() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un enseignant avec cet email existe déjà",
            )

    def _matiere_names(self, enseignant_id: uuid.UUID) -> list[str]:
        rows = (
            self.db.query(Matiere.nom)
            .filter(
                Matiere.tenant_id == self.tenant_id,
                Matiere.enseignant_principal_id == enseignant_id,
            )
            .distinct()
            .order_by(Matiere.nom)
            .all()
        )
        return [row[0] for row in rows]

    def _classe_names(self, enseignant_id: uuid.UUID) -> list[str]:
        rows = (
            self.db.query(Salle.nom)
            .join(EnseignantClasse, EnseignantClasse.classe_id == Salle.id)
            .filter(
                EnseignantClasse.tenant_id == self.tenant_id,
                EnseignantClasse.enseignant_id == enseignant_id,
                Salle.tenant_id == self.tenant_id,
            )
            .distinct()
            .order_by(Salle.nom)
            .all()
        )
        return [row[0] for row in rows]

    def to_response(self, enseignant: Enseignant) -> EnseignantResponse:
        return EnseignantResponse(
            id=enseignant.id,
            tenant_id=enseignant.tenant_id,
            nom=enseignant.nom,
            prenom=enseignant.prenom,
            email=enseignant.email,
            telephone=enseignant.telephone,
            adresse=enseignant.adresse,
            statut=enseignant.statut,
            date_embauche=enseignant.date_embauche,
            salaire_base=enseignant.salaire_base,
            matieres=self._matiere_names(enseignant.id),
            classes=self._classe_names(enseignant.id),
        )

    def creer(self, data: EnseignantCreate) -> EnseignantResponse:
        self._assert_email_unique(data.email)
        enseignant = Enseignant(
            tenant_id=self.tenant_id,
            nom=data.nom.strip(),
            prenom=data.prenom.strip(),
            email=data.email.lower(),
            telephone=data.telephone,
            adresse=data.adresse,
            date_embauche=data.date_embauche,
            salaire_base=data.salaire_base,
            statut=StatutEnseignant.ACTIF,
        )
        self.db.add(enseignant)
        self.db.commit()
        self.db.refresh(enseignant)
        self._audit("enseignant.create", enseignant.id)
        return self.to_response(enseignant)

    def modifier(
        self,
        enseignant_id: uuid.UUID,
        data: EnseignantUpdate,
    ) -> EnseignantResponse:
        enseignant = self._get_enseignant_or_404(enseignant_id)
        updates = data.model_dump(exclude_unset=True)
        if "email" in updates and updates["email"] is not None:
            updates["email"] = str(updates["email"]).lower()
            self._assert_email_unique(updates["email"], exclude_id=enseignant_id)
        for field, value in updates.items():
            setattr(enseignant, field, value)
        self.db.commit()
        self.db.refresh(enseignant)
        self._audit("enseignant.update", enseignant.id, details=updates)
        return self.to_response(enseignant)

    def supprimer(self, enseignant_id: uuid.UUID) -> None:
        enseignant = self._get_enseignant_or_404(enseignant_id)
        record_id = enseignant.id
        self.db.delete(enseignant)
        self.db.commit()
        self._audit("enseignant.delete", record_id)

    def get_all(
        self,
        statut: StatutEnseignant | None = None,
    ) -> list[EnseignantResponse]:
        query = self.db.query(Enseignant).filter(
            Enseignant.tenant_id == self.tenant_id
        )
        if statut is not None:
            query = query.filter(Enseignant.statut == statut)
        enseignants = query.order_by(Enseignant.nom, Enseignant.prenom).all()
        return [self.to_response(e) for e in enseignants]

    def get_by_id(self, enseignant_id: uuid.UUID) -> EnseignantResponse:
        return self.to_response(self._get_enseignant_or_404(enseignant_id))

    def _get_matiere_or_404(self, matiere_id: uuid.UUID) -> Matiere:
        matiere = (
            self.db.query(Matiere)
            .filter(
                Matiere.id == matiere_id,
                Matiere.tenant_id == self.tenant_id,
            )
            .first()
        )
        if matiere is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Matière introuvable",
            )
        return matiere

    def _get_salle_or_404(self, classe_id: uuid.UUID) -> Salle:
        salle = (
            self.db.query(Salle)
            .filter(
                Salle.id == classe_id,
                Salle.tenant_id == self.tenant_id,
            )
            .first()
        )
        if salle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salle introuvable",
            )
        return salle

    def _get_annee_or_404(self, annee_id: uuid.UUID) -> AnneeScolaire:
        annee = (
            self.db.query(AnneeScolaire)
            .filter(
                AnneeScolaire.id == annee_id,
                AnneeScolaire.tenant_id == self.tenant_id,
            )
            .first()
        )
        if annee is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Année scolaire introuvable",
            )
        return annee

    def affecter_matiere(
        self,
        enseignant_id: uuid.UUID,
        data: EnseignantMatiereCreate,
    ) -> EnseignantMatiere:
        self._get_enseignant_or_404(enseignant_id)
        self._get_matiere_or_404(data.matiere_id)
        if data.classe_id is not None:
            self._get_salle_or_404(data.classe_id)

        existing = (
            self.db.query(EnseignantMatiere)
            .filter(
                EnseignantMatiere.tenant_id == self.tenant_id,
                EnseignantMatiere.enseignant_id == enseignant_id,
                EnseignantMatiere.matiere_id == data.matiere_id,
                EnseignantMatiere.classe_id == data.classe_id,
            )
            .first()
        )
        if existing is not None:
            return existing

        row = EnseignantMatiere(
            tenant_id=self.tenant_id,
            enseignant_id=enseignant_id,
            matiere_id=data.matiere_id,
            classe_id=data.classe_id,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def retirer_matiere(
        self,
        enseignant_id: uuid.UUID,
        matiere_id: uuid.UUID,
    ) -> None:
        self._get_enseignant_or_404(enseignant_id)
        (
            self.db.query(EnseignantMatiere)
            .filter(
                EnseignantMatiere.tenant_id == self.tenant_id,
                EnseignantMatiere.enseignant_id == enseignant_id,
                EnseignantMatiere.matiere_id == matiere_id,
            )
            .delete()
        )
        self.db.commit()

    def affecter_classe(
        self,
        enseignant_id: uuid.UUID,
        data: EnseignantClasseCreate,
    ) -> EnseignantClasse:
        self._get_enseignant_or_404(enseignant_id)
        self._get_salle_or_404(data.classe_id)
        self._get_annee_or_404(data.annee_scolaire_id)

        existing = (
            self.db.query(EnseignantClasse)
            .filter(
                EnseignantClasse.tenant_id == self.tenant_id,
                EnseignantClasse.enseignant_id == enseignant_id,
                EnseignantClasse.classe_id == data.classe_id,
                EnseignantClasse.annee_scolaire_id == data.annee_scolaire_id,
            )
            .first()
        )
        if existing is not None:
            return existing

        row = EnseignantClasse(
            tenant_id=self.tenant_id,
            enseignant_id=enseignant_id,
            classe_id=data.classe_id,
            annee_scolaire_id=data.annee_scolaire_id,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def retirer_classe(
        self,
        enseignant_id: uuid.UUID,
        classe_id: uuid.UUID,
    ) -> None:
        self._get_enseignant_or_404(enseignant_id)
        (
            self.db.query(EnseignantClasse)
            .filter(
                EnseignantClasse.tenant_id == self.tenant_id,
                EnseignantClasse.enseignant_id == enseignant_id,
                EnseignantClasse.classe_id == classe_id,
            )
            .delete()
        )
        self.db.commit()

    def get_matiere_ids(self, enseignant_id: uuid.UUID) -> list[uuid.UUID]:
        self._get_enseignant_or_404(enseignant_id)
        rows = (
            self.db.query(EnseignantMatiere.matiere_id)
            .filter(
                EnseignantMatiere.tenant_id == self.tenant_id,
                EnseignantMatiere.enseignant_id == enseignant_id,
            )
            .all()
        )
        return [row[0] for row in rows]

    def get_matieres(self, enseignant_id: uuid.UUID) -> list[Matiere]:
        self._get_enseignant_or_404(enseignant_id)
        return (
            self.db.query(Matiere)
            .join(EnseignantMatiere, EnseignantMatiere.matiere_id == Matiere.id)
            .filter(
                EnseignantMatiere.tenant_id == self.tenant_id,
                EnseignantMatiere.enseignant_id == enseignant_id,
                Matiere.tenant_id == self.tenant_id,
            )
            .order_by(Matiere.nom)
            .all()
        )

    def get_classes(self, enseignant_id: uuid.UUID) -> list[Salle]:
        self._get_enseignant_or_404(enseignant_id)
        return (
            self.db.query(Salle)
            .join(EnseignantClasse, EnseignantClasse.classe_id == Salle.id)
            .filter(
                EnseignantClasse.tenant_id == self.tenant_id,
                EnseignantClasse.enseignant_id == enseignant_id,
                Salle.tenant_id == self.tenant_id,
            )
            .order_by(Salle.nom)
            .all()
        )

    def get_par_classe(self, classe_id: uuid.UUID) -> list[EnseignantResponse]:
        self._get_salle_or_404(classe_id)
        enseignants = (
            self.db.query(Enseignant)
            .join(EnseignantClasse, EnseignantClasse.enseignant_id == Enseignant.id)
            .filter(
                EnseignantClasse.tenant_id == self.tenant_id,
                EnseignantClasse.classe_id == classe_id,
                Enseignant.tenant_id == self.tenant_id,
            )
            .order_by(Enseignant.nom, Enseignant.prenom)
            .all()
        )
        return [self.to_response(e) for e in enseignants]

    def get_par_matiere(self, matiere_id: uuid.UUID) -> list[EnseignantResponse]:
        self._get_matiere_or_404(matiere_id)
        enseignants = (
            self.db.query(Enseignant)
            .join(
                EnseignantMatiere,
                EnseignantMatiere.enseignant_id == Enseignant.id,
            )
            .filter(
                EnseignantMatiere.tenant_id == self.tenant_id,
                EnseignantMatiere.matiere_id == matiere_id,
                Enseignant.tenant_id == self.tenant_id,
            )
            .order_by(Enseignant.nom, Enseignant.prenom)
            .all()
        )
        return [self.to_response(e) for e in enseignants]
