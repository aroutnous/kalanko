"""Point d'entrée FastAPI — KALANKO API."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.middleware.audit import AuditMiddleware
from app.middleware.tenant import TenantMiddleware
from app.routers.auth import limiter, router as auth_router
from app.routers.eleve import router as eleve_router
from app.routers.enseignant import router as enseignant_router
from app.routers.etablissement import router as etablissement_router
from app.routers.finance import router as finance_router
from app.routers.pedagogie import router as pedagogie_router
from app.routers.platform import router as platform_router
from app.routers.reporting import router as reporting_router

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Kalanko API",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# Rate limiting Redis (slowapi / limits)
limiter.storage_uri = settings.redis_url
app.state.limiter = limiter


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Message générique — ne pas exposer la configuration du rate limit."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
        },
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)
app.add_middleware(TenantMiddleware)

app.include_router(auth_router)
app.include_router(etablissement_router)
app.include_router(eleve_router)
app.include_router(enseignant_router)
app.include_router(pedagogie_router)
app.include_router(finance_router)
app.include_router(reporting_router)
app.include_router(platform_router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Sonde de disponibilité (sans authentification)."""
    return {"status": "ok", "environment": settings.environment}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Réponses HTTP standardisées sans fuite d'information."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors() if settings.debug else "Données invalides"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Gestionnaire global : jamais de stack trace exposée en production.

    Les détails complets restent dans les logs serveur uniquement.
    """
    logger.exception("Erreur non gérée sur %s %s", request.method, request.url.path)
    content: dict[str, Any] = {"detail": "Erreur interne du serveur"}
    if settings.debug:
        content["debug_message"] = str(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )
