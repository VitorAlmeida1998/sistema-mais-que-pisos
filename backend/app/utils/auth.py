from datetime import datetime, timedelta
from typing import Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=settings.BCRYPT_ROUNDS)
bearer_scheme = HTTPBearer()


def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha: str, hash: str) -> bool:
    return pwd_context.verify(senha, hash)


def criar_token(data: dict[str, Any], tipo: str, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload.update({"exp": datetime.utcnow() + expires_delta, "type": tipo})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def criar_access_token(user_id: int, papel: str) -> str:
    return criar_token(
        {"sub": str(user_id), "papel": papel},
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def criar_refresh_token(user_id: int, papel: str) -> str:
    return criar_token(
        {"sub": str(user_id), "papel": papel},
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decodificar_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> "Usuario":  # type: ignore[name-defined]  # noqa: F821
    from app.models.usuario import Usuario

    payload = decodificar_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user_id = int(payload["sub"])
    user = db.get(Usuario, user_id)
    if not user or not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou não encontrado")
    return user


def require_papel(*papeis: str):  # type: ignore[no-untyped-def]
    from app.models.usuario import Usuario

    def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.papel not in papeis:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente")
        return current_user

    return checker
