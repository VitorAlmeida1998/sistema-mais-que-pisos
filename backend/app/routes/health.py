import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Gauge, Info, generate_latest
from sqlalchemy.pool import QueuePool

from app.database import engine, ping_db

router = APIRouter(tags=["monitoring"])

_start_time = time.time()

try:
    _APP_INFO = Info("app", "Informações da aplicação")
    _APP_INFO.info({"version": "1.0.0", "name": "mais-que-pisos"})
except ValueError:
    pass  # já registrado em reload de desenvolvimento

try:
    _DB_POOL_SIZE = Gauge("db_pool_size", "Tamanho configurado do pool de conexões")
    _DB_POOL_CHECKED_OUT = Gauge("db_pool_checked_out", "Conexões ativas no pool")
    _DB_POOL_OVERFLOW = Gauge("db_pool_overflow", "Conexões em overflow no pool")
except ValueError:
    _DB_POOL_SIZE = _DB_POOL_CHECKED_OUT = _DB_POOL_OVERFLOW = None  # type: ignore[assignment]


def _pool_stats() -> dict:
    pool = engine.pool
    if isinstance(pool, QueuePool):
        stats = {
            "pool_size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
        }
        if _DB_POOL_SIZE is not None:
            _DB_POOL_SIZE.set(stats["pool_size"])
            _DB_POOL_CHECKED_OUT.set(stats["checked_out"])
            _DB_POOL_OVERFLOW.set(stats["overflow"])
        return stats
    return {}


@router.get("/health", summary="Status completo da aplicação")
def health_check() -> JSONResponse:
    db_ok = ping_db()
    body = {
        "status": "ok" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - _start_time, 2),
        "database": {"connected": db_ok, **_pool_stats()},
    }
    return JSONResponse(content=body, status_code=200 if db_ok else 503)


@router.get("/health/live", summary="Liveness probe — processo está vivo")
def liveness() -> dict:
    return {"alive": True}


@router.get("/health/ready", summary="Readiness probe — pronto para receber tráfego")
def readiness() -> JSONResponse:
    db_ok = ping_db()
    body = {
        "ready": db_ok,
        "checks": {"database": "ok" if db_ok else "fail"},
    }
    return JSONResponse(content=body, status_code=200 if db_ok else 503)


@router.get("/metrics", response_class=PlainTextResponse, summary="Métricas Prometheus")
def metrics() -> PlainTextResponse:
    _pool_stats()  # atualiza gauges antes de exportar
    return PlainTextResponse(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
