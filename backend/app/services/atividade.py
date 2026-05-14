from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.atividade import Atividade, StatusAtividade
from app.repositories.atividade import AtividadeRepository
from app.repositories.instalador import InstaladorRepository
from app.repositories.obra import ObraRepository
from app.repositories.servico import ServicoRepository
from app.schemas.atividade import AtividadeCreate, AtividadeUpdate, AtividadeResponse
from app.utils.audit_listener import set_audit_user
from datetime import date


class AtividadeService:
    def __init__(self, db: Session) -> None:
        self.repo = AtividadeRepository(db)
        self.instalador_repo = InstaladorRepository(db)
        self.obra_repo = ObraRepository(db)
        self.servico_repo = ServicoRepository(db)

    def criar(self, data: AtividadeCreate, usuario_id: int) -> AtividadeResponse:
        instalador = self.instalador_repo.get_by_id(data.instalador_id)
        if not instalador or not instalador.ativo:
            raise HTTPException(status_code=404, detail="Instalador não encontrado")
        obra = self.obra_repo.get_by_id(data.obra_id)
        if not obra or not obra.ativo:
            raise HTTPException(status_code=404, detail="Obra não encontrada")
        servico = self.servico_repo.get_by_id(data.servico_id)
        if not servico or not servico.ativo:
            raise HTTPException(status_code=404, detail="Serviço não encontrado")

        valor_calculado = Decimal(str(servico.valor_unitario)) * Decimal(str(data.quantidade))

        set_audit_user(usuario_id)
        atividade = Atividade(
            instalador_id=data.instalador_id,
            obra_id=data.obra_id,
            servico_id=data.servico_id,
            quantidade=data.quantidade,
            data_execucao=data.data_execucao,
            valor_calculado=valor_calculado,
            observacao=data.observacao,
        )
        created = self.repo.create(atividade)
        return self._enrich(created)

    def listar(
        self,
        instalador_id: int | None = None,
        obra_id: int | None = None,
        status: StatusAtividade | None = None,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AtividadeResponse]:
        items = self.repo.list_with_filters(instalador_id, obra_id, status, data_inicio, data_fim, skip, limit)
        return [self._enrich(i) for i in items]

    def obter(self, id: int) -> AtividadeResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="Atividade não encontrada")
        return self._enrich(item)

    def atualizar(self, id: int, data: AtividadeUpdate, usuario_id: int) -> AtividadeResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="Atividade não encontrada")
        if item.status != StatusAtividade.pendente:
            raise HTTPException(status_code=400, detail="Apenas atividades pendentes podem ser editadas")
        set_audit_user(usuario_id)
        updates = data.model_dump(exclude_none=True)
        if "quantidade" in updates:
            servico = self.servico_repo.get_by_id(item.servico_id)
            if servico:
                updates["valor_calculado"] = Decimal(str(servico.valor_unitario)) * Decimal(str(updates["quantidade"]))
        updated = self.repo.update(item, updates)
        return self._enrich(updated)

    def deletar(self, id: int, usuario_id: int, is_admin: bool) -> None:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="Atividade não encontrada")
        if not is_admin and item.status != StatusAtividade.pendente:
            raise HTTPException(status_code=400, detail="Apenas atividades pendentes podem ser excluídas")
        set_audit_user(usuario_id)
        self.repo.delete(item)

    def aprovar(self, id: int, aprovador_id: int) -> AtividadeResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="Atividade não encontrada")
        if item.status != StatusAtividade.pendente:
            raise HTTPException(status_code=400, detail="Apenas atividades pendentes podem ser aprovadas")
        set_audit_user(aprovador_id)
        updated = self.repo.update(item, {"status": StatusAtividade.aprovada, "aprovador_id": aprovador_id})
        return self._enrich(updated)

    def _enrich(self, a: Atividade) -> AtividadeResponse:
        r = AtividadeResponse.model_validate(a)
        if hasattr(a, "instalador") and a.instalador:
            r.instalador_nome = a.instalador.nome
        if hasattr(a, "obra") and a.obra:
            r.obra_cliente = a.obra.cliente_nome
            r.obra_numero_pedido = a.obra.numero_pedido
        if hasattr(a, "servico") and a.servico:
            r.servico_descricao = a.servico.descricao
            r.servico_unidade = a.servico.unidade
        return r
