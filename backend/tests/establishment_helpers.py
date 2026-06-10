"""Helpers partagés pour créer une structure établissement en tests."""

from httpx import AsyncClient


async def create_test_structure(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    grade_nom: str = "6eme Annee",
    salle_nom: str = "6ème A",
    capacite: int = 40,
    matiere_nom: str | None = "Mathématiques",
) -> dict[str, str]:
    """Crée cycle → classe (niveau) → année → salle (+ matière optionnelle)."""
    cycle = await client.post(
        "/cycles",
        json={"nom": "Fondamental", "ordre": 1},
        headers=headers,
    )
    assert cycle.status_code == 201

    grade = await client.post(
        "/classes",
        json={"cycle_id": cycle.json()["id"], "nom": grade_nom, "ordre": 1},
        headers=headers,
    )
    assert grade.status_code == 201

    annee = await client.post(
        "/annees-scolaires",
        json={
            "libelle": "2025-2026",
            "date_debut": "2025-09-01",
            "date_fin": "2026-06-30",
            "est_active": True,
        },
        headers=headers,
    )
    assert annee.status_code == 201

    salle = await client.post(
        "/salles",
        json={
            "classe_id": grade.json()["id"],
            "annee_scolaire_id": annee.json()["id"],
            "nom_salle": salle_nom,
            "capacite": capacite,
        },
        headers=headers,
    )
    assert salle.status_code == 201

    result = {
        "cycle_id": cycle.json()["id"],
        "grade_classe_id": grade.json()["id"],
        "niveau_id": grade.json()["id"],
        "annee_id": annee.json()["id"],
        "salle_id": salle.json()["id"],
        "classe_id": salle.json()["id"],
    }

    if matiere_nom:
        matiere = await client.post(
            "/matieres",
            json={
                "classe_id": grade.json()["id"],
                "nom": matiere_nom,
                "coefficient": "2",
            },
            headers=headers,
        )
        assert matiere.status_code == 201
        result["matiere_id"] = matiere.json()["id"]

    return result
