"""
Configuração de testes: SQLite in-memory por teste (isolamento total).
JSONB é substituído por JSON para compatibilidade com SQLite.
"""
import pytest
from decimal import Decimal
from datetime import date

from sqlalchemy import create_engine, JSON, event as sa_event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Patch JSONB → JSON antes de importar modelos
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class JSONBCompat(TypeDecorator):
    """Substitui JSONB por JSON simples para SQLite."""
    impl = JSON
    cache_ok = True


# Monkey-patch: faz JSONB se comportar como JSON no SQLite
import sqlalchemy.dialects.postgresql as pg_dialect
pg_dialect.JSONB = JSONBCompat  # type: ignore[attr-defined]

# Só importar modelos APÓS o patch
from app.models.base import Base
from app.models.usuario import Usuario, PapelUsuario
from app.models.instalador import Instalador
from app.models.obra import Obra, StatusObra
from app.models.servico import Servico, UnidadeServico
from app.utils.auth import hash_senha
from app.utils.audit_listener import setup_audit_listeners

setup_audit_listeners()


def make_test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @sa_event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _rec):  # type: ignore[misc]
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db():
    """Banco in-memory isolado por teste — nunca vaza dados entre testes."""
    engine = make_test_engine()
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db: Session):
    from app.main import app
    from app.database import get_db

    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db: Session) -> Usuario:
    user = Usuario(
        nome="Admin Teste",
        email="admin@test.com",
        senha_hash=hash_senha("senha123"),
        papel=PapelUsuario.admin,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def gestor_user(db: Session) -> Usuario:
    user = Usuario(
        nome="Gestor Teste",
        email="gestor@test.com",
        senha_hash=hash_senha("senha123"),
        papel=PapelUsuario.gestor,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def instalador(db: Session) -> Instalador:
    inst = Instalador(
        nome="Instalador Teste",
        cpf="52998224725",
        telefone="11999990000",
        chave_pix="inst@pix.com",
    )
    db.add(inst)
    db.flush()
    return inst


@pytest.fixture
def obra(db: Session) -> Obra:
    o = Obra(
        cliente_nome="Cliente Teste",
        endereco="Rua Teste, 1",
        data_inicio=date(2025, 1, 1),
        status=StatusObra.em_andamento,
    )
    db.add(o)
    db.flush()
    return o


@pytest.fixture
def servico(db: Session) -> Servico:
    s = Servico(
        descricao="Instalação Laminado",
        unidade=UnidadeServico.m2,
        valor_unitario=Decimal("35.00"),
    )
    db.add(s)
    db.flush()
    return s


def get_auth_header(client: TestClient, email: str, senha: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert resp.status_code == 200, f"Login falhou: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
