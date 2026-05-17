import structlog
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.middleware.metrics import PrometheusMiddleware
from app.utils.audit_listener import setup_audit_listeners

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_audit_listeners()
    yield


app = FastAPI(
    title="Mais que Pisos - Sistema de Pagamentos",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_exception_handler)

app.add_middleware(PrometheusMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import auth, instaladores, obras, servicos, atividades, adiantamentos, pagamentos, relatorios, audit_log, usuarios, dashboard  # noqa: E402
from app.routes.health import router as health_router  # noqa: E402

PREFIX = "/api/v1"
app.include_router(health_router)
app.include_router(auth.router, prefix=PREFIX)
app.include_router(instaladores.router, prefix=PREFIX)
app.include_router(obras.router, prefix=PREFIX)
app.include_router(servicos.router, prefix=PREFIX)
app.include_router(atividades.router, prefix=PREFIX)
app.include_router(adiantamentos.router, prefix=PREFIX)
app.include_router(pagamentos.router, prefix=PREFIX)
app.include_router(relatorios.router, prefix=PREFIX)
app.include_router(audit_log.router, prefix=PREFIX)
app.include_router(usuarios.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
