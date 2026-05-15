from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.instalador import Instalador
from app.repositories.instalador import InstaladorRepository
from app.schemas.instalador import InstaladorCreate, InstaladorUpdate, InstaladorResponse
from app.utils.audit_listener import set_audit_user


class InstaladorService:
    def __init__(self, db: Session) -> None:
        self.repo = InstaladorRepository(db)

    def criar(self, data: InstaladorCreate, usuario_id: int) -> InstaladorResponse:
        if self.repo.get_by_cpf(data.cpf):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CPF já cadastrado")
        set_audit_user(usuario_id)
        instalador = Instalador(**data.model_dump())
        created = self.repo.create(instalador)
        return InstaladorResponse.model_validate(created)

    def listar(self, apenas_ativos: bool = True, skip: int = 0, limit: int = 100) -> list[InstaladorResponse]:
        items = self.repo.list_ativos(skip, limit) if apenas_ativos else self.repo.list_all(skip, limit)
        return [InstaladorResponse.model_validate(i) for i in items]

    def obter(self, id: int) -> InstaladorResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instalador não encontrado")
        return InstaladorResponse.model_validate(item)

    def atualizar(self, id: int, data: InstaladorUpdate, usuario_id: int) -> InstaladorResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instalador não encontrado")
        set_audit_user(usuario_id)
        updated = self.repo.update(item, data.model_dump(exclude_none=True))
        return InstaladorResponse.model_validate(updated)

    def desativar(self, id: int, usuario_id: int) -> InstaladorResponse:
        return self.atualizar(id, InstaladorUpdate(ativo=False), usuario_id)

    def deletar(self, id: int, usuario_id: int) -> None:
        from sqlalchemy import select, func
        from app.models.atividade import Atividade
        from app.models.adiantamento import Adiantamento
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instalador não encontrado")
        db = self.repo.db
        tem_atividades = db.execute(select(func.count()).where(Atividade.instalador_id == id).select_from(Atividade)).scalar() or 0
        tem_adiantamentos = db.execute(select(func.count()).where(Adiantamento.instalador_id == id).select_from(Adiantamento)).scalar() or 0
        if tem_atividades or tem_adiantamentos:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Não é possível excluir: instalador possui atividades ou adiantamentos vinculados.",
            )
        set_audit_user(usuario_id)
        self.repo.delete(item)
