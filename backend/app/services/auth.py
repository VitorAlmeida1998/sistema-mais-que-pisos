from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.repositories.usuario import UsuarioRepository
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.utils.auth import (
    verificar_senha, criar_access_token, criar_refresh_token, decodificar_token
)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repo = UsuarioRepository(db)

    def login(self, data: LoginRequest) -> TokenResponse:
        user = self.repo.get_by_email(data.email)
        if not user or not verificar_senha(data.senha, user.senha_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
            )
        if not user.ativo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
        return TokenResponse(
            access_token=criar_access_token(user.id, user.papel),
            refresh_token=criar_refresh_token(user.id, user.papel),
        )

    def refresh(self, data: RefreshRequest) -> TokenResponse:
        payload = decodificar_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        user_id = int(payload["sub"])
        user = self.repo.get_by_id(user_id)
        if not user or not user.ativo:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        return TokenResponse(
            access_token=criar_access_token(user.id, user.papel),
            refresh_token=criar_refresh_token(user.id, user.papel),
        )
