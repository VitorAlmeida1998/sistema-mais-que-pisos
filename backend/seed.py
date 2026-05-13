"""
Seed script: cria usuário admin inicial e serviços de exemplo.
Executar: python seed.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from decimal import Decimal
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://mqp_user:mqp_pass@localhost:5432/mqp_db")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()


def seed() -> None:
    from app.models.usuario import Usuario, PapelUsuario
    from app.models.servico import Servico, UnidadeServico
    from app.models.instalador import Instalador
    from app.models.obra import Obra, StatusObra
    from app.utils.auth import hash_senha

    # Admin
    from sqlalchemy import select
    admin = db.execute(select(Usuario).where(Usuario.email == "admin@maisquepisos.com.br")).scalar_one_or_none()
    if not admin:
        admin = Usuario(
            nome="Administrador",
            email="admin@maisquepisos.com.br",
            senha_hash=hash_senha("Admin@1234"),
            papel=PapelUsuario.admin,
        )
        db.add(admin)
        db.flush()
        print("Admin criado: admin@maisquepisos.com.br / Admin@1234")
    else:
        print("Admin já existe")

    # Serviços de exemplo
    servicos_data = [
        ("Instalação de Laminado", UnidadeServico.m2, Decimal("35.00")),
        ("Instalação de Vinílico", UnidadeServico.m2, Decimal("40.00")),
        ("Rodapé", UnidadeServico.metro_linear, Decimal("8.00")),
        ("Manta Acústica", UnidadeServico.m2, Decimal("12.00")),
        ("Diária", UnidadeServico.diaria, Decimal("250.00")),
        ("Instalação de Porcelanato", UnidadeServico.m2, Decimal("55.00")),
        ("Rejunte", UnidadeServico.m2, Decimal("10.00")),
    ]

    for descricao, unidade, valor in servicos_data:
        existing = db.execute(select(Servico).where(Servico.descricao == descricao)).scalar_one_or_none()
        if not existing:
            db.add(Servico(descricao=descricao, unidade=unidade, valor_unitario=valor))
            print(f"Serviço criado: {descricao}")

    # Instalador de exemplo
    inst = db.execute(select(Instalador).where(Instalador.cpf == "52998224725")).scalar_one_or_none()
    if not inst:
        db.add(Instalador(
            nome="João Silva (Exemplo)",
            cpf="52998224725",
            telefone="(11) 99999-0000",
            chave_pix="joao@exemplo.com",
            eh_mei=False,
        ))
        print("Instalador de exemplo criado")

    # Obra de exemplo
    obra = db.execute(select(Obra).where(Obra.cliente_nome == "Cliente Exemplo")).scalar_one_or_none()
    if not obra:
        db.add(Obra(
            cliente_nome="Cliente Exemplo",
            endereco="Rua das Flores, 123 - São Paulo/SP",
            data_inicio=date.today(),
            status=StatusObra.em_andamento,
        ))
        print("Obra de exemplo criada")

    db.commit()
    print("\nSeed concluído com sucesso!")


if __name__ == "__main__":
    seed()
