import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = structlog.get_logger()


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    await logger.awarning(
        "http_exception",
        path=request.url.path,
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": exc.detail, "details": None},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"error": True, "message": "Dados inválidos", "details": details},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    await logger.aerror("unhandled_exception", path=request.url.path, exc=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "Erro interno do servidor", "details": None},
    )
