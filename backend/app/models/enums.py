"""Énumérations métier alignées sur le schéma M1."""

import enum


class StatutTenant(str, enum.Enum):
    ACTIF = "actif"
    SUSPENDU = "suspendu"


class StatutUtilisateur(str, enum.Enum):
    ACTIF = "actif"
    INACTIF = "inactif"


class RoleUtilisateur(str, enum.Enum):
    PLATFORM_OWNER = "platform_owner"
    PROMOTEUR = "promoteur"
    DIRECTEUR = "directeur"
    SECRETAIRE = "secretaire"
    COMPTABLE = "comptable"
