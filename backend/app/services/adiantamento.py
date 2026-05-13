from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.adiantamento import Adiantamento
from app.repositories.adiantamento import AdiantamentoRepository
from app.repositories.instalador import InstaladorRepository
from app.schemas.adiantamento import AdiantamentoCreate, AdiantamentoResponse
from app.utils.audit_listener import set_audit_user


class AdiantamentoService:
    def __init__(self, db: Session) -> None:
        self.repo = AdiantamentoRepository(db)
        self.instalador_repo = InstaladorRepository(db)

    def criar(self, data: AdiantamentoCreate, usuario_id: int) -> AdiantamentoResponse:
        instalador = self.instalador_repo.get_by_id(data.instalador_id)
        if not instalador or not instalador.ativo:
            raise HTTPException(status_code=404, detail="Instalador não encontrado")
        set_audit_user(usuario_id)
        adiantamento = Adiantamento(**data.model_dump(), criado_por=usuario_id)
        created = self.repo.create(adiantamento)
        return self._enrich(created)

    def listar(self, instalador_id: int | None = None, skip: int = 0, limit: int = 100) -> list[AdiantamentoResponse]:
        if instalador_id:
            items = self.repo.list_by_instalador(instalador_id, skip, limit)
        else:
            items = self.repo.list_all_with_instalador(skip, limit)
        return [self._enrich(i) for i in items]

    def _enrich(self, a: Adiantamento) -> AdiantamentoResponse:
        r = AdiantamentoResponse.model_validate(a)
        if hasattr(a, "instalador") and a.instalador:
            r.instalador_nome = a.instalador.nome
        return r
