"""Tests module Enseignants."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.auth import Utilisateur
from app.models.enums import RoleUtilisateur, StatutTenant, StatutUtilisateur
from app.models.tenant import Tenant
from tests.conftest import TEST_PASSWORD
from tests.permission_helpers import grant_role_permissions


async def _create_structure(
    client: AsyncClient,
    headers: dict[str, str],
) -> dict[str, str]:
    cycle = await client.post(
        "/cycles", json={"nom": "Fondamental", "ordre": 1}, headers=headers
    )
    niveau = await client.post(
        "/niveaux",
        json={"cycle_id": cycle.json()["id"], "nom": "6ème", "ordre": 1},
        headers=headers,
    )
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
    classe = await client.post(
        "/classes",
        json={
            "niveau_id": niveau.json()["id"],
            "annee_scolaire_id": annee.json()["id"],
            "nom": "6ème A",
            "capacite_max": 40,
        },
        headers=headers,
    )
    matiere = await client.post(
        "/matieres",
        json={
            "niveau_id": niveau.json()["id"],
            "nom": "Mathématiques",
            "coefficient": "2",
        },
        headers=headers,
    )
    return {
        "classe_id": classe.json()["id"],
        "matiere_id": matiere.json()["id"],
        "annee_id": annee.json()["id"],
    }


@pytest.mark.asyncio
async def test_creer_enseignant(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Diarra",
            "prenom": "Moussa",
            "email": f"moussa-{uuid.uuid4().hex[:8]}@ecole.ml",
            "telephone": "76000001",
            "salaire_base": "150000.00",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nom"] == "Diarra"
    assert data["prenom"] == "Moussa"
    assert data["statut"] == "actif"
    assert data["matieres"] == []
    assert data["classes"] == []


@pytest.mark.asyncio
async def test_modifier_enseignant(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    create = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Keita",
            "prenom": "Awa",
            "email": f"awa-{uuid.uuid4().hex[:8]}@ecole.ml",
        },
        headers=auth_headers,
    )
    enseignant_id = create.json()["id"]

    response = await async_client.put(
        f"/enseignants/{enseignant_id}",
        json={"nom": "Keita-Mod", "statut": "conge"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["nom"] == "Keita-Mod"
    assert response.json()["statut"] == "conge"


@pytest.mark.asyncio
async def test_supprimer_enseignant(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    create = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Traoré",
            "prenom": "Ibrahim",
            "email": f"ibrahim-{uuid.uuid4().hex[:8]}@ecole.ml",
        },
        headers=auth_headers,
    )
    enseignant_id = create.json()["id"]

    delete = await async_client.delete(
        f"/enseignants/{enseignant_id}",
        headers=auth_headers,
    )
    assert delete.status_code == 204

    get = await async_client.get(
        f"/enseignants/{enseignant_id}",
        headers=auth_headers,
    )
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_affecter_matiere(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    ctx = await _create_structure(async_client, auth_headers)
    create = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Coulibaly",
            "prenom": "Fatoumata",
            "email": f"fatou-{uuid.uuid4().hex[:8]}@ecole.ml",
        },
        headers=auth_headers,
    )
    enseignant_id = create.json()["id"]

    response = await async_client.post(
        f"/enseignants/{enseignant_id}/matieres",
        json={"matiere_id": ctx["matiere_id"], "classe_id": ctx["classe_id"]},
        headers=auth_headers,
    )
    assert response.status_code == 201

    detail = await async_client.get(
        f"/enseignants/{enseignant_id}",
        headers=auth_headers,
    )
    assert "Mathématiques" in detail.json()["matieres"]


@pytest.mark.asyncio
async def test_affecter_classe(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    ctx = await _create_structure(async_client, auth_headers)
    create = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Sangaré",
            "prenom": "Oumar",
            "email": f"oumar-{uuid.uuid4().hex[:8]}@ecole.ml",
        },
        headers=auth_headers,
    )
    enseignant_id = create.json()["id"]

    response = await async_client.post(
        f"/enseignants/{enseignant_id}/classes",
        json={
            "classe_id": ctx["classe_id"],
            "annee_scolaire_id": ctx["annee_id"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201

    detail = await async_client.get(
        f"/enseignants/{enseignant_id}",
        headers=auth_headers,
    )
    assert "6ème A" in detail.json()["classes"]


@pytest.mark.asyncio
async def test_get_par_classe(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    ctx = await _create_structure(async_client, auth_headers)
    create = await async_client.post(
        "/enseignants/",
        json={
            "nom": "Koné",
            "prenom": "Salimata",
            "email": f"salimata-{uuid.uuid4().hex[:8]}@ecole.ml",
        },
        headers=auth_headers,
    )
    enseignant_id = create.json()["id"]
    await async_client.post(
        f"/enseignants/{enseignant_id}/classes",
        json={
            "classe_id": ctx["classe_id"],
            "annee_scolaire_id": ctx["annee_id"],
        },
        headers=auth_headers,
    )

    response = await async_client.get(
        f"/enseignants/classe/{ctx['classe_id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    ids = [e["id"] for e in response.json()]
    assert enseignant_id in ids


@pytest.mark.asyncio
async def test_isolation_tenant_enseignants(
    async_client: AsyncClient,
    db_session,
    unique_ip_headers: dict[str, str],
) -> None:
    tenant_a = Tenant(
        nom="École A",
        slug=f"ecole-a-{uuid.uuid4().hex[:8]}",
        statut=StatutTenant.ACTIF,
    )
    tenant_b = Tenant(
        nom="École B",
        slug=f"ecole-b-{uuid.uuid4().hex[:8]}",
        statut=StatutTenant.ACTIF,
    )
    db_session.add_all([tenant_a, tenant_b])
    db_session.flush()

    user_a = Utilisateur(
        tenant_id=tenant_a.id,
        nom="User",
        prenom="A",
        email=f"user-a-{uuid.uuid4().hex[:8]}@test.ml",
        mot_de_passe_hash=hash_password(TEST_PASSWORD),
        role=RoleUtilisateur.DIRECTEUR,
        statut=StatutUtilisateur.ACTIF,
    )
    db_session.add(user_a)
    db_session.flush()
    grant_role_permissions(db_session, user_a)

    from app.models.enseignant import Enseignant

    enseignant_b = Enseignant(
        tenant_id=tenant_b.id,
        nom="Enseignant",
        prenom="B",
        email=f"ens-b-{uuid.uuid4().hex[:8]}@test.ml",
    )
    db_session.add(enseignant_b)
    db_session.flush()
    db_session.refresh(user_a)
    db_session.refresh(enseignant_b)

    login = await async_client.post(
        "/auth/login",
        json={
            "email": user_a.email,
            "password": TEST_PASSWORD,
            "tenant_slug": tenant_a.slug,
        },
        headers=unique_ip_headers,
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await async_client.get(
        f"/enseignants/{enseignant_b.id}",
        headers=headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_email_unique_par_tenant(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    db_session,
    unique_ip_headers: dict[str, str],
) -> None:
    email = f"dup-{uuid.uuid4().hex[:8]}@ecole.ml"
    first = await async_client.post(
        "/enseignants/",
        json={"nom": "A", "prenom": "Un", "email": email},
        headers=auth_headers,
    )
    assert first.status_code == 201

    second = await async_client.post(
        "/enseignants/",
        json={"nom": "B", "prenom": "Deux", "email": email},
        headers=auth_headers,
    )
    assert second.status_code == 409

    tenant_b = Tenant(
        nom="École B Email",
        slug=f"ecole-b-email-{uuid.uuid4().hex[:8]}",
        statut=StatutTenant.ACTIF,
    )
    db_session.add(tenant_b)
    db_session.flush()

    user_b = Utilisateur(
        tenant_id=tenant_b.id,
        nom="Promo",
        prenom="B",
        email=f"promo-{uuid.uuid4().hex[:8]}@test.ml",
        mot_de_passe_hash=hash_password(TEST_PASSWORD),
        role=RoleUtilisateur.PROMOTEUR,
        statut=StatutUtilisateur.ACTIF,
    )
    db_session.add(user_b)
    db_session.flush()

    login_b = await async_client.post(
        "/auth/login",
        json={
            "email": user_b.email,
            "password": TEST_PASSWORD,
            "tenant_slug": tenant_b.slug,
        },
        headers=unique_ip_headers,
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    other_tenant = await async_client.post(
        "/enseignants/",
        json={"nom": "C", "prenom": "Trois", "email": email},
        headers=headers_b,
    )
    assert other_tenant.status_code == 201
